import webpush from 'web-push'
import { dueCalendarReminders } from '@/lib/calendar-reminders'
import { config } from '@/lib/config'

export const runtime = 'nodejs'

const day = 24 * 60 * 60 * 1000

type StoredSubscription = {
  endpoint: string
  expirationTime: number | null
  keys: { auth: string; p256dh: string }
  preferences?: { meetup?: boolean; calendar?: boolean }
}

type StoredState = {
  firstName?: string
  secondName?: string
  togetherSince?: string
  calendarEvents?: {
    id: string
    title: string
    date: string
    kind: 'birthday' | 'special' | 'anniversary' | 'plan' | 'celebration' | 'place'
    repeats: boolean
    note?: string
  }[]
  meetupDate?: string
  meetupTime?: string
  pushSubscriptions?: StoredSubscription[]
}

function dateParts(date: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  return Object.fromEntries(values.map((part) => [part.type, part.value]))
}

function meetupTimeInUtc(date: string, time: string, timeZone: string) {
  const [year, month, dayOfMonth] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  if (![year, month, dayOfMonth, hour, minute].every(Number.isFinite)) return null

  const requested = Date.UTC(year, month - 1, dayOfMonth, hour, minute)
  let instant = requested
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = dateParts(new Date(instant), timeZone)
    const actual = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute)
    )
    instant += requested - actual
  }
  return instant
}

function meetupReminder(meetupDate: string, current: number, timeZone: string) {
  const [year, month, dayOfMonth] = meetupDate.split('-').map(Number)
  if (![year, month, dayOfMonth].every(Number.isFinite)) return null
  const today = dateParts(new Date(current), timeZone)
  const todayAtMidnight = Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day))
  const meetupAtMidnight = Date.UTC(year, month - 1, dayOfMonth)
  const daysRemaining = Math.round((meetupAtMidnight - todayAtMidnight) / day)
  return daysRemaining < 1 ? null : `Buluşmamıza son ${daysRemaining} gün kaldı!`
}

function preferenceEnabled(subscription: StoredSubscription, preference: 'meetup' | 'calendar') {
  // Records from earlier versions only supported meetup notifications.
  return preference === 'meetup'
    ? subscription.preferences?.meetup !== false
    : subscription.preferences?.calendar === true
}

async function sendPush(
  subscriptions: StoredSubscription[],
  payload: { body: string; tag: string; url?: string }
) {
  const message = JSON.stringify({ title: 'SOapp', ...payload })
  const results = await Promise.allSettled(subscriptions.map(({ endpoint, expirationTime, keys }) =>
    webpush.sendNotification({ endpoint, expirationTime, keys }, message)
  ))
  return results.filter((result) => result.status === 'fulfilled').length
}

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!supabaseUrl || !supabaseKey || !publicKey || !privateKey) {
    return Response.json({ error: 'Missing notification configuration' }, { status: 503 })
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/bucket_lists?id=eq.shared&select=state`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    cache: 'no-store',
  })
  if (!response.ok) return Response.json({ error: 'Could not load reminder details' }, { status: 502 })

  const rows = (await response.json()) as { state?: StoredState }[]
  const state = rows[0]?.state
  const subscriptions = state?.pushSubscriptions ?? []
  if (!state || subscriptions.length === 0) return Response.json({ sent: 0, reason: 'No subscriptions' })

  const timeZone = process.env.REMINDER_TIME_ZONE || 'Europe/Istanbul'
  const now = new Date()
  const current = dateParts(now, timeZone)
  const currentTime = `${current.hour}:${current.minute}`
  const sentReminders: string[] = []
  let sent = 0

  webpush.setVapidDetails('https://orhanyilmazink-soapp.vercel.app', publicKey, privateKey)

  const meetupSubscriptions = subscriptions.filter((item) => preferenceEnabled(item, 'meetup'))
  if (state.meetupDate && state.meetupTime && currentTime === state.meetupTime && meetupSubscriptions.length > 0) {
    const target = meetupTimeInUtc(state.meetupDate, state.meetupTime, timeZone)
    const body = target && target > now.getTime() ? meetupReminder(state.meetupDate, now.getTime(), timeZone) : null
    if (body) {
      sent += await sendPush(meetupSubscriptions, { body, tag: `meetup-${current.year}-${current.month}-${current.day}` })
      sentReminders.push(body)
    }
  }

  const calendarSubscriptions = subscriptions.filter((item) => preferenceEnabled(item, 'calendar'))
  const calendarTime = process.env.CALENDAR_REMINDER_TIME || '09:00'
  if (currentTime === calendarTime && calendarSubscriptions.length > 0) {
    const todayKey = `${current.year}-${current.month}-${current.day}`
    const reminders = dueCalendarReminders(todayKey, {
      firstName: state.firstName || 'Şevval',
      secondName: state.secondName || 'Orhan',
      togetherSince: state.togetherSince || '',
      calendarEvents: state.calendarEvents ?? [],
    }, [
      { id: 'birthday-first', name: state.firstName || 'Şevval', date: config.birthDate },
      { id: 'birthday-second', name: state.secondName || 'Orhan', date: config.senderBirthDate },
    ])

    for (const reminder of reminders) {
      const body = `“${reminder.title}” için ${reminder.daysRemaining} gün kaldı.`
      sent += await sendPush(calendarSubscriptions, {
        body,
        tag: `calendar-${reminder.id}-${reminder.daysRemaining}`.slice(0, 120),
        url: '/',
      })
      sentReminders.push(body)
    }
  }

  return Response.json({
    sent,
    reminders: sentReminders,
    attemptedSubscriptions: subscriptions.length,
    currentTime,
  })
}
