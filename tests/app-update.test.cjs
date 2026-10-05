const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const source = ts.transpileModule(fs.readFileSync(require.resolve('../lib/app-update.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const settle = () => new Promise((resolve) => setImmediate(resolve))

function harness() {
  let now = 1_000_000
  let timerId = 0
  const timers = new Map()
  const storage = new Map()
  const requests = []
  const events = []
  let reloads = 0
  let version = 'v.0.1.0.12'
  let failure = false
  let dialog = false
  let busy = false
  class FakeElement {
    constructor(editing) { this.editing = editing }
    matches() { return this.editing }
    closest() { return null }
  }
  class FakeCustomEvent extends Event {
    constructor(type, options) { super(type); this.detail = options.detail }
  }
  const document = Object.assign(new EventTarget(), {
    visibilityState: 'visible', activeElement: new FakeElement(false),
    querySelector(selector) { return selector.includes('dialog') ? (dialog ? {} : null) : (busy ? {} : null) },
  })
  const targetWindow = Object.assign(new EventTarget(), {
    document,
    navigator: { onLine: true },
    location: { reload() { reloads++; events.push('reload') } },
    sessionStorage: {
      getItem(key) { return storage.get(key) ?? null },
      setItem(key, value) { storage.set(key, value) },
    },
    async fetch(url, options) {
      requests.push({ url, ...options })
      if (failure) throw new Error('Offline')
      return { ok: true, async json() { return { version } } }
    },
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, at: now + delay }); return id },
    clearTimeout(id) { timers.delete(id) },
    setInterval(callback, delay) { const id = ++timerId; timers.set(id, { callback, at: now + delay, interval: delay }); return id },
    clearInterval(id) { timers.delete(id) },
  })
  targetWindow.addEventListener('soapp:before-update', (event) => events.push(event.detail.version))
  const context = { exports: {}, Element: FakeElement, CustomEvent: FakeCustomEvent, AbortController, Date: class extends Date { static now() { return now } } }
  vm.runInNewContext(source, context)
  const stop = context.exports.startAppUpdateMonitor('v.0.1.0.12', targetWindow)
  return {
    stop, document, targetWindow, requests, events, storage,
    get reloads() { return reloads },
    set version(value) { version = value },
    set failure(value) { failure = value },
    set dialog(value) { dialog = value },
    set busy(value) { busy = value },
    editing(value) { document.activeElement = new FakeElement(value) },
    event(type) { document.dispatchEvent(new Event(type)) },
    async advance(duration) {
      await settle()
      const end = now + duration
      while (true) {
        const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
        if (!next) break
        const [id, timer] = next
        now = timer.at
        if (timer.interval) timer.at += timer.interval
        else timers.delete(id)
        timer.callback()
        await settle()
      }
      now = end
      await settle()
    },
  }
}

test('unchanged versions poll every 15 seconds without refreshing', async () => {
  const app = harness()
  await app.advance(30_000)
  assert.equal(app.requests.length, 3)
  assert.equal(app.requests[0].url, '/api/version')
  assert.equal(app.requests[0].cache, 'no-store')
  assert.equal(app.reloads, 0)
  app.stop()
})

test('new deployment preserves the session before refreshing exactly once', async () => {
  const app = harness()
  app.version = 'v.0.1.0.13'
  await app.advance(45_000)
  assert.equal(app.reloads, 1)
  assert.deepEqual(app.events, ['v.0.1.0.13', 'reload'])
  app.stop()
})

test('typing defers refreshing until the field loses focus and the idle delay passes', async () => {
  const app = harness()
  app.editing(true)
  app.version = 'v.0.1.0.13'
  await app.advance(15_000)
  assert.equal(app.reloads, 0)
  app.editing(false)
  app.event('focusout')
  await app.advance(2_999)
  assert.equal(app.reloads, 0)
  await app.advance(1)
  assert.equal(app.reloads, 1)
  app.stop()
})

test('open dialogs and biometric operations block automatic refresh', async () => {
  const app = harness()
  app.dialog = true
  app.version = 'v.0.1.0.13'
  await app.advance(15_000)
  assert.equal(app.reloads, 0)
  app.dialog = false
  app.busy = true
  await app.advance(15_000)
  assert.equal(app.reloads, 0)
  app.busy = false
  await app.advance(15_000)
  assert.equal(app.reloads, 1)
  app.stop()
})

test('background tabs stop polling and check immediately on return', async () => {
  const app = harness()
  await app.advance(0)
  app.document.visibilityState = 'hidden'
  app.version = 'v.0.1.0.13'
  await app.advance(30_000)
  assert.equal(app.requests.length, 1)
  app.document.visibilityState = 'visible'
  app.event('visibilitychange')
  await app.advance(0)
  assert.equal(app.reloads, 1)
  app.stop()
})

test('failed requests, invalid responses, and offline state leave the app intact', async () => {
  const app = harness()
  app.failure = true
  await app.advance(15_000)
  assert.equal(app.reloads, 0)
  app.failure = false
  app.version = undefined
  await app.advance(15_000)
  assert.equal(app.reloads, 0)
  app.version = 'v.0.1.0.13'
  app.targetWindow.navigator.onLine = false
  await app.advance(15_000)
  assert.equal(app.reloads, 0)
  app.targetWindow.navigator.onLine = true
  app.targetWindow.dispatchEvent(new Event('online'))
  await app.advance(0)
  assert.equal(app.reloads, 1)
  app.stop()
})

test('release validation accepts the deployed numeric format, not malformed or legacy versions', async () => {
  const app = harness()
  for (const value of ['v0.1.0+new', 'v.0.1.0', 'v.0.1.0.13x', 'v.0.1.0.-1', '', null]) {
    app.version = value
    await app.advance(15_000)
    assert.equal(app.reloads, 0)
  }
  app.version = 'v.0.1.0.13'
  await app.advance(15_000)
  assert.equal(app.reloads, 1)
  assert.deepEqual(app.events, ['v.0.1.0.13', 'reload'])
  app.stop()
})

test('a stale cached page cannot trigger an immediate refresh loop', async () => {
  const app = harness()
  app.storage.set('soapp-update-reload', JSON.stringify({ from: 'v.0.1.0.12', to: 'v.0.1.0.13', at: 1_000_000 }))
  app.version = 'v.0.1.0.13'
  await app.advance(30_000)
  assert.equal(app.reloads, 0)
  app.stop()
})

test('cleanup cancels requests, timers, and event listeners', async () => {
  const app = harness()
  app.stop()
  app.version = 'v.0.1.0.13'
  await app.advance(45_000)
  app.event('visibilitychange')
  app.targetWindow.dispatchEvent(new Event('online'))
  await app.advance(0)
  assert.equal(app.requests.length, 1)
  assert.equal(app.reloads, 0)
  assert.equal(app.requests[0].signal.aborted, true)
})
