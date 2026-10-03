'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { categories, type ActiveCategoryId, type CategoryId } from '@/lib/bucket-list'

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
  // Retain older entries in saved state even though these categories are no longer shown.
  const validCategoryIds = new Set<CategoryId>([
    ...categories.map((category) => category.id),
    'together',
    'books',
    'events',
    'learn',
  ])

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

function mergeSetChanges(base: string[], desired: string[], remote: string[]) {
  const baseSet = new Set(base)
  const desiredSet = new Set(desired)
  const merged = new Set(remote)

  for (const value of baseSet) {
    if (!desiredSet.has(value)) merged.delete(value)
  }
  for (const value of desiredSet) {
    if (!baseSet.has(value)) merged.add(value)
  }

  return [...merged]
}

function mergeRecordChanges<T extends { id: string }>(base: T[], desired: T[], remote: T[]) {
  const baseById = new Map(base.map((item) => [item.id, item]))
  const desiredById = new Map(desired.map((item) => [item.id, item]))
  const merged = new Map(remote.map((item) => [item.id, item]))

  for (const [id, baseItem] of baseById) {
    if (!desiredById.has(id)) merged.delete(id)
    else if (JSON.stringify(desiredById.get(id)) !== JSON.stringify(baseItem)) {
      merged.set(id, desiredById.get(id) as T)
    }
  }
  for (const [id, item] of desiredById) {
    if (!baseById.has(id)) merged.set(id, item)
  }

  return [...merged.values()]
}

function mergeConcurrentChanges(
  base: SharedAppData,
  desired: SharedAppData,
  remote: SharedAppData
): SharedAppData {
  return {
    version: 1,
    done: mergeSetChanges(base.done, desired.done, remote.done),
    custom: mergeRecordChanges(base.custom, desired.custom, remote.custom),
    calendarEvents: mergeRecordChanges(base.calendarEvents, desired.calendarEvents, remote.calendarEvents),
    meetupDate: desired.meetupDate === base.meetupDate ? remote.meetupDate : desired.meetupDate,
    meetupTime: desired.meetupTime === base.meetupTime ? remote.meetupTime : desired.meetupTime,
    relationshipMilestones: mergeSetChanges(
      base.relationshipMilestones,
      desired.relationshipMilestones,
      remote.relationshipMilestones
    ),
  }
}

function sameAppData(left: SharedAppData, right: SharedAppData) {
  return JSON.stringify(left) === JSON.stringify(right)
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
  const lastSyncedState = useRef<SharedAppData>(emptyState)
  const lastSyncedAt = useRef('')
  const mergeLocalOnFirstSync = useRef(true)
  const writeQueue = useRef<Promise<void>>(Promise.resolve())
  const pendingSaveRef = useRef<(() => Promise<void>) | null>(null)

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
    let initialSyncDone = false
    let pendingRemote: { state: SharedAppData; updatedAt: string } | null = null
    setSyncStatus('connecting')
    setCloudReady(false)
    setSyncError('')

    const persistLatestState = async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data, error } = await client
          .from('bucket_lists')
          .select('state, updated_at')
          .eq('id', sharedRowId)
          .maybeSingle()
        if (error) throw error

        if (!data) {
          const desired = stateRef.current
          const insertedAt = new Date().toISOString()
          const { error: insertError } = await client.from('bucket_lists').insert({
            id: sharedRowId,
            state: desired,
            updated_at: insertedAt,
          })
          if (insertError?.code === '23505') continue
          if (insertError) throw insertError
          lastSyncedState.current = desired
          lastSyncedAt.current = insertedAt
          return
        }

        const remote = normalizeAppData(data.state)
        const desired = stateRef.current
        const merged = mergeConcurrentChanges(lastSyncedState.current, desired, remote)
        if (sameAppData(remote, merged)) {
          lastSyncedState.current = remote
          lastSyncedAt.current = data.updated_at
          const adopted = mergeConcurrentChanges(desired, stateRef.current, remote)
          stateRef.current = adopted
          setState(adopted)
          writeLocalAppData(adopted)
          return
        }

        const updatedAt = new Date(Math.max(Date.now(), Date.parse(data.updated_at) + 1)).toISOString()
        const { data: saved, error: saveError } = await client
          .from('bucket_lists')
          .update({ state: merged, updated_at: updatedAt })
          .eq('id', sharedRowId)
          .eq('updated_at', data.updated_at)
          .select('updated_at')
          .maybeSingle()
        if (saveError) throw saveError
        if (!saved) continue

        lastSyncedState.current = merged
        lastSyncedAt.current = saved.updated_at
        const adopted = mergeConcurrentChanges(desired, stateRef.current, merged)
        stateRef.current = adopted
        setState(adopted)
        writeLocalAppData(adopted)
        return
      }

      throw new Error('Eşitleme sırasında başka bir cihazdan gelen değişiklikler çakıştı. Yeniden deneyin.')
    }

    const queueSave = () => {
      const save = writeQueue.current.then(persistLatestState)
      writeQueue.current = save.catch((error: unknown) => {
        if (active) {
          setSyncStatus('offline')
          setSyncError(error instanceof Error ? error.message : 'Değişiklik eşitlenemedi.')
        }
      })

      return save.then(() => {
        if (!active) return
        setSyncStatus('connected')
        setSyncError('')
      })
    }
    pendingSaveRef.current = queueSave

    const applyRemoteState = (incoming: SharedAppData, updatedAt: string) => {
      if (lastSyncedAt.current && Date.parse(updatedAt) <= Date.parse(lastSyncedAt.current)) return

      const next = mergeConcurrentChanges(lastSyncedState.current, stateRef.current, incoming)
      lastSyncedState.current = incoming
      lastSyncedAt.current = updatedAt
      stateRef.current = next
      setState(next)
      writeLocalAppData(next)
      if (!sameAppData(next, incoming)) void queueSave().catch(() => undefined)
    }

    const refreshFromCloud = async () => {
      const { data, error } = await client
        .from('bucket_lists')
        .select('state, updated_at')
        .eq('id', sharedRowId)
        .maybeSingle()
      if (error) throw error
      if (data?.state && active) {
        applyRemoteState(normalizeAppData(data.state), data.updated_at)
      }
    }

    channel = client
      .channel('shared-app-state')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bucket_lists', filter: `id=eq.${sharedRowId}` },
        (payload) => {
          if (!active) return
          const newRow = payload.new as { state?: unknown; updated_at?: string } | undefined
          if (!newRow?.state || !newRow.updated_at) return
          const incoming = normalizeAppData(newRow.state)
          if (!initialSyncDone) {
            if (!pendingRemote || Date.parse(newRow.updated_at) > Date.parse(pendingRemote.updatedAt)) {
              pendingRemote = { state: incoming, updatedAt: newRow.updated_at }
            }
            return
          }
          applyRemoteState(incoming, newRow.updated_at)
        }
      )
      .subscribe((status) => {
        if (!active) return
        if (status === 'SUBSCRIBED') {
          setSyncStatus('connected')
          if (initialSyncDone) {
            void refreshFromCloud().catch((error: unknown) => {
              if (!active) return
              setSyncStatus('offline')
              setSyncError(error instanceof Error ? error.message : 'Uzak kayıt yenilenemedi.')
            })
          }
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setSyncStatus('offline')
          setSyncError('Canlı eşitleme bağlantısı kurulamadı.')
        }
      })

    const connect = async () => {
      try {
        const { data, error } = await client
          .from('bucket_lists')
          .select('state, updated_at')
          .eq('id', sharedRowId)
          .maybeSingle()
        if (error) throw error

        let remote = data?.state ? normalizeAppData(data.state) : emptyState
        let remoteUpdatedAt = data?.updated_at ?? ''
        if (pendingRemote && (!remoteUpdatedAt || Date.parse(pendingRemote.updatedAt) > Date.parse(remoteUpdatedAt))) {
          remote = pendingRemote.state
          remoteUpdatedAt = pendingRemote.updatedAt
        }

        lastSyncedState.current = remote
        lastSyncedAt.current = remoteUpdatedAt
        const next = data?.state || pendingRemote
          ? mergeLegacyRemote(remote, stateRef.current, mergeLocalOnFirstSync.current)
          : stateRef.current
        stateRef.current = next
        setState(next)
        writeLocalAppData(next)

        if (!(data?.state || pendingRemote) || !sameAppData(remote, next)) {
          await queueSave()
        }

        mergeLocalOnFirstSync.current = false
        try {
          localStorage.setItem(syncedStateKey, 'true')
        } catch {
          // Keep sync usable if browser storage is unavailable.
        }

        if (!active) return
        initialSyncDone = true
        setCloudReady(true)
        void refreshFromCloud().catch((refreshError: unknown) => {
          if (!active) return
          setSyncStatus('offline')
          setSyncError(refreshError instanceof Error ? refreshError.message : 'Uzak kayıt yenilenemedi.')
        })
      } catch (error) {
        if (!active) return
        initialSyncDone = true
        setSyncStatus('offline')
        setSyncError(error instanceof Error ? error.message : 'Eşitleme bağlantısı kurulamadı.')
        setCloudReady(true)
      }
    }

    void connect()
    return () => {
      active = false
      pendingSaveRef.current = null
      if (channel) void client.removeChannel(channel)
    }
  }, [localReady])

  function updateSharedState(patch: Partial<SharedAppData>) {
    const next = normalizeAppData({ ...stateRef.current, ...patch })
    stateRef.current = next
    setState(next)
    writeLocalAppData(next)

    if (!supabase) return
    setSyncStatus('saving')
    // The provider effect owns the cloud queue so all edits use the same
    // compare-and-swap/retry path. The local copy remains available offline.
    if (pendingSaveRef.current) void pendingSaveRef.current().catch(() => undefined)
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
    add: (category: ActiveCategoryId, text: string) => {
      const trimmed = text.trim().slice(0, 80)
      if (!trimmed) return
      updateSharedState({
        custom: [...state.custom, { id: `custom-${Date.now()}`, category, text: trimmed }],
      })
    },
    remove: (ids: string | string[]) => {
      const idsToRemove = new Set(Array.isArray(ids) ? ids : [ids])
      updateSharedState({
        done: state.done.filter((item) => !idsToRemove.has(item)),
        custom: state.custom.filter((item) => !idsToRemove.has(item.id)),
      })
    },
  }
}
