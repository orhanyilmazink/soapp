'use client'

import { useEffect } from 'react'
import { preventPinchZoom } from '@/lib/pinch-zoom'

export function PinchZoomLock() {
  useEffect(() => preventPinchZoom(document), [])
  return null
}
