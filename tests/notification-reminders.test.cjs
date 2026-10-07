const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const root = path.join(__dirname, '..')

function load(relative) {
  const filename = path.join(root, relative)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const context = { exports: {}, require }
  vm.runInNewContext(source, context, { filename })
  return context.exports
}

const { dueCalendarReminders } = load('lib/calendar-reminders.ts')
const plain = (value) => JSON.parse(JSON.stringify(value))
const base = () => ({ firstName: 'Ada', secondName: 'Ece', togetherSince: '', calendarEvents: [] })

test('calendar reminders are due exactly 14, 7 and 1 day before an event', () => {
  const state = { ...base(), calendarEvents: [
    { id: 'fourteen', title: 'Tatil', date: '2026-10-21', kind: 'plan', repeats: false },
    { id: 'seven', title: 'Konser', date: '2026-10-14', kind: 'plan', repeats: false },
    { id: 'one', title: 'Akşam yemeği', date: '2026-10-08', kind: 'plan', repeats: false },
    { id: 'other', title: 'Daha sonra', date: '2026-10-09', kind: 'plan', repeats: false },
  ] }
  assert.deepEqual(plain(dueCalendarReminders('2026-10-07', state, [])), [
    { id: 'fourteen', title: 'Tatil', daysRemaining: 14 },
    { id: 'seven', title: 'Konser', daysRemaining: 7 },
    { id: 'one', title: 'Akşam yemeği', daysRemaining: 1 },
  ])
})

test('yearly occasions roll forward and February 29 falls on February 28', () => {
  const state = { ...base(), calendarEvents: [
    { id: 'leap', title: 'Özel gün', date: '2024-02-29', kind: 'special', repeats: true },
  ] }
  assert.deepEqual(plain(dueCalendarReminders('2027-02-21', state, [])), [
    { id: 'leap', title: 'Özel gün', daysRemaining: 7 },
  ])
})

test('birthdays and relationship anniversaries join calendar reminders', () => {
  const state = { ...base(), togetherSince: '2025-10-21' }
  const birthdays = [{ id: 'birthday-ada', name: 'Ada', date: '2000-10-14' }]
  assert.deepEqual(plain(dueCalendarReminders('2026-10-07', state, birthdays)), [
    { id: 'relationship-anniversary', title: 'İlk yıl dönümünüz', daysRemaining: 14 },
    { id: 'birthday-ada', title: 'Ada 26 yaşına giriyor', daysRemaining: 7 },
  ])
})

test('settings expose independent meetup and calendar notification switches', () => {
  const source = fs.readFileSync(path.join(root, 'components/meetup-notifications.tsx'), 'utf8')
  assert.match(source, /setPreference\('meetup'/)
  assert.match(source, /setPreference\('calendar'/)
  assert.match(source, /14, 7 ve 1 gün/)
})

test('cron filters subscriptions by preference and uses a configurable calendar time', () => {
  const source = fs.readFileSync(path.join(root, 'app/api/cron/meetup-reminders/route.ts'), 'utf8')
  assert.match(source, /preferenceEnabled\(item, 'calendar'\)/)
  assert.match(source, /CALENDAR_REMINDER_TIME \|\| '09:00'/)
  assert.match(source, /dueCalendarReminders/)
})
