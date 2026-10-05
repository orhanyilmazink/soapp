const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const exportsObject = {}

test('standalone shell includes the status bar and anchors the dock above the Home indicator', () => {
  const css = fs.readFileSync(require.resolve('../app/globals.css'), 'utf8')
  const nav = fs.readFileSync(require.resolve('../components/bottom-nav.tsx'), 'utf8')
  const shell = css.match(/\.app-shell\s*\{([^}]+)\}/)[1]
  assert.match(css, /@media \(display-mode: standalone\)\s*\{\s*:root \{ --app-viewport-height: 100vh; \}/)
  assert.match(shell, /position: absolute !important/)
  assert.match(shell, /height: var\(--app-viewport-height\)/)
  assert.match(nav, /className="bottom-nav-dock absolute inset-x-0 bottom-0/)
  assert.match(css, /padding-bottom: max\(env\(safe-area-inset-bottom, 0px\), 0\.75rem\)/)
})
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../lib/viewport-dock.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsObject })

function fixture({ layoutHeight = 956, visualHeight = 894, offsetTop = 0 } = {}) {
  const host = new EventTarget()
  const viewport = new EventTarget()
  Object.assign(viewport, { height: visualHeight, offsetTop })
  const frames = new Map()
  let id = 0
  const style = { removeProperty(key) { delete this[key] } }
  const node = { style }
  Object.assign(host, {
    innerHeight: 894,
    document: { documentElement: { clientHeight: layoutHeight } },
    visualViewport: viewport,
    requestAnimationFrame: fn => { frames.set(++id, fn); return id },
    cancelAnimationFrame: key => frames.delete(key),
  })
  const cleanup = exportsObject.attachViewportDock(node, host)
  const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()) }
  return { host, viewport, node, cleanup, frames, flush }
}

test('a 62pt iPhone status-bar difference never moves or hides the shell-anchored dock', () => {
  const f = fixture()
  f.flush()
  assert.equal(f.node.style.visibility, '')
  assert.equal(f.node.style.transform, undefined)
  f.viewport.offsetTop = 62
  f.viewport.dispatchEvent(new Event('scroll'))
  f.flush()
  assert.equal(f.node.style.visibility, '')
  assert.equal(f.node.style.transform, undefined)
  f.cleanup()
})

test('software keyboard hides the dock and closing it restores the shell anchor', () => {
  const f = fixture()
  f.viewport.height = 560
  f.viewport.dispatchEvent(new Event('resize'))
  f.flush()
  assert.equal(f.node.style.visibility, 'hidden')
  f.viewport.height = 894
  f.viewport.dispatchEvent(new Event('resize'))
  f.flush()
  assert.equal(f.node.style.visibility, '')
  assert.equal(f.node.style.transform, undefined)
  f.cleanup()
  assert.equal(f.frames.size, 0)
  assert.equal(f.node.style.visibility, undefined)
})
