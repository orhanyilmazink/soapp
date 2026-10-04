'use client'

import { useSyncExternalStore } from 'react'

type ClockStore = { subscribe: (listener: () => void) => () => void; getSnapshot: () => number | null }
const clocks = new Map<number, ClockStore>()
const getServerSnapshot = () => null

function getClock(interval: number): ClockStore {
  const existing = clocks.get(interval)
  if (existing) return existing
  let current = 0
  let timer: ReturnType<typeof setInterval> | null = null
  const listeners = new Set<() => void>()
  const update = () => {
    current = Date.now()
    listeners.forEach(listener => listener())
  }
  const stop = () => {
    if (timer !== null) clearInterval(timer)
    timer = null
  }
  const resume = () => {
    stop()
    if (!document.hidden) {
      update()
      timer = setInterval(update, interval)
    }
  }
  const store: ClockStore = {
    getSnapshot: () => current || null,
    subscribe: listener => {
      listeners.add(listener)
      if (listeners.size === 1) {
        current = Date.now()
        document.addEventListener('visibilitychange', resume)
        resume()
      }
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          stop()
          document.removeEventListener('visibilitychange', resume)
        }
      }
    },
  }
  clocks.set(interval, store)
  return store
}

/** Returns the current timestamp (ticking every second) on the client, or null during SSR. */
export function useNow(interval = 1000): number | null {
  const clock = getClock(interval)
  return useSyncExternalStore(clock.subscribe, clock.getSnapshot, getServerSnapshot)
}

export function splitDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}
