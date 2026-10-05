/** Hide the shell-anchored dock while the software keyboard covers it. */
export function attachViewportDock(node: HTMLElement, host: Window = window) {
  const viewport = host.visualViewport
  let frame = 0
  let stopped = false

  const measure = () => {
    if (stopped) return
    const height = viewport?.height ?? host.innerHeight
    const offset = viewport?.offsetTop ?? 0
    const layoutHeight = Math.max(host.innerHeight, host.document.documentElement.clientHeight)
    const keyboard = layoutHeight - height - offset > 120
    node.style.visibility = keyboard ? 'hidden' : ''
    // CSS owns the dock position. visualViewport may exclude the 62pt status
    // bar in standalone mode; using it to move the dock recreated the gap.
  }

  const schedule = () => {
    host.cancelAnimationFrame(frame)
    frame = host.requestAnimationFrame(measure)
  }

  viewport?.addEventListener('resize', schedule)
  viewport?.addEventListener('scroll', schedule)
  host.addEventListener('resize', schedule)
  host.addEventListener('pageshow', schedule)
  measure()
  schedule()

  return () => {
    stopped = true
    host.cancelAnimationFrame(frame)
    viewport?.removeEventListener('resize', schedule)
    viewport?.removeEventListener('scroll', schedule)
    host.removeEventListener('resize', schedule)
    host.removeEventListener('pageshow', schedule)
    node.style.removeProperty('visibility')
  }
}
