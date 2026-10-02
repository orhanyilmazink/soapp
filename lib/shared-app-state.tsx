'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { categories, type CategoryId } from '@/lib/bucket-list'

export type SharedCustomItem = { id: string; category: CategoryId; text: string }
export type SharedCalendarEvent = {
  id: string
  title: string
  date: string
  kind: 'birthday' | 'special'
  repeats: boolean
}
export type SharedAppData = {
  version: 1
  done: string[]
  custom: SharedCustomItem[]
  calendarEvents: SharedCalendarEvent[]
  meetupDate: string
  meetupTime: string
  relationshipMilestones: string[]
}

type SyncStatus = 'local' | 'connecting' | 'saving' | 'connected' | 'offline'
type SharedAppStateContextValue = {
  state: SharedAppData
  updateSharedState: (patch: Partial<SharedAppData>) => void
  syncStatus: SyncStatus
}

const localStateKey = 'shared-app-state-v1'
const syncedStateKey = 'shared-app-state-synced-v1'
const sharedRowId = 'shared'
const emptyState: SharedAppData = {
  version: 1,
  done: [],
  custom: [],
  calendarEvents: [],
  meetupDate: '',
  meetupTime: '',
  relationshipMilestones: [],
}
const validMilestones = ['isteme', 'soz', 'nisan', 'kina', 'evlilik']

const SharedAppStateContext = createContext<SharedAppStateContextValue | null>(null)

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

function normalizeAppData(value: unknown, fallback: SharedAppData = emptyState): SharedAppData {
  if (!value || typeof value !== 'object') return fallback
  const input = value as Partial<SharedAppData>
  const validCategoryIds = new Set(categories.map((category) => category.id))

  return {
    version: 1,
    done: Array.isArray(input.done)
      ? input.done.filter((item): item is string => typeof item === 'string')
      : fallback.done,
    custom: Array.isArray(input.custom)
      ? input.custom.filter(
          (item): item is SharedCustomItem =>
            !!item &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            validCategoryIds.has(item.category) &&
            typeof item.text === 'string'
        )
      : fallback.custom,
    calendarEvents: Array.isArray(input.calendarEvents)
      ? input.calendarEvents.filter(
          (event): event is SharedCalendarEvent =>
            !!event &&
            typeof event === 'object' &&
            typeof event.id === 'string' &&
            typeof event.title === 'string' &&
            typeof event.date === 'string' &&
            (event.kind === 'birthday' || event.kind === 'special') &&
            typeof event.repeats === 'boolean'
        )
      : fallback.calendarEvents,
    meetupDate: typeof input.meetupDate === 'string' ? input.meetupDate : fallback.meetupDate,
    meetupTime: typeof input.meetupTime === 'string' ? input.meetupTime : fallback.meetupTime,
    relationshipMilestones: Array.isArray(input.relationshipMilestones)
      ? input.relationshipMilestones.filter(
          (item): item is string => typeof item === 'string' && validMilestones.includes(item)
        )
      : fallback.relationshipMilestones,
  }
}

function loadLocalAppData(): SharedAppData {
  const saved = readJson<unknown>(localStateKey, null)
  if (saved && typeof saved === 'object' && (saved as { version?: number }).version === 1) {
    return normalizeAppData(saved)
  }

  const oldBucketList = readJson<{ done?: unknown; custom?: unknown }>('bucket-list-v1', {})
  const oldEvents = readJson<unknown>('relationship-calendar-events', [])
  const oldMeetup = readJson<{ date?: unknown; time?: unknown }>('birthday-next-meetup', {})
  const oldMilestones = readJson<unknown>('relationship-life-milestones', [])
  const oldData = normalizeAppData(saved)

  return normalizeAppData(
    {
      ...oldData,
      done: Array.isArray(oldBucketList.done) ? oldBucketList.done : oldData.done,
      custom: Array.isArray(oldBucketList.custom) ? oldBucketList.custom : oldData.custom,
      calendarEvents: Array.isArray(oldEvents) ? oldEvents : oldData.calendarEvents,
      meetupDate: typeof oldMeetup.date === 'string' ? oldMeetup.date : oldData.meetupDate,
      meetupTime: typeof oldMeetup.time === 'string' ? oldMeetup.time : oldData.meetupTime,
      relationshipMilestones: Array.isArray(oldMilestones) ? oldMilestones : oldData.relationshipMilestones,
    },
    oldData
  )
}

function mergeLegacyRemote(remoteValue: unknown, local: SharedAppData, mergeLocal: boolean): SharedAppData {
  if (
    remoteValue &&
    typeof remoteValue === 'object' &&
    (remoteValue as { version?: number }).version === 1 &&
    !mergeLocal
  ) {
    return normalizeAppData(remoteValue)
  }

  const remote = normalizeAppData(remoteValue)
  const custom = new Map(local.custom.map((item) => [item.id, item]))
  for (const item of remote.custom) custom.set(item.id, item)
  const calendarEvents = new Map(local.calendarEvents.map((event) => [event.id, event]))
  for (const event of remote.calendarEvents) calendarEvents.set(event.id, event)

  return {
    version: 1,
    done: [...new Set([...local.done, ...remote.done])],
    custom: [...custom.values()],
    calendarEvents: [...calendarEvents.values()],
    meetupDate: remote.meetupDate || local.meetupDate,
    meetupTime: remote.meetupTime || local.meetupTime,
    relationshipMilestones: local.relationshipMilestones.length > remote.relationshipMilestones.length
      ? local.relationshipMilestones
      : remote.relationshipMilestones,
  }
}

function writeLocalAppData(data: SharedAppData) {
  try {
    localStorage.setItem(localStateKey, JSON.stringify(data))
  } catch {
    // Keep in-memory changes if browser storage is unavailable.
  }
}

export function SharedAppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SharedAppData>(emptyState)
  const [localReady, setLocalReady] = useState(false)
  const [cloudReady, setCloudReady] = useState(!supabase)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(supabase ? 'connecting' : 'local')
  const [syncError, setSyncError] = useState('')
  const stateRef = useRef<SharedAppData>(emptyState)
  const mergeLocalOnFirstSync = useRef(true)
  const writeQueue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    const local = loadLocalAppData()
    mergeLocalOnFirstSync.current = !readJson<boolean>(syncedStateKey, false)
    stateRef.current = local
    setState(local)
    setLocalReady(true)
    writeLocalAppData(local)
  }, [])

  useEffect(() => {
    if (!supabase || !localReady) return
    const client = supabase
    let active = true
    let channel: ReturnType<typeof client.channel> | null = null
    setSyncStatus('connecting')
    setCloudReady(false)
    setSyncError('')

    const connect = async () => {
      try {
        const { data, error } = await client
          .from('bucket_lists')
          .select('state')
          .eq('id', sharedRowId)
          .maybeSingle()
        if (error) throw error

        const next = data?.state
          ? mergeLegacyRemote(data.state, stateRef.current, mergeLocalOnFirstSync.current)
          : stateRef.current
        stateRef.current = next
        setState(next)
        writeLocalAppData(next)

        if (!data?.state || JSON.stringify(data.state) !== JSON.stringify(next)) {
          const { error: writeError } = await client
            .from('bucket_lists')
            .upsert(
              { id: sharedRowId, state: next, updated_at: new Date().toISOString() },
              { onConflict: 'id' }
            )
          if (writeError) throw writeError
        }

        mergeLocalOnFirstSync.current = false
        try {
          localStorage.setItem(syncedStateKey, 'true')
        } catch {
          // Keep sync usable if browser storage is unavailable.
        }

        if (!active) return
        channel = client
          .channel('shared-app-state')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'bucket_lists', filter: `id=eq.${sharedRowId}` },
            (payload) => {
              const newRow = payload.new as { state?: unknown } | undefined
              if (!active || !newRow?.state) return
              const incoming = normalizeAppData(newRow.state, stateRef.current)
              stateRef.current = incoming
              setState(incoming)
              writeLocalAppData(incoming)
            }
          )
          .subscribe((status) => {
            if (!active) return
            if (status === 'SUBSCRIBED') setSyncStatus('connected')
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              setSyncStatus('offline')
              setSyncError('Canlı eşitleme bağlantısı kurulamadı.')
            }
          })
        setCloudReady(true)
      } catch (error) {
        if (!active) return
        setSyncStatus('offline')
        setSyncError(error instanceof Error ? error.message : 'Eşitleme bağlantısı kurulamadı.')
        setCloudReady(true)
      }
    }

    void connect()
    return () => {
      active = false
      if (channel) void client.removeChannel(channel)
    }
  }, [localReady])

  function updateSharedState(patch: Partial<SharedAppData>) {
    const next = normalizeAppData({ ...stateRef.current, ...patch })
    stateRef.current = next
    setState(next)
    writeLocalAppData(next)

    const client = supabase
    if (!client) return

    setSyncStatus('saving')
    writeQueue.current = writeQueue.current
      .then(async () => {
        const { error } = await client
          .from('bucket_lists')
          .upsert(
            { id: sharedRowId, state: next, updated_at: new Date().toISOString() },
            { onConflict: 'id' }
          )
        if (error) throw error
        setSyncStatus('connected')
        setSyncError('')
      })
      .catch((error: unknown) => {
        setSyncStatus('offline')
        setSyncError(error instanceof Error ? error.message : 'Değişiklik eşitlenemedi.')
      })
  }

  if (!localReady || (supabase && !cloudReady)) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5 text-sm font-semibold text-zinc-500" aria-live="polite">
        Eşitleme hazırlanıyor…
      </main>
    )
  }

  const contextValue: SharedAppStateContextValue = { state, updateSharedState, syncStatus }
  return (
    <SharedAppStateContext.Provider value={contextValue}>
      {syncStatus === 'offline' && syncError && (
        <p role="status" className="fixed left-1/2 top-2 z-[60] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-center text-[11px] font-semibold text-zinc-600 shadow-sm">
          Eşitleme bekliyor: {syncError}
        </p>
      )}
      {children}
    </SharedAppStateContext.Provider>
  )
}

export function useSharedAppState() {
  const value = useContext(SharedAppStateContext)
  if (!value) throw new Error('useSharedAppState must be used within SharedAppStateProvider')
  return value
}

export function useSharedBucketList() {
  const { state, updateSharedState } = useSharedAppState()
  const done = new Set(state.done)

  return {
    done,
    custom: state.custom,
    toggle: (id: string) => {
      const next = done.has(id) ? state.done.filter((item) => item !== id) : [...state.done, id]
      updateSharedState({ done: next })
    },
    add: (category: CategoryId, text: string) => {
      const trimmed = text.trim().slice(0, 80)
      if (!trimmed) return
      updateSharedState({
        custom: [...state.custom, { id: `custom-${Date.now()}`, category, text: trimmed }],
      })
    },
    remove: (id: string) => {
      updateSharedState({
        done: state.done.filter((item) => item !== id),
        custom: state.custom.filter((item) => item.id !== id),
      })
    },
  }
}