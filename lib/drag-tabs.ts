export function nearestTabIndex(centers: number[], x: number) {
  return centers.reduce((best, center, index) =>
    Math.abs(center - x) < Math.abs(centers[best] - x) ? index : best, 0)
}

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value))
// Motion outside the track keeps following the finger, but never leaves the bar.
const elastic = (distance: number, limit: number, resistance: number) =>
  Math.sign(distance) * limit * (1 - Math.exp(-Math.abs(distance) * resistance / limit))
const rounded = (value: number) => Math.round(value * 100) / 100

/** The shared glass lens follows the finger; React selection changes only on release. */
export function attachDragTabs(root: HTMLElement, indicator: HTMLElement, onSelect: (index: number) => void) {
  let gesture: {
    pointer: number; x: number; y: number; dragging: boolean;
    buttons: HTMLButtonElement[]; centers: number[]; widths: number[]; width: number;
    left: number; trackLeft: number; index: number;
    lastX: number; lastTime: number;
  } | null = null
  let holdTimer: ReturnType<typeof setTimeout> | undefined
  let settleTimer: ReturnType<typeof setTimeout> | undefined
  let suppressUntil = 0
  let selectedIndex = -1
  let disposed = false
  const doc = root.ownerDocument
  const variables = ['--glass-x', '--glass-y', '--glass-scale-x', '--glass-scale-y', '--glass-tilt', '--glass-light-x', '--glass-light-y', '--glass-width', '--glass-height', '--glass-top']
  const buttons = () => Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
  const isSelected = (button: HTMLButtonElement) =>
    button.getAttribute('aria-selected') === 'true' || button.getAttribute('aria-pressed') === 'true'

  const setMotion = (x: number, y = 0, scaleX = 1, scaleY = 1, tilt = 0, lightX = 50, lightY = 30) => {
    indicator.style.setProperty('--glass-x', `${rounded(x)}px`)
    indicator.style.setProperty('--glass-y', `${rounded(y)}px`)
    indicator.style.setProperty('--glass-scale-x', String(rounded(scaleX)))
    indicator.style.setProperty('--glass-scale-y', String(rounded(scaleY)))
    indicator.style.setProperty('--glass-tilt', `${rounded(tilt)}deg`)
    indicator.style.setProperty('--glass-light-x', `${rounded(lightX)}%`)
    indicator.style.setProperty('--glass-light-y', `${rounded(lightY)}%`)
  }
  const setGeometry = (width: number, height?: number, top?: number) => {
    indicator.style.width = `${rounded(width)}px`
    indicator.style.setProperty('--glass-width', `${rounded(width)}px`)
    if (height !== undefined) {
      indicator.style.height = `${rounded(height)}px`
      indicator.style.setProperty('--glass-height', `${rounded(height)}px`)
    }
    if (top !== undefined) {
      indicator.style.top = `${rounded(top)}px`
      indicator.style.setProperty('--glass-top', `${rounded(top)}px`)
    }
  }
  const clearPreview = () => {
    delete root.dataset.dragPreview
    for (const button of buttons()) delete button.dataset.dragPreview
  }
  const preview = (index: number, items: HTMLButtonElement[]) => {
    root.dataset.dragPreview = String(index)
    items.forEach((button, position) => {
      if (position === index) button.dataset.dragPreview = 'true'
      else delete button.dataset.dragPreview
    })
  }
  const settle = () => {
    clearTimeout(settleTimer)
    root.dataset.settling = 'true'
    settleTimer = setTimeout(() => {
      delete root.dataset.settling
      settleTimer = undefined
    }, 420)
  }
  const place = (index: number, items = buttons()) => {
    const button = items[index]
    if (!button) {
      indicator.hidden = true
      return
    }
    const bounds = root.getBoundingClientRect()
    const box = button.getBoundingClientRect()
    setGeometry(box.width, box.height, box.top - bounds.top - (root.clientTop || 0))
    setMotion(box.left - bounds.left - (root.clientLeft || 0))
    indicator.hidden = false
    root.dataset.glassReady = 'true'
  }
  const syncSelection = () => {
    if (disposed || gesture?.dragging) return
    const items = buttons()
    const index = Math.max(0, items.findIndex(isSelected))
    if (selectedIndex !== -1 && selectedIndex !== index) settle()
    selectedIndex = index
    place(index, items)
  }
  const detachPointer = () => {
    doc.removeEventListener('pointermove', move)
    doc.removeEventListener('pointerup', finish)
    doc.removeEventListener('pointercancel', cancel)
  }
  const stop = (destination?: number) => {
    clearTimeout(holdTimer)
    holdTimer = undefined
    const old = gesture
    gesture = null
    delete root.dataset.dragging
    delete root.dataset.pressed
    clearPreview()
    detachPointer()
    // Clearing gesture first also makes the synchronous lost-capture event safe.
    try {
      if (old && root.hasPointerCapture(old.pointer)) root.releasePointerCapture(old.pointer)
    } catch { /* The browser may already have released capture. */ }
    if (disposed) return
    if (old?.dragging) settle()
    if (destination === undefined) syncSelection()
    else {
      selectedIndex = destination
      place(destination, old?.buttons)
    }
  }
  const activate = () => {
    if (!gesture || gesture.dragging) return
    clearTimeout(holdTimer)
    holdTimer = undefined
    gesture.dragging = true
    root.dataset.dragging = 'true'
    preview(gesture.index, gesture.buttons)
    setMotion(gesture.left, 0, 1.14, 1.12)
    try { root.setPointerCapture(gesture.pointer) } catch { /* Document listeners still track the gesture. */ }
  }
  const move = (event: PointerEvent) => {
    const current = gesture
    if (!current || event.pointerId !== current.pointer) return
    if (!current.dragging) {
      const dx = Math.abs(event.clientX - current.x)
      const dy = Math.abs(event.clientY - current.y)
      if (dx > 10 && dx > dy * 1.2) activate()
      else {
        // Before a hold activates, vertical motion still belongs to page scrolling.
        if (Math.hypot(dx, dy) > 10) stop()
        return
      }
    }
    event.preventDefault()
    const intendedCenter = current.left + current.width / 2 + event.clientX - current.x
    const center = clamp(intendedCenter, current.centers[0], current.centers[current.centers.length - 1])
    const overflow = elastic(intendedCenter - center, 12, 0.2)
    const next = current.centers.findIndex(value => value >= center)
    const upper = next === -1 ? current.centers.length - 1 : next
    const lower = Math.max(0, upper - 1)
    const progress = (center - current.centers[lower]) / (current.centers[upper] - current.centers[lower] || 1)
    const width = current.widths[lower] + (current.widths[upper] - current.widths[lower]) * progress
    const left = center - width / 2 + overflow
    const dy = event.clientY - current.y
    const y = elastic(dy, 16, 0.2)
    const now = Date.now()
    const velocity = clamp((event.clientX - current.lastX) / Math.max(16, now - current.lastTime), -2, 2)
    current.lastX = event.clientX
    current.lastTime = now
    setGeometry(width)
    setMotion(left, y,
      1.14 + Math.abs(velocity) * 0.035,
      1.12 + Math.min(Math.abs(dy) / 1200, 0.055),
      clamp(velocity * 2 + y * 0.12, -6, 6),
      clamp((event.clientX - current.trackLeft - left) / width * 100, 10, 90),
      clamp(30 + dy * 0.45, 10, 90))
    current.index = nearestTabIndex(current.centers, center)
    preview(current.index, current.buttons)
  }
  const finish = (event: PointerEvent) => {
    const current = gesture
    if (!current || event.pointerId !== current.pointer) return
    if (current.dragging) move(event)
    const index = current.index
    const commit = current.dragging
    if (commit) {
      event.preventDefault()
      suppressUntil = Date.now() + 500
    }
    stop(commit ? index : undefined)
    if (commit) onSelect(index)
  }
  const cancel = (event: PointerEvent) => {
    if (gesture?.pointer !== event.pointerId) return
    if (gesture.dragging) suppressUntil = Date.now() + 500
    stop()
  }
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary || gesture || disposed) return
    // Suppress only the release's ghost click, never the user's next tap.
    suppressUntil = 0
    const button = (event.target as Element).closest('button') as HTMLButtonElement | null
    if (!button || button.disabled || !root.contains(button) || !isSelected(button)) return
    clearTimeout(settleTimer)
    delete root.dataset.settling
    const items = buttons()
    const bounds = root.getBoundingClientRect()
    const selected = button.getBoundingClientRect()
    const index = items.indexOf(button)
    const boxes = items.map(item => item.getBoundingClientRect())
    const trackLeft = bounds.left + (root.clientLeft || 0)
    gesture = {
      pointer: event.pointerId, x: event.clientX, y: event.clientY, dragging: false,
      buttons: items, centers: boxes.map(box => box.left - trackLeft + box.width / 2),
      widths: boxes.map(box => box.width), width: selected.width,
      left: selected.left - trackLeft, trackLeft,
      index, lastX: event.clientX, lastTime: Date.now(),
    }
    root.dataset.pressed = 'true'
    place(index, items)
    doc.addEventListener('pointermove', move, { passive: false })
    doc.addEventListener('pointerup', finish)
    doc.addEventListener('pointercancel', cancel)
    holdTimer = setTimeout(activate, 220)
  }
  const click = (event: MouseEvent) => {
    if (Date.now() < suppressUntil) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  }
  // Touch implicitly captures the pressed button. Transferring capture to the
  // bar emits a bubbling lost event from that button, NOT a cancelled drag.
  const lost = (event: PointerEvent) => {
    if (event.target === root && gesture?.pointer === event.pointerId && gesture.dragging) cancel(event)
  }
  const key = () => { suppressUntil = 0 }
  const mutation = typeof MutationObserver === 'undefined' ? null : new MutationObserver(syncSelection)
  const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(syncSelection)
  mutation?.observe(root, { attributes: true, attributeFilter: ['aria-selected', 'aria-pressed'], childList: true, subtree: true })
  resize?.observe(root)
  for (const button of buttons()) resize?.observe(button)
  root.addEventListener('pointerdown', down)
  root.addEventListener('click', click, true)
  root.addEventListener('lostpointercapture', lost)
  root.addEventListener('keydown', key)
  syncSelection()
  return () => {
    disposed = true
    stop()
    clearTimeout(settleTimer)
    mutation?.disconnect()
    resize?.disconnect()
    root.removeEventListener('pointerdown', down)
    root.removeEventListener('click', click, true)
    root.removeEventListener('lostpointercapture', lost)
    root.removeEventListener('keydown', key)
    delete root.dataset.settling
    delete root.dataset.glassReady
    indicator.hidden = true
    for (const variable of variables) indicator.style.removeProperty(variable)
  }
}
