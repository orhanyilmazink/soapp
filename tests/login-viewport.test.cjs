const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const code = ts.transpileModule(fs.readFileSync(require.resolve('../lib/login-viewport.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText
const exportsObject = {}
vm.runInNewContext(code, { exports: exportsObject })

function fixture() {
  const viewport = new EventTarget()
  Object.assign(viewport, { height: 500, offsetTop: 40 })
  const host = new EventTarget()
  const frames = new Map()
  const timers = new Map()
  let id = 0
  let scrolls = 0
  Object.assign(host, {
    visualViewport: viewport, innerHeight: 844,
    scrollTo: () => scrolls++,
    requestAnimationFrame: (fn) => { frames.set(++id, fn); return id },
    cancelAnimationFrame: (key) => frames.delete(key),
    setTimeout: (fn) => { timers.set(++id, fn); return id },
    clearTimeout: (key) => timers.delete(key),
  })
  const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()) }
  return { host, viewport, frames, timers, flush, scrolls: () => scrolls }
}

test('keyboard viewport settles before fixed navigation is left alone', () => {
  const f = fixture()
  exportsObject.restoreLoginViewport(f.host)
  f.flush()
  assert.ok(f.timers.size > 0)
  f.viewport.height = 844
  f.viewport.offsetTop = 0
  f.viewport.dispatchEvent(new Event('resize'))
  f.flush()
  assert.equal(f.timers.size, 0)
  const count = f.scrolls()
  f.viewport.dispatchEvent(new Event('scroll'))
  assert.equal(f.scrolls(), count)
})

test('new user interaction cancels viewport resets immediately', () => {
  const f = fixture()
  const cleanup = exportsObject.restoreLoginViewport(f.host)
  f.host.dispatchEvent(new Event('pointerdown'))
  const count = f.scrolls()
  f.flush()
  f.viewport.dispatchEvent(new Event('resize'))
  assert.equal(f.scrolls(), count)
  assert.equal(f.timers.size, 0)
  cleanup()
  assert.equal(f.frames.size, 0)
})

test('cleanup and timeout remove all pending work', () => {
  for (const timeout of [false, true]) {
    const f = fixture()
    const cleanup = exportsObject.restoreLoginViewport(f.host)
    if (timeout) [...f.timers.values()][0]()
    else cleanup()
    assert.equal(f.frames.size, 0)
    assert.equal(f.timers.size, 0)
    const count = f.scrolls()
    f.viewport.dispatchEvent(new Event('resize'))
    assert.equal(f.scrolls(), count)
  }
})
