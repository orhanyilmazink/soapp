'use client'

import { useEffect, useState } from 'react'

export const exitDuration = 240

/** Keep a closing layer mounted until its exit transition has finished. */
export function usePresence(open: boolean) {
  const [present, setPresent] = useState(open)

  useEffect(() => {
    if (open) {
      setPresent(true)
      return
    }
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : exitDuration
    const timeout = window.setTimeout(() => setPresent(false), duration)
    return () => window.clearTimeout(timeout)
  }, [open])

  return open || present
}
