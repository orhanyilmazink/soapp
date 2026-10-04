import webpush from 'web-push'

export const runtime = 'nodejs'

const day = 24 * 60 * 60 * 1000

type StoredSubscription = {
  endpoint: string
  expirationTime: number | null
  keys: { auth: string; p256dh: string }
}

type StoredState = {
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
    const actual = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute))
    instant += requested - actual
  }
  return instant
}

function dueReminder(meetupDate: string, current: number, timeZone: string) {
  const [year, month, dayOfMonth] = meetupDate.split('-').map(Number)
  if (![year, month, dayOfMonth].every(Number.isFinite)) return null

  const today = dateParts(new Date(current), timeZone)
  const todayAtMidnight = Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day))
  const meetupAtMidnight = Date.UTC(year, month - 1, dayOfMonth)
  const daysRemaining = Math.round((meetupAtMidnight - todayAtMidnight) / day)
  if (daysRemaining < 1) return null

  return { label: `Buluşmamıza son ${daysRemaining} gün kaldı!` }
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
  if (!response.ok) return Response.json({ error: 'Could not load meetup details' }, { status: 502 })

  const rows = await response.json() as { state?: StoredState }[]
  const state = rows[0]?.state
  if (!state?.meetupDate || !state.meetupTime || !state.pushSubscriptions?.length) {
    return Response.json({ sent: 0, reason: 'No meetup or subscriptions' })
  }

  const timeZone = process.env.REMINDER_TIME_ZONE || 'Europe/Istanbul'
  const target = meetupTimeInUtc(state.meetupDate, state.meetupTime, timeZone)
  if (!target) return Response.json({ sent: 0, reason: 'Invalid meetup time' })
  if (target <= Date.now()) return Response.json({ sent: 0, reason: 'Meetup has passed' })
  const reminder = dueReminder(state.meetupDate, Date.now(), timeZone)
  if (!reminder) return Response.json({ sent: 0, reason: 'No reminder due' })

  webpush.setVapidDetails('https://orhanyilmazink-soapp.vercel.app', publicKey, privateKey)
  const payload = JSON.stringify({ title: 'SOapp', body: reminder.label })
  const results = await Promise.allSettled(
    state.pushSubscriptions.map((subscription) => webpush.sendNotification(subscription, payload))
  )
  const sent = results.filter((result) => result.status === 'fulfilled').length
  return Response.json({ sent, reminder: reminder.label, attempted: results.length })
}
