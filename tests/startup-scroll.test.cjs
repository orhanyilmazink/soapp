const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const read = file => fs.readFileSync(require.resolve(`../${file}`), 'utf8')

test('saved theme is applied by a synchronous head script before first paint', () => {
  const layout = read('app/layout.tsx')
  assert.match(layout, /<script id="theme-initialization" dangerouslySetInnerHTML/)
  const script = layout.match(/const themeInitialization = `([\s\S]*?)`/)[1]
  for (const [saved, systemDark, expected] of [['dark', false, 'dark'], ['light', true, 'light'], [null, true, 'dark']]) {
    const root = { dataset: {} }
    let color
    vm.runInNewContext(script, {
      localStorage: { getItem: () => saved },
      window: { matchMedia: () => ({ matches: systemDark }) },
      document: { documentElement: root, querySelectorAll: () => [{ setAttribute: (_, value) => { color = value } }] },
    })
    assert.equal(root.dataset.theme, expected)
    assert.equal(color, expected === 'dark' ? '#190d15' : '#fff4f8')
  }
})

test('login starts with welcome instead of a loading interstitial', () => {
  const app = read('components/birthday-app.tsx')
  assert.ok(!app.includes('t("Açılıyor")') && !app.includes('t("Bir saniye...")'))
  assert.ok(app.indexOf('setIsReady(true)') < app.indexOf('PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()'))
  assert.match(app, /disabled=\{!isReady \|\| isBiometricBusy\}/)
})

test('login keeps its initial viewport and loads local authentication before paint', () => {
  const app = read('components/birthday-app.tsx')
  const css = read('app/globals.css')
  assert.match(css, /--login-viewport-height: 100%;/)
  assert.match(app, /useLayoutEffect\(\(\) => \{\s*let active = true\s*const storedCredential/)
  assert.match(app, /if \(!visualViewport \|\| !card \|\| document\.activeElement !== loginInput\) return/)
  assert.ok(!app.includes('setLockedViewportHeight(window.innerHeight)'))
  assert.match(css, /\.login-screen\s*\{\s*position: fixed;\s*inset: 0;/)
  const faceButton = app.slice(app.indexOf('onClick={unlockWithBiometric}'), app.indexOf('<ScanFace'))
  assert.ok(!faceButton.includes('disabled:opacity-50'))
  assert.match(faceButton, /isBiometricBusy \? 'opacity-50' : ''/)
})

test('calendar actions use white icons without selected pink borders or visible labels', () => {
  const calendar = read('components/tabs/calendar-tab.tsx')
  assert.match(calendar, /<Pencil className="size-5" aria-hidden="true"/)
  assert.match(calendar, /border-border bg-background\/70 text-white/)
})

test('document is locked, content scrolls independently and scrollbars are hidden', () => {
  const css = read('app/globals.css')
  assert.match(css, /html,\s*body\s*\{[^}]*overflow: hidden/)
  assert.match(css, /\.app-shell\s*\{[^}]*position: absolute !important/)
  assert.match(css, /\.app-content\s*\{[^}]*overflow-y: auto/)
  assert.match(css, /\* \{ scrollbar-width: none; \}/)
  assert.match(css, /\*::-webkit-scrollbar \{ display: none/)
  const app = read('components/birthday-app.tsx')
  assert.equal((app.match(/contentRef\.current\?\.scrollTo/g) || []).length, 3)
  assert.match(app, /<main\s+ref=\{contentRef\}/)
})
