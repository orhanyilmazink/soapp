const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const context = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../lib/pinch-zoom.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, context)

test('pinch zoom is blocked without cancelling single-finger scrolling or taps', () => {
  const target = new EventTarget()
  const cleanup = context.exports.preventPinchZoom(target)
  for (const type of ['touchstart', 'touchmove']) {
    for (const count of [0, 1, 2, 3]) {
      const event = new Event(type, { cancelable: true })
      event.touches = Array(count).fill({})
      target.dispatchEvent(event)
      assert.equal(event.defaultPrevented, count > 1)
    }
  }
  for (const type of ['gesturestart', 'gesturechange']) {
    const event = new Event(type, { cancelable: true })
    target.dispatchEvent(event)
    assert.equal(event.defaultPrevented, true)
  }
  const click = new Event('click', { cancelable: true })
  target.dispatchEvent(click)
  assert.equal(click.defaultPrevented, false)
  cleanup()
  for (const type of ['gesturestart', 'gesturechange', 'touchstart', 'touchmove']) {
    const event = new Event(type, { cancelable: true })
    event.touches = [{}, {}]
    target.dispatchEvent(event)
    assert.equal(event.defaultPrevented, false)
  }
})

test('zoom limits and touch rules cover login, app and portal dialogs', () => {
  const layout = fs.readFileSync(require.resolve('../app/layout.tsx'), 'utf8')
  const css = fs.readFileSync(require.resolve('../app/globals.css'), 'utf8')
  assert.match(layout, /maximumScale: 1/)
  assert.match(layout, /userScalable: false/)
  assert.match(layout, /<PinchZoomLock \/>/)
  assert.match(css, /html, body, body \*\s*\{\s*touch-action: pan-x pan-y;/)
})
