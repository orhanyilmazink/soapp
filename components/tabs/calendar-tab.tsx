'use client'

import { useEffect, useState, type FormEvent } from 'react'
import {
  CakeSlice,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  Plus,
  Sparkles,
} from 'lucide-react'
import { SectionHeader } from '@/components/section-header'
import { config } from '@/lib/config'
import { useSharedAppState } from '@/lib/shared-app-state'
import { useNow } from '@/lib/use-now'

type EventKind = 'anniversary' | 'birthday' | 'special'
type CustomEventKind = Exclude<EventKind, 'anniversary'>
type CustomEvent = {
  id: string
  title: string
  date: string
  kind: CustomEventKind
  repeats: boolean
}
type CalendarEvent = {
  id: string
  title: string
  date: string
  kind: EventKind
}
const customEventsKey = 'relationship-calendar-events'
const birthdays = [
  { id: 'birthday-sevval', name: 'Şevval', date: config.birthDate },
  { id: 'birthday-orhan', name: 'Orhan', date: config.senderBirthDate },
]
const pad = (value: number) => value.toString().padStart(2, '0')
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function eventsForYear(year: number, customEvents: CustomEvent[]): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const relationshipStart = new Date(config.togetherSince)
  const anniversaryNumber = year - relationshipStart.getFullYear()

  if (anniversaryNumber > 0) {
    events.push({
      id: `anniversary-${year}`,
      title: anniversaryNumber === 1 ? 'İlk yıl dönümünüz' : `${anniversaryNumber}. yıl dönümünüz`,
      date: `${year}-${pad(relationshipStart.getMonth() + 1)}-${pad(relationshipStart.getDate())}`,
      kind: 'anniversary',
    })
  }

  for (const birthday of birthdays) {
    const birthdayDate = new Date(birthday.date)
    if (year >= birthdayDate.getFullYear()) {
      events.push({
        id: `${birthday.id}-${year}`,
        title: `${birthday.name} ${year - birthdayDate.getFullYear()} yaşına giriyor`,
        date: `${year}-${pad(birthdayDate.getMonth() + 1)}-${pad(birthdayDate.getDate())}`,
        kind: 'birthday',
      })
    }
  }

  for (const event of customEvents) {
    const originalDate = parseDateKey(event.date)
    if (event.repeats) {
      if (year >= originalDate.getFullYear()) {
        events.push({
          id: `${event.id}-${year}`,
          title: event.title,
          date: `${year}-${pad(originalDate.getMonth() + 1)}-${pad(originalDate.getDate())}`,
          kind: event.kind,
        })
      }
    } else if (year === originalDate.getFullYear()) {
      events.push({ ...event, kind: event.kind })
    }
  }

  return events.sort((left, right) => left.date.localeCompare(right.date))
}

const weekdayLabels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const monthFormatter = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' })
const fullDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function CalendarTab() {
  const now = useNow()
  const { state, updateSharedState } = useSharedAppState()
  const [visibleMonth, setVisibleMonth] = useState<Date | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const customEvents = state.calendarEvents
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newKind, setNewKind] = useState<CustomEventKind>('birthday')
  const [repeats, setRepeats] = useState(true)

  useEffect(() => {
    const today = new Date()
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(dateKey(today))

  }, [])

  const todayKey = now ? dateKey(new Date(now)) : ''
  const togetherDays = now
    ? Math.max(0, Math.floor((now - new Date(config.togetherSince).getTime()) / 86_400_000))
    : 0

  const calendarDays = visibleMonth
    ? (() => {
        const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
        const offset = (firstDay.getDay() + 6) % 7
        const start = new Date(firstDay)
        start.setDate(start.getDate() - offset)
        return Array.from({ length: 42 }, (_, index) => {
          const day = new Date(start)
          day.setDate(start.getDate() + index)
          return day
        })
      })()
    : []

  const visibleEvents = visibleMonth
    ? [
        ...eventsForYear(visibleMonth.getFullYear() - 1, customEvents),
        ...eventsForYear(visibleMonth.getFullYear(), customEvents),
        ...eventsForYear(visibleMonth.getFullYear() + 1, customEvents),
      ]
    : []
  const selectedEvents = visibleEvents.filter((event) => event.date === selectedDate)
  const upcomingEvents = now
    ? [
        ...eventsForYear(new Date(now).getFullYear(), customEvents),
        ...eventsForYear(new Date(now).getFullYear() + 1, customEvents),
      ]
        .filter((event) => event.date >= todayKey)
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(0, 3)
    : []
  function moveMonth(amount: number) {
    if (!visibleMonth) return
    setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + amount, 1))
  }

  function saveCustomEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title || !newDate) return

    const nextEvents = [
      ...customEvents,
      { id: `special-${Date.now()}`, title, date: newDate, kind: newKind, repeats },
    ]
    updateSharedState({ calendarEvents: nextEvents })
    setSelectedDate(newDate)
    const date = parseDateKey(newDate)
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    setNewTitle('')
    setIsAddOpen(false)
  }

  return (
    <div className="pb-2">
      <SectionHeader title="Takvim" largeTitle />

      <section aria-label="İlişki takvimi" className="surface-panel p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            aria-label="Önceki ay"
            onClick={() => moveMonth(-1)}
            disabled={!visibleMonth}
            className="grid size-10 place-items-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <h2 className="text-base font-bold capitalize text-zinc-900">
            {visibleMonth ? monthFormatter.format(visibleMonth) : 'Takvim yükleniyor'}
          </h2>
          <button
            type="button"
            aria-label="Sonraki ay"
            onClick={() => moveMonth(1)}
            disabled={!visibleMonth}
            className="grid size-10 place-items-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 text-center">
          {weekdayLabels.map((label) => (
            <span key={label} className="pb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
              {label}
            </span>
          ))}
          {calendarDays.map((day) => {
            const key = dateKey(day)
            const isCurrentMonth = day.getMonth() === visibleMonth?.getMonth()
            const isSelected = key === selectedDate
            const dayEvents = visibleEvents.filter((event) => event.date === key)
            return (
              <button
                key={key}
                type="button"
                aria-label={`${fullDateFormatter.format(day)}${dayEvents.length ? `, ${dayEvents.map((event) => event.title).join(', ')}` : ''}`}
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedDate(key)
                  if (!isCurrentMonth) setVisibleMonth(new Date(day.getFullYear(), day.getMonth(), 1))
                }}
                className={`relative mx-auto mb-1 grid aspect-square w-full max-w-10 place-items-center rounded-full text-sm font-semibold transition-colors ${
                  isSelected
                    ? 'bg-zinc-900 text-white'
                    : isCurrentMonth
                      ? 'text-zinc-800 hover:bg-zinc-100'
                      : 'text-zinc-300 hover:bg-zinc-50'
                } ${key === todayKey && !isSelected ? 'ring-1 ring-pink-300' : ''}`}
              >
                {day.getDate()}
                {dayEvents.length > 0 && (
                  <span className="absolute bottom-0.5 flex gap-0.5" aria-hidden="true">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className={`size-1 rounded-full ${isSelected ? 'bg-pink-200' : 'bg-pink-400'}`}
                      />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 border-t border-zinc-100 pt-3 text-[10px] font-medium text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-pink-400" /> Özel gününüz</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full border border-pink-300" /> Bugün</span>
        </div>
      </section>

      <section className="mt-5" aria-labelledby="selected-date-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Takvim notu</p>
            <h2 id="selected-date-title" className="mt-1 text-base font-bold capitalize text-zinc-900">
              {selectedDate ? fullDateFormatter.format(parseDateKey(selectedDate)) : 'Bir gün seç'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewDate(selectedDate || todayKey)
              setIsAddOpen(true)
            }}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition-colors hover:border-pink-200 hover:bg-pink-50/50"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Özel gün ekle
          </button>
        </div>

        {selectedEvents.length ? (
          <ul className="space-y-2">
            {selectedEvents.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-white/60 px-4 py-3.5">
            <CalendarDays className="size-5 shrink-0 text-pink-300" aria-hidden="true" />
            <p className="text-sm text-zinc-500">Bu gün için takvimde özel bir tarih yok.</p>
          </div>
        )}
      </section>

      <section className="mt-7" aria-labelledby="upcoming-events-title">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-pink-400" aria-hidden="true" />
          <h2 id="upcoming-events-title" className="text-base font-bold text-zinc-900">Yaklaşan özel günler</h2>
        </div>
        <ul className="space-y-2">
          {upcomingEvents.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(event.date)
                  const date = parseDateKey(event.date)
                  setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
                }}
                className="w-full text-left"
              >
                <EventCard event={event} compact />
              </button>
            </li>
          ))}
          {upcomingEvents.length === 0 && (
            <li className="rounded-2xl bg-white/60 px-4 py-3 text-sm text-zinc-500">Yaklaşan tarihler yükleniyor.</li>
          )}
        </ul>
      </section>

      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsAddOpen(false)
          }}
        >
          <form
            aria-labelledby="add-event-title"
            onSubmit={saveCustomEvent}
            className="my-auto w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-pink-100 text-pink-500">
                  <CakeSlice className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="add-event-title" className="font-bold text-zinc-900">Takvime özel gün ekle</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">Birlikte kutlayacağınız günü kaydet.</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Pencereyi kapat"
                onClick={() => setIsAddOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <label className="mb-3 flex flex-col gap-1.5 text-xs font-semibold text-zinc-600">
              Günün adı
              <input
                autoFocus
                required
                maxLength={48}
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Örn. Orhan'ın doğum günü"
                className="min-h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-900 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
              />
            </label>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-600">
                Tarih
                <input
                  required
                  type="date"
                  value={newDate}
                  onChange={(event) => setNewDate(event.target.value)}
                  className="min-h-11 min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 px-2 text-sm font-medium text-zinc-900 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-600">
                Tür
                <select
                  value={newKind}
                  onChange={(event) => setNewKind(event.target.value as CustomEventKind)}
                  className="min-h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-2 text-sm font-medium text-zinc-900 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
                >
                  <option value="birthday">Doğum günü</option>
                  <option value="special">Özel gün</option>
                </select>
              </label>
            </div>

            <label className="flex min-h-11 items-center gap-2.5 rounded-xl bg-zinc-50 px-3 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={repeats}
                onChange={(event) => setRepeats(event.target.checked)}
                className="size-4 accent-pink-400"
              />
              Her yıl tekrarla
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="min-h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                İptal
              </button>
              <button
                type="submit"
                className="min-h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
              >
                Takvime ekle
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function EventCard({ event, compact = false }: { event: CalendarEvent; compact?: boolean }) {
  const EventIcon = event.kind === 'birthday' ? CakeSlice : event.kind === 'anniversary' ? Heart : Sparkles
  const date = parseDateKey(event.date)

  return (
    <article className={`flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 ${compact ? 'px-3 py-3' : 'px-4 py-3.5'}`}>
      <div className={`grid shrink-0 place-items-center rounded-full bg-pink-50 text-pink-400 ${compact ? 'size-9' : 'size-10'}`}>
        <EventIcon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-zinc-900">{event.title}</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      {event.kind === 'anniversary' && <Heart className="size-4 shrink-0 text-pink-300" fill="currentColor" aria-hidden="true" />}
    </article>
  )
}
