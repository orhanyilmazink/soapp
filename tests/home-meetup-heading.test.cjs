const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function load(file, overrides = {}) {
  const source = ts.transpileModule(fs.readFileSync(require.resolve(`../${file}`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const context = { exports: {}, require: id => id in overrides ? overrides[id] : require(id) }
  vm.runInNewContext(source, context)
  return context.exports
}

const language = load('lib/language.tsx')
for (const lang of ['tr', 'en']) {
  test(`meetup heading is centered, keeps existing typography and replaces the badge (${lang})`, () => {
    const { HomeTab } = load('components/tabs/home-tab.tsx', {
      '@/lib/language': { useLanguage: () => ({ t: text => language.translate(lang, text), locale: lang === 'tr' ? 'tr-TR' : 'en-GB' }) },
      '@/components/metal-gears': { MetalGears: () => null },
      '@/lib/use-now': { useNow: () => 1, splitDuration: () => ({ days: 1, hours: 2, minutes: 3, seconds: 4 }) },
      '@/lib/shared-app-state': { useSharedAppState: () => ({ state: {
        firstName: 'Ada', secondName: 'Can', togetherSince: '2026-01-01', meetupDate: '2026-10-10', meetupTime: '11:30',
      }, updateSharedState() {} }) },
    })
    const html = renderToStaticMarkup(React.createElement(HomeTab, { onOpenSettings() {} }))
    const heading = html.match(/<h2 id="meetup-countdown-title" class="([^"]+)">([^<]+)<\/h2>/)
    assert.ok(heading)
    assert.equal(heading[2], lang === 'tr' ? 'Bir dahaki buluşmaya kalan süre' : 'Time until our next meetup')
    for (const style of ['text-center', 'text-[10px]', 'font-black', 'uppercase', 'tracking-[0.38em]', 'text-zinc-500']) {
      assert.ok(heading[1].includes(style))
    }
    assert.ok(html.includes('aria-labelledby="meetup-countdown-title"'))
    assert.ok(!html.includes('>Kalan süre</span>') && !html.includes('>Time left</span>'))
    assert.ok(html.includes('type="date"') && html.includes('type="time"'))
  })
}
