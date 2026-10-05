/** Restore iOS's fixed-position viewport after leaving the keyboard/PIN lock. */
export function restoreLoginViewport(host: Window = window) {
  const viewport = host.visualViewport
  let frame = 0
  let stopped = false
  let timeout = 0
  const resetScroll = () => host.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  const stop = () => {
    stopped = true
    host.cancelAnimationFrame(frame)
    host.clearTimeout(timeout)
    viewport?.removeEventListener('resize', settle)
    viewport?.removeEventListener('scroll', settle)
    host.removeEventListener('pointerdown', stop)
  }
  const settle = () => {
    if (stopped) return
    resetScroll()
    host.cancelAnimationFrame(frame)
    frame = host.requestAnimationFrame(() => {
      if (stopped) return
      resetScroll()
      // Wait for the keyboard animation, not for ordinary page scrolling.
      if (!viewport || (host.innerHeight - viewport.height < 80 && viewport.offsetTop < 1)) stop()
    })
  }
  viewport?.addEventListener('resize', settle)
  viewport?.addEventListener('scroll', settle)
  // A new gesture belongs to the user; never fight their scrolling or editing.
  host.addEventListener('pointerdown', stop, { once: true })
  timeout = host.setTimeout(stop, 1500)
  settle()
  return stop
}
