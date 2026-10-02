'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CategoryId } from '@/lib/bucket-list'
import { supabase } from '@/lib/supabase'

const KEY = 'bucket-list-v1'
const SHARED_ROW_ID = 'shared'
const EMPTY = '{"done":[],"custom":[]}'

export type CustomItem = { id: string; category: CategoryId; text: string }
type State = { done: string[]; custom: CustomItem[] }

function normalizeState(value: unknown): State {
  if (!value || typeof value !== 'object') return { done: [], custom: [] }

  const next = value as Partial<State>
  return {
    done: Array.isArray(next.done) ? next.done.filter((item): item is string => typeof item === 'string') : [],
    custom: Array.isArray(next.custom)
      ? next.custom.filter(
          (item): item is CustomItem =>
            !!item && typeof item === 'object' && typeof item.id === 'string' && typeof item.category === 'string' && typeof item.text === 'string'
        )
      : [],
  }
}

function readLocal() {
  try {
    return localStorage.getItem(KEY) ?? EMPTY
  } catch {
    return EMPTY
  }
}

function writeLocal(state: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // ignore storage errors in private mode or unsupported browsers
  }
}

function parse(raw: string): State {
  try {
    const value = JSON.parse(raw) as unknown
    return normalizeState(value)
  } catch {
    return { done: [], custom: [] }
  }
}

async function readRemote() {
  if (!supabase) return null

  const { data, error } = await supabase.from('bucket_lists').select('state').eq('id', SHARED_ROW_ID).maybeSingle()

  if (error && error.code !== 'PGRST116') return null
  if (!data || !data.state) return null

  return normalizeState(data.state)
}

async function writeRemote(state: State) {
  if (!supabase) return

  const { error } = await supabase
    .from('bucket_lists')
    .upsert(
      {
        id: SHARED_ROW_ID,
        state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

  if (error) {
    console.warn('Bucket list sync failed:', error.message)
  }
}

export function useBucketList() {
  const [state, setState] = useState<State>(() => parse(readLocal()))

  useEffect(() => {
    let active = true

    const hydrate = async () => {
      if (!supabase) return

      const remote = await readRemote()
      if (active && remote) {
        setState(remote)
        writeLocal(remote)
      }
    }

    hydrate()

    const client = supabase
    if (!client) return () => {
      active = false
    }

    const channel = client
      .channel('bucket-list-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bucket_lists',
          filter: `id=eq.${SHARED_ROW_ID}`,
        },
        (payload) => {
          if (!active) return
          const newRow = payload.new as { state?: unknown } | undefined
          const next = normalizeState(newRow?.state)
          setState(next)
          writeLocal(next)
        }
      )
      .subscribe()

    return () => {
      active = false
      client.removeChannel(channel)
    }
  }, [])

  const done = useMemo(() => new Set(state.done), [state.done])

  const syncState = (next: State) => {
    setState(next)
    writeLocal(next)
    void writeRemote(next)
  }

  return {
    done,
    custom: state.custom,
    toggle: (id: string) => {
      const next = done.has(id) ? state.done.filter((d) => d !== id) : [...state.done, id]
      syncState({ ...state, done: next })
    },
    add: (category: CategoryId, text: string) => {
      const trimmed = text.trim().slice(0, 80)
      if (!trimmed) return
      syncState({ ...state, custom: [...state.custom, { id: `custom-${Date.now()}`, category, text: trimmed }] })
    },
    remove: (id: string) => {
      syncState({
        done: state.done.filter((d) => d !== id),
        custom: state.custom.filter((c) => c.id !== id),
      })
    },
  }
}
