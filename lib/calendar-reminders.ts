import type { SharedCalendarEvent } from '@/lib/shared-app-state'

export const calendarReminderDays = [14, 7, 1] as const

type ReminderState = {
  firstName: string
  secondName: string
  togetherSince: string
  calendarEvents: SharedCalendarEvent[]
}

type Birthday = { id: string; name: string; date: string }

export type CalendarReminder = {
  id: string
  title: string
  daysRemaining: (typeof calendarReminderDays)[number]
}

const day = 24 * 60 * 60 * 1000
const validDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

function parts(value: string) {
  const [year, month, dayOfMonth] = value.split('-').map(Number)
  if (!validDateKey(value) || ![year, month, dayOfMonth].every(Number.isFinite)) return null
  const instant = Date.UTC(year, month - 1, dayOfMonth)
  const date = new Date(instant)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== dayOfMonth) return null
  return { year, month, dayOfMonth, instant }
}

function occurrenceInYear(original: string, year: number) {
  const parsed = parts(original)
  if (!parsed || year < parsed.year) return null
  const lastDay = new Date(Date.UTC(year, parsed.month, 0)).getUTCDate()
  const dayOfMonth = Math.min(parsed.dayOfMonth, lastDay)
  return Date.UTC(year, parsed.month - 1, dayOfMonth)
}

function nextOccurrence(date: string, repeats: boolean, today: { year: number; instant: number }) {
  const parsed = parts(date)
  if (!parsed) return null
  if (!repeats) return parsed.instant >= today.instant ? parsed.instant : null
  const thisYear = occurrenceInYear(date, today.year)
  if (thisYear !== null && thisYear >= today.instant) return thisYear
  return occurrenceInYear(date, today.year + 1)
}

export function dueCalendarReminders(
  todayKey: string,
  state: ReminderState,
  birthdays: Birthday[]
): CalendarReminder[] {
  const today = parts(todayKey)
  if (!today) return []

  const candidates: { id: string; title: string; target: number | null }[] = state.calendarEvents.map((event) => ({
    id: event.id,
    title: event.title,
    target: nextOccurrence(event.date, event.repeats, today),
  }))

  const relationshipStart = parts(state.togetherSince)
  if (relationshipStart) {
    const target = nextOccurrence(state.togetherSince, true, today)
    const targetYear = target === null ? 0 : new Date(target).getUTCFullYear()
    const anniversary = targetYear - relationshipStart.year
    if (anniversary > 0) {
      candidates.push({
        id: 'relationship-anniversary',
        title: anniversary === 1 ? 'İlk yıl dönümünüz' : `${anniversary}. yıl dönümünüz`,
        target,
      })
    }
  }

  for (const birthday of birthdays) {
    const birthDate = parts(birthday.date)
    const target = nextOccurrence(birthday.date, true, today)
    if (!birthDate || target === null) continue
    const age = new Date(target).getUTCFullYear() - birthDate.year
    candidates.push({ id: birthday.id, title: `${birthday.name} ${age} yaşına giriyor`, target })
  }

  return candidates.flatMap(({ id, title, target }) => {
    if (target === null) return []
    const daysRemaining = Math.round((target - today.instant) / day)
    return calendarReminderDays.includes(daysRemaining as CalendarReminder['daysRemaining'])
      ? [{ id, title, daysRemaining: daysRemaining as CalendarReminder['daysRemaining'] }]
      : []
  })
}
