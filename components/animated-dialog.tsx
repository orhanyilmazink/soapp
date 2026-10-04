'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { usePresence } from '@/lib/use-presence'

let scrollLocks = 0
let previousOverflow = ''

export function AnimatedDialog({
  open,
  onClose,
  titleId,
  descriptionId,
  children,
  className,
  anchorRef,
}: {
  open: boolean
  onClose: () => void
  titleId: string
  descriptionId?: string
  children: ReactNode
  className?: string
  anchorRef?: RefObject<HTMLElement | null>
}) {
  const present = usePresence(open)
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)
  const [position, setPosition] = useState<CSSProperties>()

  useEffect(() => { closeRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!present) return
    if (scrollLocks++ === 0) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    return () => {
      if (--scrollLocks === 0) document.body.style.overflow = previousOverflow
    }
  }, [present])

  useLayoutEffect(() => {
    if (!open || !anchorRef) return
    const reposition = () => {
      const anchor = anchorRef.current?.getBoundingClientRect()
      if (!anchor) return
      const width = Math.min(320, window.innerWidth - 40)
      const top = Math.min(anchor.bottom + 8, window.innerHeight - 100)
      setPosition({
        position: 'fixed',
        top,
        left: Math.max(20, Math.min(anchor.left, window.innerWidth - width - 20)),
        width,
        maxHeight: `calc(100dvh - ${top + 20}px)`,
        margin: 0,
      })
    }
    reposition()
    window.addEventListener('resize', reposition)
    return () => window.removeEventListener('resize', reposition)
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current
    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]'
    ) ?? []).filter(element => element.getClientRects().length > 0)
    const frame = requestAnimationFrame(() => {
      // Focus the panel instead of opening the mobile keyboard on every dialog entrance.
      panel?.focus({ preventScroll: true })
    })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
      } else if (event.key === 'Tab') {
        const controls = focusable()
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (!first) {
          event.preventDefault()
          panel?.focus()
        } else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open])

  if (!present || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
      data-state={open ? 'open' : 'closed'}
      aria-hidden={!open || undefined}
      inert={!open}
    >
      <button
        type="button"
        aria-label="Pencereyi kapat"
        tabIndex={-1}
        onClick={onClose}
        data-state={open ? 'open' : 'closed'}
        className="motion-backdrop fixed inset-0 cursor-default bg-zinc-950/25 backdrop-blur-sm"
      />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        data-state={open ? 'open' : 'closed'}
        style={anchorRef ? position : undefined}
        className={cn('motion-panel surface-panel relative my-auto w-full max-w-sm overflow-y-auto p-5 text-left shadow-2xl outline-none max-h-[calc(100dvh-2rem)]', className)}
      >
        {children}
      </section>
    </div>,
    document.body
  )
}
