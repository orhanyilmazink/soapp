'use client'

import { useEffect, useLayoutEffect, useRef, type HTMLAttributes } from 'react'
import { attachDragTabs } from '@/lib/drag-tabs'
import { cn } from '@/lib/utils'

export function DraggableTabList({ children, className, onSelect, ...props }: Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> & {
  onSelect: (index: number) => void
}) {
  const root = useRef<HTMLDivElement>(null)
  const indicator = useRef<HTMLSpanElement>(null)
  const selection = useRef(onSelect)
  useEffect(() => { selection.current = onSelect }, [onSelect])
  useLayoutEffect(() => {
    if (!root.current || !indicator.current) return
    return attachDragTabs(root.current, indicator.current, index => selection.current(index))
  }, [])
  return (
    <div ref={root} className={cn('drag-tab-list plain-tab-panel', className)} {...props}>
      <span ref={indicator} hidden aria-hidden="true" className="drag-tab-indicator" />
      {children}
    </div>
  )
}
