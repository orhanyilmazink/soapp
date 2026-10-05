const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const api = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../lib/glass-optics.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: api })

class Style {
  constructor() { this.properties = new Map() }
  setProperty(name, value) { this.properties.set(name, value) }
  getPropertyValue(name) { return this.properties.get(name) ?? '' }
  removeProperty(name) { this.properties.delete(name) }
  text() { return [...this.properties].map(([key, value]) => `${key}: ${value};`).join(' ') }
}
class Element {
  constructor(tag, doc) {
    this.localName = tag
    this.ownerDocument = doc
    this.nodeType = 1
    this.namespaceURI = 'http://www.w3.org/1999/xhtml'
    this.style = new Style()
    this.dataset = {}
    this.attributeMap = new Map()
    this.childNodes = []
    this.box = { left: 0, top: 0, width: 0, height: 0 }
    this.classList = { contains: token => (this.getAttribute('class') ?? '').split(' ').includes(token) }
  }
  get attributes() { return [...this.attributeMap].map(([name, value]) => ({ name, value })) }
  get children() { return this.childNodes.filter(child => child.nodeType === 1) }
  getAttribute(name) { return name === 'style' ? this.style.text() : this.attributeMap.get(name) ?? null }
  setAttribute(name, value) { this.attributeMap.set(name, value) }
  removeAttribute(name) { this.attributeMap.delete(name) }
  appendChild(child) { child.parentElement = this; this.childNodes.push(child); return child }
  replaceChildren(...children) { this.childNodes.forEach(child => { child.parentElement = null }); this.childNodes = []; children.forEach(child => this.appendChild(child)) }
  contains(target) { return target === this || this.childNodes.some(child => child.nodeType === 1 && child.contains(target)) }
  cloneNode() { const copy = new Element(this.localName, this.ownerDocument); this.attributes.forEach(attribute => copy.setAttribute(attribute.name, attribute.value)); return copy }
  getBoundingClientRect() { return this.box }
}
function text(value) { return { nodeType: 3, value, cloneNode: () => text(value) } }
function walk(element) { return [element, ...element.children.flatMap(walk)] }
function fixture({ border = 0 } = {}) {
  const frames = new Map()
  const observers = []
  const resizeObservers = []
  let frameId = 0
  const host = new EventTarget()
  Object.assign(host, {
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId },
    cancelAnimationFrame: id => frames.delete(id),
    getComputedStyle: () => ({ 0: 'display', 1: 'color', 2: 'font-size', length: 3,
      getPropertyValue: property => ({ display: 'flex',
        color: doc.documentElement.getAttribute('data-theme') === 'light' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)',
        'font-size': '12px' })[property] }),
    MutationObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this) }
      observe() {}
      disconnect() { this.disconnected = true }
    },
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; resizeObservers.push(this) }
      observe() {}
      disconnect() { this.disconnected = true }
    },
  })
  const doc = { defaultView: host, fonts: new EventTarget(), createElement: tag => new Element(tag, doc) }
  doc.documentElement = new Element('html', doc)
  const root = new Element('div', doc)
  root.clientLeft = border
  root.clientTop = border
  root.box = { left: 10, top: 100, width: 300, height: 70 }
  const indicator = root.appendChild(new Element('span', doc))
  const refraction = indicator.appendChild(new Element('span', doc))
  const track = refraction.appendChild(new Element('span', doc))
  const buttons = Array.from({ length: 3 }, (_, index) => {
    const button = root.appendChild(new Element('button', doc))
    button.box = { left: 15 + index * 100, top: 105, width: 90, height: 60 }
    for (const [name, value] of [['id', `tab-${index}`], ['role', 'tab'], ['name', 'secret'], ['form', 'main'], ['onclick', 'bad()'], ['tabindex', '0'], ['aria-selected', 'true']]) button.setAttribute(name, value)
    const background = button.appendChild(new Element('span', doc))
    background.setAttribute('class', 'bottom-nav-active')
    const label = button.appendChild(new Element('span', doc))
    label.setAttribute('id', `label-${index}`)
    label.appendChild(text(`Tab ${index}`))
    const link = button.appendChild(new Element('a', doc))
    link.setAttribute('href', '/account')
    return button
  })
  const cleanup = api.attachGlassOptics(root, indicator, track)
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()) }
  const mutate = (target, attributeName = 'style', oldValue = null, type = 'attributes') => observers[0].callback([{ target, attributeName, oldValue, type }])
  const hold = () => {
    root.dataset.dragging = 'true'
    for (const [key, value] of [['x', 105], ['y', -3], ['top', 5], ['width', 90], ['height', 60]]) indicator.style.setProperty(`--glass-${key}`, `${value}px`)
    mutate(indicator)
    flush()
  }
  return { root, indicator, track, buttons, host, doc, frames, observers, resizeObservers, cleanup, flush, mutate, hold }
}

test('optical samples inverse-track the lens without moving the bar', () => {
  const value = api.glassSampleGeometry(100, -5, 4, 70, 60)
  assert.equal(value.left, -100)
  assert.equal(value.top, 1)
  assert.equal(value.centerX, 135)
  assert.equal(value.centerY, 29)
})

test('optical clones are inert decorative divs without duplicate IDs or controls', () => {
  const f = fixture()
  assert.equal(f.track.children.length, 3)
  assert.equal(f.track.getAttribute('inert'), '')
  assert.equal(f.track.getAttribute('aria-hidden'), 'true')
  for (const copy of f.track.children) {
    assert.equal(copy.localName, 'div')
    assert.equal(copy.getAttribute('inert'), '')
    for (const node of walk(copy)) {
      assert.equal(node.getAttribute('id'), null)
      assert.equal(node.getAttribute('name'), null)
      assert.equal(node.getAttribute('form'), null)
      assert.equal(node.getAttribute('onclick'), null)
      assert.equal(node.getAttribute('role'), null)
      assert.equal(node.getAttribute('tabindex'), null)
      assert.equal(node.getAttribute('href'), null)
      assert.equal(node.classList.contains('bottom-nav-active'), false)
    }
  }
  f.cleanup()
})

test('held lens magnifies one sampled copy and cuts originals at button-relative centers', () => {
  const f = fixture()
  f.hold()
  assert.equal(f.track.style.transform, 'translate3d(-105px, -2px, 0) scale(1.08)')
  assert.equal(f.track.style.transformOrigin, '150px 32px')
  assert.equal(f.buttons[1].style.getPropertyValue('--glass-cut-x'), '45px')
  assert.equal(f.buttons[1].style.getPropertyValue('--glass-cut-y'), '27px')
  assert.equal(f.buttons[1].style.getPropertyValue('--glass-lens-width'), '90px')
  assert.equal(f.buttons[1].style.getPropertyValue('--glass-lens-height'), '60px')
  assert.equal(f.track.children[1].style.left, '105px')
  f.cleanup()
})

test('self-authored cutout styles and drag preview updates cannot create observer feedback', () => {
  const f = fixture()
  f.hold()
  f.mutate(f.buttons[0], 'style', '')
  f.mutate(f.buttons[0], 'data-drag-preview')
  f.mutate(f.track.children[0], 'style')
  assert.equal(f.frames.size, 0)
  f.cleanup()
})

test('resize geometry freezes while held, settles afterward, and cleanup removes decoration', () => {
  const f = fixture()
  f.hold()
  f.buttons[1].box.width = 100
  f.resizeObservers[0].callback()
  f.flush()
  assert.equal(f.track.children[1].style.width, '90px')
  delete f.root.dataset.dragging
  f.mutate(f.root, 'data-dragging')
  f.flush()
  assert.equal(f.track.children[1].style.width, '100px')
  assert.equal(f.buttons[1].style.getPropertyValue('--glass-cut-x'), '')
  f.mutate(f.indicator)
  assert.equal(f.frames.size, 1)
  f.cleanup()
  assert.equal(f.frames.size, 0)
  assert.equal(f.track.children.length, 0)
  assert.equal(f.observers[0].disconnected, true)
  assert.equal(f.observers[1].disconnected, true)
  assert.equal(f.resizeObservers[0].disconnected, true)
})

test('original label and child changes refresh only the decorative copy', () => {
  const f = fixture()
  const label = f.buttons[0].children[1]
  label.replaceChildren(text('Updated'))
  f.mutate(label, null, null, 'childList')
  f.flush()
  assert.equal(f.track.children[0].children[0].childNodes[0].value, 'Updated')
  assert.equal(f.buttons[0].localName, 'button')
  assert.equal(f.buttons[0].getAttribute('id'), 'tab-0')
  f.cleanup()
})

test('document theme changes refresh sampled colors without changes to button props', () => {
  const f = fixture()
  assert.equal(f.track.children[0].style.getPropertyValue('color'), 'rgb(255, 255, 255)')
  f.doc.documentElement.setAttribute('data-theme', 'light')
  f.observers[1].callback()
  f.flush()
  assert.equal(f.track.children[0].style.getPropertyValue('color'), 'rgb(0, 0, 0)')
  f.hold()
  f.doc.documentElement.setAttribute('data-theme', 'dark')
  f.observers[1].callback()
  f.flush()
  assert.equal(f.track.children[0].style.getPropertyValue('color'), 'rgb(255, 255, 255)')
  assert.equal(f.track.children[0].style.width, '90px')
  f.cleanup()
})

test('sampled controls use the padding-box origin like the dragging lens', () => {
  const f = fixture({ border: 1 })
  assert.equal(f.track.children[0].style.left, '4px')
  assert.equal(f.track.children[0].style.top, '4px')
  f.cleanup()
})

test('source cutout follows the expanded lens but keeps its unscaled center', () => {
  const f = fixture()
  f.hold()
  f.indicator.style.setProperty('--glass-scale-x', '1.14')
  f.indicator.style.setProperty('--glass-scale-y', '1.12')
  f.mutate(f.indicator)
  f.flush()
  assert.equal(f.buttons[1].style.getPropertyValue('--glass-lens-width'), '102.6px')
  assert.equal(f.buttons[1].style.getPropertyValue('--glass-lens-height'), '67.2px')
  assert.equal(f.buttons[1].style.getPropertyValue('--glass-cut-x'), '45px')
  assert.equal(f.buttons[1].style.getPropertyValue('--glass-cut-y'), '27px')
  f.cleanup()
})

test('gesture-state root attributes schedule sampling without rebuilding clones', () => {
  const f = fixture()
  const originalCopy = f.track.children[0]
  for (const attribute of ['data-pressed', 'data-settling', 'data-glass-ready', 'data-dragging']) {
    f.mutate(f.root, attribute)
    f.flush()
    assert.equal(f.track.children[0], originalCopy)
  }
  f.mutate(f.root, 'class')
  f.flush()
  assert.notEqual(f.track.children[0], originalCopy)
  f.cleanup()
})
