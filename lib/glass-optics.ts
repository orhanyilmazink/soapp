const cutoutProperties = ['--glass-cut-x', '--glass-cut-y', '--glass-lens-width', '--glass-lens-height'] as const
const htmlNamespace = 'http://www.w3.org/1999/xhtml'
const interactiveTags = new Set(['button', 'a', 'input', 'select', 'textarea', 'summary', 'label'])
const omittedTags = new Set(['script', 'style', 'iframe', 'object', 'embed'])

function ordinaryStyle(value: string | null) {
  return (value ?? '').split(';').map(item => item.trim())
    .filter(item => item && !cutoutProperties.some(property => item.startsWith(`${property}:`))).join(';')
}

/** A visual-only copy: no cloned IDs, form controls, links, event attributes or tab semantics. */
function decoration(source: Element, doc: Document, host: Window): Element | null {
  if (omittedTags.has(source.localName)) return null
  const copy = source.namespaceURI === htmlNamespace && interactiveTags.has(source.localName)
    ? doc.createElement('div') : source.cloneNode(false) as Element
  // Converted controls still need their visual classes and SVG attributes.
  if (copy.localName === 'div' && source.localName !== 'div') {
    for (const attribute of Array.from(source.attributes)) copy.setAttribute(attribute.name, attribute.value)
  }
  for (const attribute of Array.from(copy.attributes)) {
    const name = attribute.name.toLowerCase()
    if (name === 'id' || name === 'name' || name === 'form' || name === 'for' || name === 'role' ||
      name === 'tabindex' || name === 'autofocus' || name === 'contenteditable' || name === 'href' ||
      name === 'xlink:href' || name.startsWith('on') || name.startsWith('aria-') ||
      name === 'data-drag-preview' || name === 'data-glass-cutout' || attribute.value.includes('url(#')) copy.removeAttribute(attribute.name)
  }
  const style = (copy as HTMLElement | SVGElement).style
  if (style) {
    const computed = host.getComputedStyle(source)
    for (let index = 0; index < computed.length; index++) {
      const property = computed[index]
      if (!cutoutProperties.includes(property as typeof cutoutProperties[number])) {
        style.setProperty(property, computed.getPropertyValue(property))
      }
    }
    style.setProperty('pointer-events', 'none', 'important')
    style.setProperty('user-select', 'none', 'important')
    style.setProperty('-webkit-user-select', 'none', 'important')
    style.setProperty('transition', 'none', 'important')
    style.setProperty('animation', 'none', 'important')
    style.setProperty('mask', 'none', 'important')
    style.setProperty('-webkit-mask', 'none', 'important')
    style.setProperty('mask-image', 'none', 'important')
    style.setProperty('-webkit-mask-image', 'none', 'important')
  }
  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === 1) {
      const element = child as Element
      // The lens supplies its own glass surface, not another active-tab pill.
      if (element.classList.contains('bottom-nav-active')) continue
      const copied = decoration(element, doc, host)
      if (copied) copy.appendChild(copied)
    } else if (child.nodeType === 3) copy.appendChild(child.cloneNode(false))
  }
  return copy
}

export function glassSampleGeometry(x: number, y: number, top: number, width: number, height: number) {
  return { left: -x, top: -(top + y), centerX: x + width / 2, centerY: top + y + height / 2 }
}

/** Keep a refracted, inert copy of the bar aligned underneath its moving glass lens. */
export function attachGlassOptics(root: HTMLElement, indicator: HTMLElement, track: HTMLElement) {
  const doc = root.ownerDocument
  const host = doc.defaultView
  if (!host) return () => {}
  let disposed = false
  let frame = 0
  let rebuild = true
  let measure = true
  let sources: HTMLButtonElement[] = []
  const copies = new Map<HTMLButtonElement, HTMLElement>()
  const boxes = new Map<HTMLButtonElement, { left: number; top: number; width: number; height: number }>()

  track.setAttribute('aria-hidden', 'true')
  track.setAttribute('inert', '')
  track.style.pointerEvents = 'none'
  track.style.position = 'absolute'
  track.style.left = '0'
  track.style.top = '0'
  track.style.overflow = 'visible'

  const selectedSources = () => Array.from(root.children)
    .filter(element => element.localName === 'button') as HTMLButtonElement[]
  const removeCutout = (button: HTMLButtonElement) => {
    delete button.dataset.glassCutout
    cutoutProperties.forEach(property => button.style.removeProperty(property))
  }
  const numeric = (property: string, fallback = 0) => {
    const value = indicator.style.getPropertyValue(property) || root.style.getPropertyValue(property)
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  const draw = () => {
    frame = 0
    if (disposed) return
    const held = root.dataset.dragging === 'true'
    if (rebuild) {
      const next = selectedSources()
      sources.filter(button => !next.includes(button)).forEach(removeCutout)
      sources = next
      copies.clear()
      track.replaceChildren()
      for (const button of sources) {
        const copy = decoration(button, doc, host) as HTMLElement | null
        if (!copy) continue
        copy.setAttribute('aria-hidden', 'true')
        copy.setAttribute('inert', '')
        Object.assign(copy.style, {
          position: 'absolute', margin: '0', boxSizing: 'border-box', background: 'none',
          borderColor: 'transparent', boxShadow: 'none', transform: 'none',
        })
        copies.set(button, copy)
        track.appendChild(copy)
      }
      rebuild = false
      measure = true
    }
    // Resizing in the middle of a held gesture must not jump the sampled controls.
    if (measure && (!held || boxes.size === 0)) {
      const bounds = root.getBoundingClientRect()
      track.style.width = `${bounds.width}px`
      track.style.height = `${bounds.height}px`
      boxes.clear()
      for (const button of sources) {
        const rect = button.getBoundingClientRect()
        const box = {
          left: rect.left - bounds.left - (root.clientLeft || 0),
          top: rect.top - bounds.top - (root.clientTop || 0),
          width: rect.width, height: rect.height,
        }
        boxes.set(button, box)
        const copy = copies.get(button)
        if (copy) Object.assign(copy.style, {
          left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`,
        })
      }
      measure = false
    } else if (rebuild === false) {
      // A text/selection repaint can replace clones while the geometry stays frozen.
      for (const [button, copy] of copies) {
        const box = boxes.get(button)
        if (box) Object.assign(copy.style, {
          left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`,
        })
      }
    }
    const width = numeric('--glass-width', Number.parseFloat(indicator.style.width) || 0)
    const height = numeric('--glass-height', Number.parseFloat(indicator.style.height) || 0)
    const cutoutWidth = width * numeric('--glass-scale-x', 1)
    const cutoutHeight = height * numeric('--glass-scale-y', 1)
    const lens = glassSampleGeometry(numeric('--glass-x'), numeric('--glass-y'),
      numeric('--glass-top', Number.parseFloat(indicator.style.top) || 0), width, height)
    track.style.transformOrigin = `${lens.centerX}px ${lens.centerY}px`
    track.style.transform = `translate3d(${lens.left}px, ${lens.top}px, 0) scale(${held ? 1.08 : 1})`
    for (const button of sources) {
      const box = boxes.get(button)
      if (!held || !box || !width || !height) { removeCutout(button); continue }
      button.style.setProperty('--glass-cut-x', `${lens.centerX - box.left}px`)
      button.style.setProperty('--glass-cut-y', `${lens.centerY - box.top}px`)
      button.style.setProperty('--glass-lens-width', `${cutoutWidth}px`)
      button.style.setProperty('--glass-lens-height', `${cutoutHeight}px`)
      if (button.dataset.glassCutout !== 'true') button.dataset.glassCutout = 'true'
    }
  }
  const schedule = () => { if (!disposed && !frame) frame = host.requestAnimationFrame(draw) }
  const sourceFor = (node: Node) => {
    let element = node.nodeType === 1 ? node as Element : node.parentElement
    while (element && element.parentElement !== root) element = element.parentElement
    return element?.localName === 'button' ? element as HTMLButtonElement : null
  }
  const Observer = host.MutationObserver
  const observer = new Observer(records => {
    for (const record of records) {
      if (indicator.contains(record.target)) { if (record.target === indicator) schedule(); continue }
      if (record.target === root) {
        if (record.type === 'childList' || record.attributeName === 'class' || record.attributeName === 'style') {
          rebuild = true
          measure = true
        }
        schedule()
        continue
      }
      if (!sourceFor(record.target) || record.attributeName === 'data-drag-preview' || record.attributeName === 'data-glass-cutout') continue
      if (record.attributeName === 'style' && ordinaryStyle(record.oldValue) ===
        ordinaryStyle((record.target as Element).getAttribute('style'))) continue
      rebuild = true
      measure = true
      schedule()
    }
  })
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeOldValue: true })
  // Computed paint belongs to the current app theme, even when React's button
  // props stay unchanged while the document-level theme changes.
  const themeObserver = new Observer(() => { rebuild = true; measure = true; schedule() })
  themeObserver.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
  const resized = () => { measure = true; schedule() }
  const Resize = host.ResizeObserver
  const resize = Resize ? new Resize(resized) : null
  resize?.observe(root)
  host.addEventListener('resize', resized)
  const fonts = doc.fonts
  fonts?.addEventListener('loadingdone', resized)
  draw()
  return () => {
    disposed = true
    observer.disconnect()
    themeObserver.disconnect()
    resize?.disconnect()
    host.removeEventListener('resize', resized)
    fonts?.removeEventListener('loadingdone', resized)
    if (frame) host.cancelAnimationFrame(frame)
    sources.forEach(removeCutout)
    track.replaceChildren()
    copies.clear()
    boxes.clear()
  }
}
