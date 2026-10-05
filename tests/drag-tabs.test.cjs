const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const code = ts.transpileModule(fs.readFileSync(require.resolve('../lib/drag-tabs.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText

function fixture() {
  const timers = new Map()
  const observers = { mutation: [], resize: [] }
  let nextTimer = 0
  let now = 1000
  const exports = {}
  class Clock extends Date { static now() { return now } }
  class Observer {
    constructor(callback, list) { this.callback = callback; this.targets = []; this.connected = true; list.push(this) }
    observe(target, options) { this.targets.push({ target, options }) }
    disconnect() { this.connected = false }
    fire() { if (this.connected) this.callback([]) }
  }
  class Surface extends EventTarget {
    listeners = new Map()
    addEventListener(type, callback, options) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set())
      this.listeners.get(type).add(callback)
      super.addEventListener(type, callback, options)
    }
    removeEventListener(type, callback, options) {
      this.listeners.get(type)?.delete(callback)
      super.removeEventListener(type, callback, options)
    }
    listenerCount() { return [...this.listeners.values()].reduce((total, list) => total + list.size, 0) }
  }
  vm.runInNewContext(code, { exports, Date: Clock,
    setTimeout: (fn, delay) => { timers.set(++nextTimer, { fn, at: now + delay }); return nextTimer },
    clearTimeout: id => timers.delete(id),
    MutationObserver: class extends Observer { constructor(fn) { super(fn, observers.mutation) } },
    ResizeObserver: class extends Observer { constructor(fn) { super(fn, observers.resize) } },
  })
  const doc = new Surface()
  const root = new Surface()
  let selected = 0
  const boxes = Array.from({ length: 5 }, (_, index) => ({ left: 10 + index * 60, top: 100, width: 60, height: 60 }))
  const buttons = boxes.map((box, index) => ({
    disabled: false, dataset: {},
    getAttribute: key => key === 'aria-selected' ? String(index === selected) : null,
    getBoundingClientRect: () => ({ ...box }),
  }))
  let target = buttons[0]
  let captured = false
  Object.assign(root, {
    ownerDocument: doc, dataset: {}, closest: () => target,
    contains: button => buttons.includes(button), querySelectorAll: () => buttons,
    getBoundingClientRect: () => ({ left: 10, top: 100, width: 300, height: 60 }),
    hasPointerCapture: () => captured, setPointerCapture: () => { captured = true },
    releasePointerCapture: () => { captured = false },
  })
  const style = {
    setProperty(name, value) { this[name] = value },
    removeProperty(name) { delete this[name] },
    getPropertyValue(name) { return this[name] || '' },
  }
  const indicator = { hidden: true, style }
  const selections = []
  const selection = index => {
    selected = index
    observers.mutation.forEach(observer => observer.fire())
  }
  const cleanup = exports.attachDragTabs(root, indicator, index => { selections.push(index); selection(index) })
  const send = (surface, type, props = {}) => {
    const event = new Event(type, { cancelable: true })
    Object.assign(event, { pointerId: 1, isPrimary: true, button: 0, clientX: 40, clientY: 130, detail: 1, ...props })
    surface.dispatchEvent(event)
    return event
  }
  const advance = milliseconds => {
    now += milliseconds
    for (const [id, timer] of [...timers]) {
      if (timer.at <= now) { timers.delete(id); timer.fn() }
    }
  }
  return {
    root, doc, indicator, selections, cleanup, send, buttons, boxes, timers, exports, observers,
    hold: () => advance(220), advance, selection,
    target: value => { target = value }, captured: () => captured,
  }
}

test('the navigation and category bars retain their draggable lens', () => {
  for (const file of ['components/bottom-nav.tsx', 'components/tabs/bucket-list-tab.tsx', 'components/tabs/achievements-tab.tsx']) {
    const source = fs.readFileSync(require.resolve(`../${file}`), 'utf8')
    assert.match(source, /import \{ DraggableTabList \} from '@\/components\/draggable-tab-list'/)
    assert.match(source, /<DraggableTabList[\s\S]*?onSelect=/)
  }
  const component = fs.readFileSync(require.resolve('../components/draggable-tab-list.tsx'), 'utf8')
  assert.match(component, /drag-tab-list plain-tab-panel/)
  assert.match(component, /attachDragTabs/)
})

test('calendar actions are separate round buttons without a draggable or decorative lens', () => {
  const source = fs.readFileSync(require.resolve('../components/tabs/calendar-tab.tsx'), 'utf8')
  const controls = source.slice(source.indexOf('<section className="mt-5"'), source.indexOf('{selectedEvents.length ?'))
  assert.doesNotMatch(source, /DraggableTabList/)
  assert.doesNotMatch(controls, /backdrop-blur|linear-gradient|shadow-\[/)
  assert.equal((controls.match(/size-\[52px\]/g) || []).length, 2)
  assert.match(controls, /className="flex shrink-0 items-center gap-2"/)
  assert.match(controls, /openEventForm\(\)/)
  assert.match(controls, /onClick=\{openManage\}/)
})

test('two-action draggable groups support aria-pressed and commit only on release', () => {
  const f = fixture()
  f.buttons.splice(2)
  f.buttons.forEach((button, index) => {
    button.getAttribute = key => key === 'aria-pressed' ? String(index === 0) : null
  })
  f.observers.mutation.forEach(observer => observer.fire())
  f.send(f.root, 'pointerdown')
  f.hold()
  f.send(f.doc, 'pointermove', { clientX: 100, clientY: 300 })
  assert.equal(f.indicator.hidden, false)
  assert.equal(f.root.dataset.dragPreview, '1')
  assert.deepEqual(f.selections, [])
  f.send(f.doc, 'pointerup', { clientX: 100, clientY: 300 })
  assert.deepEqual(f.selections, [1])
  f.cleanup()
})

test('the glass lens stays visible at the selected tab even before a gesture', () => {
  const f = fixture()
  assert.equal(f.indicator.hidden, false)
  assert.equal(f.root.dataset.glassReady, 'true')
  assert.equal(f.indicator.style['--glass-x'], '0px')
  assert.equal(f.indicator.style['--glass-width'], '60px')
  assert.equal(f.indicator.style['--glass-height'], '60px')
  assert.equal(f.indicator.style['--glass-top'], '0px')
  assert.equal(f.indicator.style['--glass-scale-x'], '1')
  f.cleanup()
})

test('holding slides continuously, previews tabs, and settles to selection on release', () => {
  const f = fixture()
  f.send(f.root, 'pointerdown')
  assert.equal(f.root.dataset.pressed, 'true')
  f.hold()
  assert.equal(f.indicator.hidden, false)
  assert.equal(f.root.dataset.dragging, 'true')
  assert.equal(f.indicator.style['--glass-scale-x'], '1.14')
  assert.equal(f.indicator.style['--glass-scale-y'], '1.12')
  f.send(f.doc, 'pointermove', { clientX: 190 })
  assert.equal(f.indicator.style['--glass-x'], '150px')
  assert.equal(f.root.dataset.dragPreview, '2')
  assert.equal(f.buttons[2].dataset.dragPreview, 'true')
  assert.deepEqual(f.selections, [])
  f.send(f.doc, 'pointerup', { clientX: 220 })
  assert.deepEqual(f.selections, [3])
  assert.equal(f.indicator.hidden, false)
  assert.equal(f.indicator.style['--glass-x'], '180px')
  assert.equal(f.indicator.style['--glass-y'], '0px')
  assert.equal(f.indicator.style['--glass-scale-x'], '1')
  assert.equal(f.root.dataset.settling, 'true')
  assert.equal(f.root.dataset.dragging, undefined)
  assert.equal(f.root.dataset.pressed, undefined)
  assert.equal(f.root.dataset.dragPreview, undefined)
  assert.equal(f.buttons.every(button => button.dataset.dragPreview === undefined), true)
  assert.equal(f.send(f.root, 'click').defaultPrevented, true)
  assert.equal(f.send(f.root, 'click', { detail: 0 }).defaultPrevented, true)
  f.send(f.root, 'keydown')
  assert.equal(f.send(f.root, 'click', { detail: 0 }).defaultPrevented, false)
  f.advance(420)
  assert.equal(f.root.dataset.settling, undefined)
  assert.equal(f.indicator.hidden, false)
  f.cleanup()
})

test('ordinary taps and inactive tabs preserve click behavior and the resting lens', () => {
  const f = fixture()
  f.send(f.root, 'pointerdown')
  f.send(f.doc, 'pointerup')
  f.hold()
  assert.equal(f.root.dataset.dragging, undefined)
  assert.equal(f.indicator.hidden, false)
  assert.equal(f.send(f.root, 'click').defaultPrevented, false)
  f.target(f.buttons[1])
  f.send(f.root, 'pointerdown')
  f.hold()
  assert.equal(f.root.dataset.dragging, undefined)
  assert.equal(f.indicator.hidden, false)
  assert.deepEqual(f.selections, [])
  f.cleanup()
})

test('deliberate horizontal dragging activates without a stationary hold', () => {
  const f = fixture()
  f.send(f.root, 'pointerdown')
  f.send(f.doc, 'pointermove', { clientX: 160 })
  assert.equal(f.root.dataset.dragging, 'true')
  assert.equal(f.indicator.hidden, false)
  f.send(f.doc, 'pointerup', { clientX: 160 })
  assert.deepEqual(f.selections, [2])
  f.cleanup()
})

test('iOS implicit button capture transfer does not cancel an active drag', () => {
  const f = fixture()
  f.send(f.root, 'pointerdown')
  f.hold()
  const lost = new Event('lostpointercapture')
  Object.defineProperty(lost, 'target', { value: f.buttons[0] })
  Object.assign(lost, { pointerId: 1 })
  f.root.dispatchEvent(lost)
  assert.equal(f.root.dataset.dragging, 'true')
  assert.equal(f.indicator.hidden, false)
  f.send(f.doc, 'pointerup', { clientX: 220 })
  assert.deepEqual(f.selections, [3])
  f.cleanup()
})

test('a held lens survives large vertical departures and follows elastically', () => {
  const f = fixture()
  f.send(f.root, 'pointerdown')
  f.hold()
  for (const clientY of [230, 1500, -1500, 130]) {
    const event = f.send(f.doc, 'pointermove', { clientY, clientX: 190 })
    assert.equal(event.defaultPrevented, true)
    assert.equal(f.root.dataset.dragging, 'true')
    assert.equal(f.captured(), true)
    assert.equal(f.indicator.hidden, false)
    const y = Number.parseFloat(f.indicator.style['--glass-y'])
    assert.ok(Math.abs(y) <= 16)
    if (clientY !== 130) assert.equal(Math.sign(y), Math.sign(clientY - 130))
    assert.ok(Number(f.indicator.style['--glass-scale-y']) >= 1.12)
    assert.ok(Math.abs(Number.parseFloat(f.indicator.style['--glass-tilt'])) <= 6)
  }
  f.send(f.doc, 'pointerup', { clientX: 220, clientY: -1500 })
  assert.deepEqual(f.selections, [3])
  assert.equal(f.indicator.hidden, false)
  assert.equal(f.indicator.style['--glass-y'], '0px')
  assert.equal(f.captured(), false)
  f.cleanup()
})

test('early vertical scrolling and pointer cancellation never switch tabs', () => {
  for (const type of ['early', 'cancel', 'capture']) {
    const f = fixture()
    f.send(f.root, 'pointerdown')
    if (type === 'early') f.send(f.doc, 'pointermove', { clientY: 160 })
    f.hold()
    if (type === 'cancel' || type === 'capture') {
      f.send(f.doc, 'pointermove', { clientX: 220 })
      f.send(type === 'capture' ? f.root : f.doc, type === 'capture' ? 'lostpointercapture' : 'pointercancel')
    }
    f.send(f.doc, 'pointerup', { clientX: 250 })
    assert.deepEqual(f.selections, [])
    assert.equal(f.indicator.hidden, false)
    assert.equal(f.indicator.style['--glass-x'], '0px')
    assert.equal(f.root.dataset.dragging, undefined)
    assert.equal(f.doc.listenerCount(), 0)
    f.cleanup()
  }
})

test('edges use bounded rubber banding; release settles exactly to the last tab', () => {
  const f = fixture()
  f.send(f.root, 'pointerdown')
  f.hold()
  f.send(f.doc, 'pointermove', { pointerId: 2, clientX: 999 })
  assert.equal(f.indicator.style['--glass-x'], '0px')
  f.send(f.doc, 'pointermove', { clientX: -999 })
  assert.ok(Number.parseFloat(f.indicator.style['--glass-x']) >= -12)
  assert.equal(f.root.dataset.dragPreview, '0')
  f.send(f.doc, 'pointermove', { clientX: 999 })
  assert.ok(Number.parseFloat(f.indicator.style['--glass-x']) <= 252)
  assert.equal(f.root.dataset.dragPreview, '4')
  f.send(f.doc, 'pointerup', { clientX: 999 })
  assert.deepEqual(f.selections, [4])
  assert.equal(f.indicator.style['--glass-x'], '240px')
  f.cleanup()
  assert.equal(f.exports.nearestTabIndex([30, 90, 150], -100), 0)
})

test('aria selection and layout changes keep the persistent lens aligned', () => {
  const f = fixture()
  f.selection(3)
  assert.equal(f.indicator.style['--glass-x'], '180px')
  assert.equal(f.root.dataset.settling, 'true')
  f.boxes[3].width = 75
  f.boxes[3].left = 205
  f.observers.resize[0].fire()
  assert.equal(f.indicator.style['--glass-x'], '195px')
  assert.equal(f.indicator.style['--glass-width'], '75px')
  assert.equal(f.observers.resize[0].targets.length, 6)
  assert.deepEqual(Array.from(f.observers.mutation[0].targets[0].options.attributeFilter), ['aria-selected', 'aria-pressed'])
  f.cleanup()
})

test('lens width interpolates continuously between differently sized tabs', () => {
  const f = fixture()
  Object.assign(f.boxes[0], { left: 10, width: 40 })
  Object.assign(f.boxes[1], { left: 50, width: 80 })
  f.observers.resize[0].fire()
  f.send(f.root, 'pointerdown')
  f.hold()
  f.send(f.doc, 'pointermove', { clientX: 70 })
  assert.equal(f.indicator.style['--glass-width'], '60px')
  assert.equal(f.indicator.style['--glass-x'], '20px')
  f.cleanup()
})

test('a new tap clears only ghost-click suppression and disabled tabs cannot drag', () => {
  const f = fixture()
  f.send(f.root, 'pointerdown')
  f.hold()
  f.send(f.doc, 'pointerup', { clientX: 220 })
  assert.equal(f.send(f.root, 'click').defaultPrevented, true)
  f.target(f.buttons[1])
  f.send(f.root, 'pointerdown')
  assert.equal(f.send(f.root, 'click').defaultPrevented, false)
  f.target(f.buttons[3])
  f.buttons[3].disabled = true
  f.send(f.root, 'pointerdown')
  f.hold()
  assert.equal(f.root.dataset.dragging, undefined)
  f.cleanup()
})

test('cleanup releases capture, observers, listeners, timers and lens variables', () => {
  const f = fixture()
  f.send(f.root, 'pointerdown')
  f.hold()
  f.send(f.doc, 'pointermove', { clientX: 220, clientY: 900 })
  f.cleanup()
  f.hold()
  assert.equal(f.indicator.hidden, true)
  assert.equal(f.indicator.style['--glass-x'], undefined)
  assert.equal(f.root.dataset.glassReady, undefined)
  assert.equal(f.root.dataset.dragging, undefined)
  assert.equal(f.root.dataset.pressed, undefined)
  assert.equal(f.root.dataset.settling, undefined)
  assert.equal(f.captured(), false)
  assert.equal(f.timers.size, 0)
  assert.equal(f.doc.listenerCount(), 0)
  assert.equal(f.root.listenerCount(), 0)
  assert.equal(f.observers.mutation[0].connected, false)
  assert.equal(f.observers.resize[0].connected, false)
  f.send(f.doc, 'pointerup', { clientX: 220 })
  assert.deepEqual(f.selections, [])
})
