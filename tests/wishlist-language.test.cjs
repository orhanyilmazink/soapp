const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function load(relative, overrides = {}, extra = '', globals = {}) {
  const filename = path.join(__dirname, '..', relative)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8') + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const context = { exports: {}, require: (id) => id in overrides ? overrides[id] : require(id), crypto: require('node:crypto'), ...globals }
  vm.runInNewContext(source, context, { filename })
  return context.exports
}
const language = load('lib/language.tsx')
const languageHook = (lang) => ({ t: (text, values) => language.translate(lang, text, values), language: lang, locale: lang === 'tr' ? 'tr-TR' : 'en-GB' })
const calendarLinks = load('lib/calendar-links.ts')
const shared = load('lib/shared-app-state.tsx', {
  '@/lib/supabase': { supabase: null },
  '@/lib/bucket-list': { categories: [] },
  '@/lib/language': { useLanguage: () => languageHook('tr') },
  '@/lib/calendar-links': calendarLinks,
}, '\nexports.normalize = normalizeAppData; exports.merge = mergeConcurrentChanges;')
const base = () => shared.normalize({ version: 1 })
const wish = (id, owner = 'first') => ({ id, owner, text: 'Bir hayal', done: false })
const plain = (value) => JSON.parse(JSON.stringify(value))

test('older shared records migrate to empty wishlists without retaining the removed message', () => {
  const data = shared.normalize({ version: 1, firstName: 'Ada', specialMessage: 'removed', done: ['x'] })
  assert.equal(data.firstName, 'Ada')
  assert.deepEqual(plain(data.done), ['x'])
  assert.deepEqual(plain(data.wishes), [])
  assert.equal(Object.hasOwn(data, 'specialMessage'), false)
})
test('legacy push subscriptions keep meetup enabled and calendar reminders opt in', () => {
  const subscription = {
    id: 'https://push.example/subscription',
    endpoint: 'https://push.example/subscription',
    expirationTime: null,
    keys: { auth: 'auth', p256dh: 'key' },
  }
  const data = shared.normalize({ pushSubscriptions: [subscription] })
  assert.deepEqual(plain(data.pushSubscriptions[0].preferences), { meetup: true, calendar: false })
})
test('wish normalization validates owner, trims input and bounds content', () => {
  const data = shared.normalize({ wishes: [wish('a'), { ...wish('b'), owner: 'invalid' }, { ...wish('c'), text: '  ' }, { ...wish('d'), text: 'x'.repeat(300) }] })
  assert.equal(data.wishes.length, 2)
  assert.equal(data.wishes[1].text.length, 240)
  assert.equal(data.wishes[0].priority, false)
  assert.equal(shared.normalize({ wishes: [{ ...wish('p'), priority: true }] }).wishes[0].priority, true)
  assert.equal(shared.normalize({ wishes: [{ ...wish('p'), priority: 'true' }] }).wishes[0].priority, false)
})
test('priority and completion on different phones merge without losing either change', () => {
  const initial = { ...base(), wishes: [{ ...wish('a'), priority: false }] }
  const local = { ...initial, wishes: [{ ...initial.wishes[0], priority: true }] }
  const remote = { ...initial, wishes: [{ ...initial.wishes[0], done: true }] }
  const result = shared.merge(initial, local, remote)
  assert.equal(result.wishes[0].priority, true)
  assert.equal(result.wishes[0].done, true)
  const unstarred = shared.merge(result, { ...result, wishes: [{ ...result.wishes[0], priority: false }] }, result)
  assert.equal(unstarred.wishes[0].priority, false)
  assert.equal(unstarred.wishes[0].done, true)
})
test('simultaneous additions on two phones preserve both wishlists', () => {
  const initial = base()
  const result = shared.merge(initial, { ...initial, wishes: [wish('left')] }, { ...initial, wishes: [wish('right', 'second')] })
  assert.deepEqual(new Set(result.wishes.map((item) => item.id)), new Set(['left', 'right']))
})
test('completion, removal, renames and unrelated remote edits merge independently', () => {
  const initial = { ...base(), wishes: [wish('a'), wish('b', 'second')] }
  const local = { ...initial, firstName: 'New name', wishes: [{ ...wish('a'), done: true }] }
  const remote = { ...initial, meetupTime: '12:30', wishes: [...initial.wishes, wish('c', 'second')] }
  const result = shared.merge(initial, local, remote)
  assert.equal(result.firstName, 'New name')
  assert.equal(result.meetupTime, '12:30')
  assert.deepEqual(plain(result.wishes.map((item) => item.id).sort()), ['a', 'c'])
  assert.equal(result.wishes.find((item) => item.id === 'a').done, true)
  assert.equal(result.wishes.find((item) => item.id === 'a').owner, 'first')
})
test('English translates templates without changing personal names or wish text', () => {
  assert.equal(language.translate('en', 'İstekler'), 'Wishlist')
  assert.equal(language.translate('tr', 'İstekler'), 'İstekler')
  assert.equal(language.translate('en', '{name} için istek', { name: 'Şevval' }), 'Wish for Şevval')
  assert.equal(language.translate('en', '{text} isteğini sil', { text: 'İstanbul gezisi' }), 'Delete wish: İstanbul gezisi')
})
test('bottom menu orders Wishlist third and Calendar last in both languages', () => {
  for (const lang of ['tr', 'en']) {
    const { BottomNav } = load('components/bottom-nav.tsx', {
      '@/lib/viewport-dock': load('lib/viewport-dock.ts'),
      '@/components/draggable-tab-list': load('components/draggable-tab-list.tsx', {
        '@/lib/drag-tabs': load('lib/drag-tabs.ts'),
        '@/lib/glass-optics': load('lib/glass-optics.ts'),
        '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
      }),
      '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
      '@/lib/language': { useLanguage: () => languageHook(lang) },
    })
    const markup = renderToStaticMarkup(React.createElement(BottomNav, { active: 'wishlist', onChange() {} }))
    assert.deepEqual([...markup.matchAll(/id="tab-([^"]+)"/g)].map((match) => match[1]), ['home', 'todo', 'wishlist', 'achievements', 'calendar'])
    assert.ok(markup.includes(lang === 'en' ? 'Wishlist' : 'İstekler'))
    assert.ok(markup.includes('lucide-shopping-basket'))
    assert.ok(!markup.includes('Özel Mesaj'))
  }
})
function elements(node) {
  if (!node || typeof node !== 'object') return []
  const children = React.Children.toArray(node.props?.children)
  return [node, ...children.flatMap(elements)]
}
test('wish forms add to the correct owner; completion and removal affect only the selected wish', () => {
  let state = { ...base(), wishes: [wish('other', 'second')] }
  let draft = '  Paris gezisi  '
  const module = load('components/tabs/wishlist-tab.tsx', {
    react: { ...React, useState: (initial) => typeof initial === 'string' ? [draft, (value) => { draft = value }] : [[], () => {}] },
    '@/lib/shared-app-state': { useSharedAppState: () => ({ state, updateSharedState: (patch) => { state = { ...state, ...patch } } }) },
    '@/lib/language': { useLanguage: () => languageHook('tr') },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    '@/components/section-header': { SectionHeader: () => null },
    '@/components/progress-summary': { ProgressSummary: () => null },
  }, '\nexports.WishColumn = WishColumn;')
  const render = () => elements(module.WishColumn({ owner: 'first', name: 'Ada' }))
  const addButton = render().find((node) => node.props?.['aria-label'] === 'İstek ekle')
  assert.match(addButton.props.className, /size-11/)
  assert.match(addButton.props.className, /rounded-full/)
  assert.match(addButton.props.className, /border-border/)
  assert.match(render().find((node) => node.type === 'input').props.className, /flex-1/)
  render().find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.equal(state.wishes.length, 2)
  assert.equal(state.wishes[1].owner, 'first')
  assert.equal(state.wishes[1].text, 'Paris gezisi')
  assert.equal(draft, '')
  render().find((node) => node.props?.['aria-pressed'] === false).props.onClick()
  assert.equal(state.wishes[1].done, true)
  assert.equal(state.wishes[0].done, false)
  render().find((node) => node.props?.['aria-label'] === 'Paris gezisi isteğini sil').props.onClick()
  assert.deepEqual(plain(state.wishes.map((item) => item.id)), ['other'])
  draft = '   '
  render().find((node) => node.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.equal(state.wishes.length, 1)
})

test('priority stars reorder only their owner, preserve completion ordering and undo cleanly', () => {
  let state = { ...base(), wishes: [
    { ...wish('done'), text: 'Done', done: true, priority: true },
    { ...wish('normal'), text: 'Normal' },
    { ...wish('star'), text: 'Star' },
    wish('other', 'second'),
  ] }
  const module = load('components/tabs/wishlist-tab.tsx', {
    react: { ...React, useState: (initial) => [initial, () => {}] },
    '@/lib/shared-app-state': { useSharedAppState: () => ({ state, updateSharedState: (patch) => { state = { ...state, ...patch } } }) },
    '@/lib/language': { useLanguage: () => languageHook('tr') },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    '@/components/section-header': { SectionHeader: () => null },
    '@/components/progress-summary': { ProgressSummary: () => null },
  }, '\nexports.WishColumn = WishColumn;')
  const render = () => elements(module.WishColumn({ owner: 'first', name: 'Ada' }))
  const order = () => render().filter((node) => node.type === 'li').map((node) => node.key.replace(/^\.\$/, ''))
  const click = (label) => render().find((node) => node.props?.['aria-label'] === label).props.onClick()
  assert.deepEqual(plain(order()), ['normal', 'star', 'done'])
  click('Star isteğini öncelikli yap')
  assert.deepEqual(plain(order()), ['star', 'normal', 'done'])
  assert.equal(render().find((node) => node.props?.['aria-label'] === 'Star isteğinin önceliğini kaldır').props['aria-pressed'], true)
  click('Star isteğini tamamla')
  assert.deepEqual(plain(order()), ['normal', 'done', 'star'])
  click('Star isteğini geri al')
  assert.deepEqual(plain(order()), ['star', 'normal', 'done'])
  click('Star isteğinin önceliğini kaldır')
  assert.deepEqual(plain(order()), ['normal', 'star', 'done'])
  assert.deepEqual(plain(state.wishes.map((item) => item.id)), ['done', 'normal', 'star', 'other'])
  assert.equal(state.wishes[3].priority, undefined)
  assert.equal(language.translate('en', '{text} isteğini öncelikli yap', { text: 'Star' }), 'Prioritize wish: Star')
})

test('deleted wishes undo one at a time with their flags and order, without losing newer wishes', () => {
  const original = { ...wish('a'), text: 'Öncelikli', done: true, priority: true }
  let state = { ...base(), wishes: [original, { ...wish('b'), text: 'İkinci' }, wish('other', 'second')] }
  const slots = []
  let index = 0
  const module = load('components/tabs/wishlist-tab.tsx', {
    react: { ...React, useState: (initial) => {
      const current = index++
      if (!(current in slots)) slots[current] = initial
      return [slots[current], (value) => { slots[current] = typeof value === 'function' ? value(slots[current]) : value }]
    } },
    '@/lib/shared-app-state': { useSharedAppState: () => ({ state, updateSharedState: (patch) => { state = { ...state, ...patch } } }) },
    '@/lib/language': { useLanguage: () => languageHook('tr') },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
    '@/components/section-header': { SectionHeader: () => null },
    '@/components/progress-summary': { ProgressSummary: () => null },
  }, '\nexports.WishColumn = WishColumn;')
  const render = () => { index = 0; return elements(module.WishColumn({ owner: 'first', name: 'Ada' })) }
  const click = (label) => render().find((node) => node.props?.['aria-label'] === label).props.onClick()
  click('Öncelikli isteğini sil')
  click('İkinci isteğini sil')
  assert.deepEqual(plain(state.wishes.map((item) => item.id)), ['other'])
  assert.ok(render().some((node) => node.props?.role === 'status' && node.props.children === '2 istek silindi.'))
  state = { ...state, wishes: [...state.wishes, wish('new')] }
  click('İkinci isteğini geri getir')
  click('Öncelikli isteğini geri getir')
  assert.deepEqual(plain(state.wishes.map((item) => item.id)), ['a', 'b', 'other', 'new'])
  assert.deepEqual(plain(state.wishes[0]), original)
  assert.equal(render().some((node) => node.props?.role === 'status'), false)
  click('Öncelikli isteğini sil')
  state = { ...state, wishes: [...state.wishes, { ...original, text: 'Diğer telefonda geri geldi' }] }
  click('Öncelikli isteğini geri getir')
  assert.equal(state.wishes.filter((item) => item.id === 'a').length, 1)
  assert.equal(state.wishes.find((item) => item.id === 'a').text, 'Diğer telefonda geri geldi')
  assert.equal(language.translate('en', 'Geri al'), 'Undo')
  const nodes = render()
  const cardText = nodes.find((node) => node.type === 'p' && node.props.children === 'Diğer telefonda geri geldi')
  assert.ok(cardText.props.className.includes('text-center'))
  for (const label of ['Diğer telefonda geri geldi isteğinin önceliğini kaldır', 'Diğer telefonda geri geldi isteğini sil']) {
    assert.match(nodes.find((node) => node.props?.['aria-label'] === label).props.className, /\bborder\b/)
  }
})

test('language switches immediately, persists locally and restores on reopen', () => {
  const storage = new Map()
  let chosen = 'tr'
  let effects = []
  const document = { documentElement: { lang: 'tr' } }
  const mockReact = {
    ...React,
    useState: () => [chosen, (value) => { chosen = value }],
    useEffect: (effect) => effects.push(effect),
    useCallback: (callback) => callback,
    useMemo: (factory) => factory(),
  }
  const { LanguageProvider } = load('lib/language.tsx', { react: mockReact }, '', {
    document,
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  })
  const render = () => {
    const provider = LanguageProvider({ children: null })
    const currentEffects = effects
    effects = []
    for (const effect of currentEffects) effect()
    return provider.props.value
  }
  render().setLanguage('en')
  const english = render()
  assert.equal(english.t('İstekler'), 'Wishlist')
  assert.equal(document.documentElement.lang, 'en')
  assert.equal(storage.get('soapp-language'), 'en')
  chosen = 'tr'
  render()
  assert.equal(render().language, 'en')
  render().setLanguage('tr')
  assert.equal(render().t('İstekler'), 'İstekler')
  assert.equal(storage.get('soapp-language'), 'tr')
})
