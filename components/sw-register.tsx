'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    const register = () => {
      void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {})
    }

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(register, { timeout: 2000 })
      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = setTimeout(register, 1000)
    return () => clearTimeout(timeoutId)
  }, [])
  return null
}
