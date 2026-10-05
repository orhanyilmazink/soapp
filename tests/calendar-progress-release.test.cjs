const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const root = require('node:path').join(__dirname, '..')
const plain = (value) => JSON.parse(JSON.stringify(value))
function load(file, overrides = {}, extra = '') {
  const source = ts.transpileModule(fs.readFileSync(root + '/' + file, 'utf8') + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const context = { exports: {}, require: (id) => id in overrides ? overrides[id] : require(id) }
  vm.runInNewContext(source, context)
  return context.exports
}
const links = load('lib/calendar-links.ts')
const language = { t: (text, params = {}) => text.replace(/\{(\w+)\}/g, (_, key) => params[key]), language: 'tr', locale: 'tr-TR' }
const source = fs.readFileSync(root + '/components/tabs/calendar-tab.tsx', 'utf8')
const pureCalendar = source.slice(source.indexOf('type CalendarEvent'), source.indexOf('export function CalendarTab'))
const context = { exports: {} }
vm.runInNewContext(ts.transpileModule(pureCalendar + '\nexports.upcoming = upcomingCalendarEvents;', {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, context)
const upcoming = (events, today = '2026-10-04', birthdays = []) => context.exports.upcoming(today, events, '2025-09-23', birthdays, language.t)
const event = (id, date, repeats = false, kind = 'special') => ({ id, date, repeats, kind, title: id })

test('upcoming keeps every future one-off, including dates beyond next year', () => {
  const events = [
    event('past', '2026-10-03'),
    ...Array.from({ length: 8 }, (_, i) => event('one-' + i, '2026-10-' + (10 + i))),
    event('far-away', '2032-05-01'),
  ]
  const result = upcoming(events)
  assert.equal(result.filter((item) => item.sourceId?.startsWith('one-')).length, 8)
  assert.ok(result.some((item) => item.sourceId === 'far-away'))
  assert.ok(!result.some((item) => item.sourceId === 'past'))
  assert.deepEqual(plain(result.map((item) => item.date)), [...result.map((item) => item.date)].sort())
})
test('each yearly occasion appears only at its nearest date, including built-in birthdays', () => {
  const result = upcoming([event('annual', '2020-10-01', true)], '2026-10-04', [{ id: 'birthday-test', name: 'Ada', date: '2000-11-01' }])
  assert.equal(result.filter((item) => item.sourceId === 'annual').length, 1)
  assert.equal(result.find((item) => item.sourceId === 'annual').date, '2027-10-01')
  assert.equal(result.filter((item) => item.id.startsWith('birthday-test-')).length, 1)
  assert.equal(result.filter((item) => item.kind === 'anniversary').length, 1)
})
test('yearly dates handle today, future start years, leap day and December rollover', () => {
  const result = upcoming([
    event('today', '2020-10-04', true),
    event('future', '2030-01-01', true),
    event('leap', '2024-02-29', true),
  ])
  assert.equal(result.find((item) => item.sourceId === 'today').date, '2026-10-04')
  assert.equal(result.find((item) => item.sourceId === 'future').date, '2030-01-01')
  assert.equal(result.find((item) => item.sourceId === 'leap').date, '2027-02-28')
  assert.equal(upcoming([event('new-year', '2020-01-01', true)], '2026-12-31').find((item) => item.sourceId === 'new-year').date, '2027-01-01')
})
test('a place is projected into to-dos once and follows calendar title edits', () => {
  const events = [event('trip', '2026-10-10', false, 'place'), event('other', '2026-10-12')]
  assert.deepEqual(plain(links.calendarPlaceItems(events)), [{ id: 'calendar-place-trip', category: 'places', text: 'trip' }])
  events[0].title = 'Yeni rota'
  assert.equal(links.calendarPlaceItems(events)[0].text, 'Yeni rota')
})
test('completing a linked place removes its calendar date but retains the completed task', () => {
  let state = { custom: [], done: [], calendarEvents: [event('trip', '2026-10-10', false, 'place')] }
  const shared = load('lib/shared-app-state.tsx', {
    react: { ...React, useContext: () => ({ state, updateSharedState: (patch) => { state = { ...state, ...patch } } }), useMemo: (callback) => callback() },
    '@/lib/calendar-links': links,
    '@/lib/supabase': { supabase: null },
    '@/lib/bucket-list': { categories: [] },
    '@/lib/language': { useLanguage: () => language },
  })
  const id = links.calendarPlaceItemId('trip')
  shared.useSharedBucketList().toggle(id)
  assert.equal(state.done.includes(id), true)
  assert.equal(state.calendarEvents.length, 0)
  assert.equal(shared.useSharedBucketList().custom[0].id, id)
  assert.equal(shared.useSharedBucketList().linkedCalendarIds.has(id), false)
  shared.useSharedBucketList().toggle(id)
  assert.equal(state.done.includes(id), false)
  shared.useSharedBucketList().remove(id)
  assert.equal(state.calendarEvents.length, 0)
  assert.equal(shared.useSharedBucketList().custom.length, 0)
  state = { custom: [], done: [], calendarEvents: [event('trip', '2026-10-10', false, 'place'), event('other', '2026-11-10')] }
  shared.useSharedBucketList().remove(id)
  assert.deepEqual(plain(state.calendarEvents.map((item) => item.id)), ['other'])
})
test('all three progress cards use the same compact height and safe percentages', () => {
  const { ProgressSummary } = load('components/progress-summary.tsx', { '@/lib/language': { useLanguage: () => language } })
  for (const label of ['Tamamlanan', 'Kazanılan', 'Yapılan']) {
    const markup = renderToStaticMarkup(React.createElement(ProgressSummary, { label, completed: 2, total: 4 }))
    assert.ok(markup.includes('h-[72px]'))
    assert.ok(markup.includes('aria-valuenow="50"'))
    assert.ok(markup.includes(label))
  }
  const empty = renderToStaticMarkup(React.createElement(ProgressSummary, { label: 'Yapılan', completed: 0, total: 0 }))
  assert.ok(empty.includes('aria-valuenow="0"'))
})
test('to-do edit mode blocks completion, allows deletion selection and restores completion on exit', () => {
  const slots = []
  let slotIndex = 0
  const toggled = []
  const mockReact = {
    ...React,
    useState: (initial) => {
      const index = slotIndex++
      if (!(index in slots)) slots[index] = initial
      return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
    },
    useMemo: (factory) => factory(),
    useEffect: () => {},
    useRef: (value) => ({ current: value }),
  }
  const { BucketListTab } = load('components/tabs/bucket-list-tab.tsx', {
    react: mockReact,
    '@/lib/language': { useLanguage: () => language },
    '@/lib/bucket-list': { categories: [{ id: 'places', label: 'Yerler', items: [{ id: 'fixed', text: 'Hazır madde' }] }] },
    '@/lib/shared-app-state': { useSharedBucketList: () => ({ done: new Set(['custom']), custom: [{ id: 'custom', category: 'places', text: 'Özel madde' }], toggle: (id) => toggled.push(id), add() {}, remove() {} }) },
    '@/components/draggable-tab-list': { DraggableTabList: () => null },
    '@/components/progress-summary': { ProgressSummary: () => null },
    '@/components/section-header': { SectionHeader: () => null },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
  })
  const walk = (node) => !node || typeof node !== 'object' ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(walk)]
  const render = () => { slotIndex = 0; return walk(BucketListTab()) }
  const completionInputs = (nodes) => nodes.filter((node) => node.type === 'input' && node.props.type === 'checkbox' && !node.props['aria-label'])
  const action = () => render().find((node) => node.props?.onEditAction).props.onEditAction()
  assert.ok(completionInputs(render()).every((node) => !node.props.disabled))
  action()
  const editing = render()
  assert.ok(completionInputs(editing).every((node) => node.props.disabled))
  completionInputs(editing).forEach((node) => node.props.onChange())
  assert.deepEqual(toggled, [])
  const deletion = editing.find((node) => node.props?.['aria-label'] === 'Özel madde maddesini silmek için seç')
  assert.equal(deletion.props.disabled, false)
  deletion.props.onChange()
  assert.deepEqual(plain(slots[2]), ['custom'])
  deletion.props.onChange()
  action()
  assert.ok(completionInputs(render()).every((node) => !node.props.disabled))
  completionInputs(render())[0].props.onChange()
  assert.deepEqual(toggled, ['fixed'])
  action()
  render().find((node) => node.props?.['aria-label'] === 'Özel madde maddesini silmek için seç').props.onChange()
  action()
  assert.ok(completionInputs(render()).every((node) => node.props.disabled))
  completionInputs(render()).forEach((node) => node.props.onChange())
  assert.deepEqual(toggled, ['fixed'])
})

test('numeric version increments by one without letters or changing the base', () => {
  const { nextRelease } = require('../scripts/deploy-production.cjs')
  assert.deepEqual(nextRelease({ version: '0.1.0', revision: 0 }), { version: '0.1.0', revision: 1 })
  assert.deepEqual(nextRelease({ version: '0.1.0', revision: 9 }), { version: '0.1.0', revision: 10 })
  assert.throws(() => nextRelease({ version: 'v0.1.0+letters', revision: 0 }))
  assert.throws(() => nextRelease({ version: '0.1.0', revision: -1 }))
})

test('calendar place badges react to the same shared completion flag as to-dos', () => {
  let state = { done: ['calendar-place-trip'] }
  const calendar = load('components/tabs/calendar-tab.tsx', {
    '@/lib/language': { useLanguage: () => language },
    '@/lib/calendar-links': links,
    '@/lib/shared-app-state': { useSharedAppState: () => ({ state }) },
    '@/components/animated-dialog': { AnimatedDialog: () => null },
    '@/components/draggable-tab-list': { DraggableTabList: ({ children }) => children },
    '@/components/section-header': { SectionHeader: () => null },
    '@/lib/config': { config: {} },
    '@/lib/native-picker': { openNativePicker() {} },
    '@/lib/use-now': { useNow: () => Date.now() },
  }, '\nexports.EventCard = EventCard;')
  const props = { event: { ...event('trip', '2026-10-10', false, 'place'), sourceId: 'trip' }, compact: true }
  assert.ok(renderToStaticMarkup(React.createElement(calendar.EventCard, props)).includes('Yapıldı'))
  state = { done: [] }
  assert.ok(!renderToStaticMarkup(React.createElement(calendar.EventCard, props)).includes('Yapıldı'))
})

test('release workflow stamps publication metadata before building and restores it completely on failure', () => {
  for (const successful of [true, false]) {
    const changes = ['İstekler tamamlanınca en alta taşınır.', 'Sürüm bilgileri gösterilir.']
    const previous = JSON.stringify({ version: '0.1.0', revision: 2, publishedAt: '2026-09-22T10:00:00.000Z', changes }, null, 2) + '\n'
    let contents = previous
    let calls = 0
    const module = { exports: {} }
    const process = { env: {}, exitCode: 0 }
    vm.runInNewContext(fs.readFileSync(root + '/scripts/deploy-production.cjs', 'utf8'), {
      module, __dirname: root + '/scripts', process, console: { log() {}, error() {} },
      require: Object.assign((id) => {
        if (id === 'node:fs') return { readFileSync: () => contents, writeFileSync: (_, text) => { contents = text } }
        if (id === 'node:child_process') return { spawnSync(command, args) {
          calls++
          assert.equal(command, 'vercel')
          assert.deepEqual(plain(args), ['--prod', '--yes', '--meta', 'appVersion=v.0.1.0.3'])
          const publication = JSON.parse(contents)
          assert.equal(publication.revision, 3)
          assert.equal(new Date(publication.publishedAt).toISOString(), publication.publishedAt)
          assert.notEqual(publication.publishedAt, JSON.parse(previous).publishedAt)
          assert.deepEqual(publication.changes, changes)
          return { status: successful ? 0 : 1 }
        } }
        return require(id)
      }, { main: null }),
    })
    assert.equal(calls, 0)
    const startedAt = Date.now()
    module.exports.deployProduction()
    assert.equal(calls, 1)
    assert.equal(JSON.parse(contents).revision, successful ? 3 : 2)
    if (successful) {
      assert.ok(Date.parse(JSON.parse(contents).publishedAt) >= startedAt)
      assert.ok(Date.parse(JSON.parse(contents).publishedAt) <= Date.now())
      assert.deepEqual(JSON.parse(contents).changes, changes)
    } else {
      assert.equal(contents, previous)
    }
    assert.equal(process.exitCode, successful ? 0 : 1)
  }
})
