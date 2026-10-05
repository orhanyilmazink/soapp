'use client'

import { useEffect } from 'react'
import { startAppUpdateMonitor } from '@/lib/app-update'

export function AppUpdates() {
  useEffect(() => {
    const version = process.env.NEXT_PUBLIC_APP_VERSION
    if (process.env.NODE_ENV !== 'production' || !version) return
    return startAppUpdateMonitor(version)
  }, [])

  return null
}
