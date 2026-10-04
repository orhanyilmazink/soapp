'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  CakeSlice,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  Pencil,
  Plus,
  Repeat2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { AnimatedDialog } from '@/components/animated-dialog'
import { SectionHeader } from '@/components/section-header'
import { config } from '@/lib/config'
import { openNativePicker } from '@/lib/native-picker'
import {
  useSharedAppState,
  type SharedCalendarEvent,
  type SharedCalendarEventKind,
} from '@/lib/shared-app-state'
import { useNow } from '@/lib/use-now'

type CalendarEvent = {
  id: string
  title: string
  date: string
  kind: SharedCalendarEventKind
  sourceId?: string
  repeats?: boolean
  note?: string
}
const eventKinds: { value: SharedCalendarEventKind; label: string }[] = [
  { value: 'special', label: 'Özel gün' },
  { value: 'birthday', label: 'Doğum günü' },
  { value: 'anniversary', label: 'Yıl dönümü' },
  { value: 'plan', label: 'Birlikte plan' },
  { value: 'celebration', label: 'Kutlama' },
]
const eventKindLabels = Object.fromEntries(eventKinds.map(({ value, label }) => [value, label]))
const pad = (value: number) => value.toString().padStart(2, '0')
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}
const validDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(parseDateKey(value)) === value
// A February 29 yearly occasion falls on February 28 in non-leap years.
const repeatedDateKey = (year: number, original: Date) => {
  const month = original.getMonth()
  const day = Math.min(original.getDate(), new Date(year, month + 1, 0).getDate())
  return `${year}-${pad(month + 1)}-${pad(day)}`
}
const customCalendarEvent = (event: SharedCalendarEvent, date = event.date): CalendarEvent => ({
  ...event,
  id: `${event.id}-${date}`,
  date,
  sourceId: event.id,
})

function eventsForYear(
  year: number,
  customEvents: SharedCalendarEvent[],
  togetherSince: string,
  birthdays: { id: string; name: string; date: string }[]
): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const relationshipStart = parseDateKey(togetherSince)
  const anniversaryNumber = year - relationshipStart.getFullYear()

  if (validDateKey(togetherSince) && anniversaryNumber > 0) {
    events.push({
      id: `anniversary-${year}`,
      title: anniversaryNumber === 1 ? 'İlk yıl dönümünüz' : `${anniversaryNumber}. yıl dönümünüz`,
      date: repeatedDateKey(year, relationshipStart),
      kind: 'anniversary',
    })
  }

  for (const birthday of birthdays) {
    const birthdayDate = parseDateKey(birthday.date)
    if (validDateKey(birthday.date) && year >= birthdayDate.getFullYear()) {
      events.push({
        id: `${birthday.id}-${year}`,
        title: `${birthday.name} ${year - birthdayDate.getFullYear()} yaşına giriyor`,
        date: repeatedDateKey(year, birthdayDate),
        kind: 'birthday',
      })
    }
  }

  for (const event of customEvents) {
    if (!validDateKey(event.date)) continue
    const originalDate = parseDateKey(event.date)
    if (event.repeats) {
      if (year >= originalDate.getFullYear()) {
        events.push(customCalendarEvent(event, repeatedDateKey(year, originalDate)))
      }
    } else if (year === originalDate.getFullYear()) {
      events.push(customCalendarEvent(event))
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
const weekdayFormatter = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' })
const dayMonthYearFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

export function CalendarTab() {
  const now = useNow(60_000)
  const { state, updateSharedState } = useSharedAppState()
  const [visibleMonth, setVisibleMonth] = useState<Date | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const customEvents = state.calendarEvents
  const birthdaysForCouple = useMemo(() => [
    { id: 'birthday-sevval', name: state.firstName || 'Şevval', date: config.birthDate },
    { id: 'birthday-orhan', name: state.secondName || 'Orhan', date: config.senderBirthDate },
  ], [state.firstName, state.secondName])
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDeletion, setPendingDeletion] = useState<SharedCalendarEvent | null>(null)
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newKind, setNewKind] = useState<SharedCalendarEventKind>('special')
  const [newNote, setNewNote] = useState('')
  const [repeats, setRepeats] = useState(true)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const today = new Date()
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(dateKey(today))
  }, [])

  const todayKey = now ? dateKey(new Date(now)) : ''
  const today = now ? new Date(now) : new Date()
  const todayLabel = `Bugün ${weekdayFormatter.format(today).toLocaleLowerCase('tr-TR')}, ${dayMonthYearFormatter.format(today).toLocaleLowerCase('tr-TR')}`
  const currentYear = now ? new Date(now).getFullYear() : null
  const visibleYear = visibleMonth?.getFullYear() ?? null

  const calendarDays = useMemo(() => visibleMonth
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
    : [], [visibleMonth])

  const visibleEvents = useMemo(() => visibleYear !== null
    ? [
        ...eventsForYear(visibleYear - 1, customEvents, state.togetherSince, birthdaysForCouple),
        ...eventsForYear(visibleYear, customEvents, state.togetherSince, birthdaysForCouple),
        ...eventsForYear(visibleYear + 1, customEvents, state.togetherSince, birthdaysForCouple),
      ]
    : [], [visibleYear, customEvents, state.togetherSince, birthdaysForCouple])
  const eventsByDate = useMemo(() => {
    const events = new Map<string, CalendarEvent[]>()
    for (const event of visibleEvents) {
      const dayEvents = events.get(event.date)
      if (dayEvents) dayEvents.push(event)
      else events.set(event.date, [event])
    }
    return events
  }, [visibleEvents])
  const customEventsById = useMemo(() => new Map(customEvents.map((event) => [event.id, event])), [customEvents])
  const managedEvents = useMemo(() => [...customEvents].sort((left, right) => left.date.localeCompare(right.date)), [customEvents])
  const selectedEvents = eventsByDate.get(selectedDate) ?? []
  const upcomingEvents = useMemo(() => currentYear !== null
    ? [
        ...eventsForYear(currentYear, customEvents, state.togetherSince, birthdaysForCouple),
        ...eventsForYear(currentYear + 1, customEvents, state.togetherSince, birthdaysForCouple),
        ...customEvents
          .filter((event) => validDateKey(event.date) && parseDateKey(event.date).getFullYear() > currentYear + 1)
          .map((event) => customCalendarEvent(event)),
      ]
        .filter((event) => event.date >= todayKey)
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(0, 3)
    : [], [currentYear, todayKey, customEvents, state.togetherSince, birthdaysForCouple])
  function moveMonth(amount: number) {
    if (!visibleMonth) return
    setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + amount, 1))
  }

  function saveCustomEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title || !validDateKey(newDate)) {
      setFormError('Günün adını ve geçerli bir tarih gir.')
      return
    }
    if (editingId && !customEventsById.has(editingId)) {
      setFormError('Bu özel gün başka bir cihazda kaldırılmış. Pencereyi kapatıp yeni bir gün ekleyebilirsin.')
      return
    }
    const note = newNote.trim()
    const savedEvent: SharedCalendarEvent = {
      id: editingId ?? `special-${typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
      title,
      date: newDate,
      kind: newKind,
      repeats,
      ...(note ? { note } : {}),
    }
    const nextEvents = editingId
      ? customEvents.map((item) => item.id === editingId ? savedEvent : item)
      : [...customEvents, savedEvent]
    updateSharedState({ calendarEvents: nextEvents })
    setSelectedDate(newDate)
    const date = parseDateKey(newDate)
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    setIsEventDialogOpen(false)
  }

  function openEventForm(event?: SharedCalendarEvent) {
    setPendingDeletion(null)
    setEditingId(event?.id ?? null)
    setNewTitle(event?.title ?? '')
    setNewDate(event?.date ?? (selectedDate || todayKey))
    setNewKind(event?.kind ?? 'special')
    setNewNote(event?.note ?? '')
    setRepeats(event?.repeats ?? true)
    setFormError('')
    setIsEventDialogOpen(true)
  }

  function requestRemoval(event: SharedCalendarEvent) {
    setPendingDeletion(event)
    setIsEventDialogOpen(true)
  }

  function removeCustomEvent() {
    if (!pendingDeletion) return
    updateSharedState({ calendarEvents: customEvents.filter((event) => event.id !== pendingDeletion.id) })
    setIsEventDialogOpen(false)
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
            const dayEvents = eventsByDate.get(key) ?? []
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
        <div className="mb-3 flex items-center gap-2">
            <button
              id="selected-date-title"
              type="button"
              onClick={() => {
                const today = new Date()
                setSelectedDate(todayKey)
                setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                setIsManageOpen(false)
              }}
              className="group relative flex h-[52px] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(244,244,246,0.92))] p-1.5 text-center shadow-[0_12px_24px_-18px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl transition-transform duration-250 ease-out active:scale-[0.98]"
            >
              <span aria-hidden="true" className="absolute inset-1.5 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,114,182,0.1),rgba(255,255,255,0.82))] shadow-[inset_0_1px_1px_rgba(255,255,255,0.96),0_12px_24px_-18px_rgba(24,24,27,0.6)]" />
              <span className="relative px-1 text-xs font-bold leading-tight text-foreground">
                {todayLabel}
              </span>
            </button>
          <div className={`${customEvents.length > 0 ? 'w-40' : 'w-20'} flex h-[52px] shrink-0 items-center gap-1 rounded-full border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(244,244,246,0.92))] p-1.5 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl`}>
            <button
              type="button"
              onClick={() => {
                setIsManageOpen(false)
                openEventForm()
              }}
              className={`group relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-full px-1 py-0 text-[10px] font-semibold transition-[color,transform] duration-250 ease-out ${!isManageOpen ? 'text-foreground' : 'scale-[0.94] text-zinc-500 hover:text-zinc-700'}`}
            >
              <span aria-hidden="true" className={`absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,114,182,0.1),rgba(255,255,255,0.82))] shadow-[inset_0_1px_1px_rgba(255,255,255,0.96),0_12px_24px_-18px_rgba(24,24,27,0.6)] transition-opacity ${!isManageOpen ? 'opacity-100' : 'opacity-0'}`} />
              <span className={`relative flex flex-col items-center gap-0.5 transition-[transform,opacity] duration-250 ease-out ${!isManageOpen ? 'scale-105' : 'scale-90 opacity-80'}`}>
                <Plus className={`size-4 transition-colors duration-250 ${!isManageOpen ? 'text-primary' : ''}`} aria-hidden="true" />
                <span className={!isManageOpen ? 'font-bold text-foreground' : 'font-medium'}>Ekle</span>
              </span>
            </button>
            {customEvents.length > 0 && (
              <button
                type="button"
                onClick={() => setIsManageOpen((open) => !open)}
                aria-expanded={isManageOpen}
                aria-controls="managed-calendar-events"
                className={`group relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-full px-1 py-0 text-[10px] font-semibold transition-[color,transform] duration-250 ease-out ${isManageOpen ? 'text-foreground' : 'scale-[0.94] text-zinc-500 hover:text-zinc-700'}`}
              >
                <span aria-hidden="true" className={`absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,114,182,0.1),rgba(255,255,255,0.82))] shadow-[inset_0_1px_1px_rgba(255,255,255,0.96),0_12px_24px_-18px_rgba(24,24,27,0.6)] transition-opacity ${isManageOpen ? 'opacity-100' : 'opacity-0'}`} />
                <span className={`relative flex flex-col items-center gap-0.5 transition-[transform,opacity] duration-250 ease-out ${isManageOpen ? 'scale-105' : 'scale-90 opacity-80'}`}>
                  <Pencil className={`size-4 transition-colors duration-250 ${isManageOpen ? 'text-primary' : ''}`} aria-hidden="true" />
                  <span className={isManageOpen ? 'font-bold text-foreground' : 'font-medium'}>Yönet</span>
                </span>
              </button>
            )}
          </div>
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
            <p className="text-sm text-zinc-500">Bugün için takvimde özel bir tarih yok.</p>
          </div>
        )}
      </section>

      {customEvents.length > 0 && (
        <div
          id="managed-calendar-events"
          inert={!isManageOpen}
          className={`origin-top grid transition-[grid-template-rows,opacity,transform,margin] duration-[360ms] ease-[var(--motion-ease)] motion-reduce:transition-none ${isManageOpen ? 'mt-3 grid-rows-[1fr] translate-y-0 scale-y-100 opacity-100' : 'mt-0 grid-rows-[0fr] -translate-y-1 scale-y-95 opacity-0'}`}
        >
          <section className="surface-panel min-h-0 overflow-hidden p-4" aria-label="Özel günleri yönet">
            <p className="mb-3 text-xs text-zinc-500">Eklediğin günleri düzenleyebilir veya kaldırabilirsin.</p>
            <ul className="space-y-2">
              {managedEvents.map((event) => (
                <li key={event.id}>
                  <EventCard
                    event={customCalendarEvent(event)}
                    onEdit={() => openEventForm(event)}
                    onRemove={() => requestRemoval(event)}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

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

      <AnimatedDialog
        open={isEventDialogOpen}
        onClose={() => setIsEventDialogOpen(false)}
        titleId="calendar-event-dialog-title"
        descriptionId="calendar-event-dialog-description"
        className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-5 text-left shadow-2xl"
      >
        {pendingDeletion ? (
          <div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="calendar-event-dialog-title" className="font-bold text-zinc-900">Özel günü kaldır</h2>
                <p id="calendar-event-dialog-description" className="mt-2 break-words text-sm text-zinc-500">
                  “{pendingDeletion.title}” takvimden kaldırılsın mı?
                  {pendingDeletion.repeats ? ' Her yıl tekrarlanan günleri de kaldırılır.' : ''}
                </p>
              </div>
              <button
                type="button"
                aria-label="Pencereyi kapat"
                onClick={() => setIsEventDialogOpen(false)}
                className="icon-action grid size-9 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEventDialogOpen(false)}
                className="min-h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={removeCustomEvent}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Kaldır
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={saveCustomEvent}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-pink-100 text-pink-500">
                  <CalendarDays className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="calendar-event-dialog-title" className="font-bold text-zinc-900">
                    {editingId ? 'Özel günü düzenle' : 'Takvime özel gün ekle'}
                  </h2>
                  <p id="calendar-event-dialog-description" className="mt-0.5 text-xs text-zinc-500">Birlikte hatırlayacağınız günü kaydet.</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Pencereyi kapat"
                onClick={() => setIsEventDialogOpen(false)}
                className="icon-action grid size-9 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <label className="mb-3 flex flex-col gap-1.5 text-xs font-semibold text-zinc-600">
              Günün adı
              <input
                required
                maxLength={48}
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Örn. Orhan'ın doğum günü"
                className="min-h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-900 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
              />
            </label>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-600">
                Tarih
                <span className="date-field flex min-h-11 min-w-0 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 focus-within:border-pink-300 focus-within:ring-2 focus-within:ring-pink-100">
                  <input
                    required
                    type="date"
                    value={newDate}
                    onChange={(event) => setNewDate(event.target.value)}
                    onClick={openNativePicker}
                    className="date-input w-full min-w-0 text-sm font-medium text-zinc-900 outline-none"
                  />
                </span>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-600">
                Tür
                <select
                  value={newKind}
                  onChange={(event) => setNewKind(event.target.value as SharedCalendarEventKind)}
                  className="min-h-11 w-full min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 px-2 text-sm font-medium text-zinc-900 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
                >
                  {eventKinds.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>

            <label className="mb-3 flex flex-col gap-1.5 text-xs font-semibold text-zinc-600">
              Not <span className="font-normal text-zinc-400">(isteğe bağlı)</span>
              <textarea
                maxLength={500}
                rows={2}
                value={newNote}
                onChange={(event) => setNewNote(event.target.value)}
                placeholder="Bir plan, hediye fikri veya hatırlamak istediğin detay…"
                className="max-h-40 min-h-20 resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-900 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
              />
            </label>

            <label className="flex min-h-11 items-center gap-2.5 rounded-xl bg-zinc-50 px-3 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={repeats}
                onChange={(event) => setRepeats(event.target.checked)}
                className="size-4 accent-pink-400"
              />
              Her yıl tekrarla
            </label>

            {formError && <p role="alert" className="mt-3 text-xs font-semibold text-zinc-700">{formError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEventDialogOpen(false)}
                className="min-h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                İptal
              </button>
              <button
                type="submit"
                className="min-h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
              >
                {editingId ? 'Değişiklikleri kaydet' : 'Takvime ekle'}
              </button>
            </div>
          </form>
        )}
      </AnimatedDialog>
    </div>
  )
}

function EventCard({
  event,
  compact = false,
  onEdit,
  onRemove,
}: {
  event: CalendarEvent
  compact?: boolean
  onEdit?: () => void
  onRemove?: () => void
}) {
  const EventIcon = event.kind === 'birthday' ? CakeSlice : event.kind === 'anniversary' ? Heart : Sparkles
  const date = parseDateKey(event.date)

  return (
    <article className={`rounded-2xl border border-zinc-200/80 bg-white/80 ${compact ? 'px-3 py-3' : 'px-4 py-3.5'}`}>
      <div className="flex items-center gap-3">
        <div className={`grid shrink-0 place-items-center rounded-full bg-pink-50 text-pink-400 ${compact ? 'size-9' : 'size-10'}`}>
          <EventIcon className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-bold text-zinc-900">{event.title}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {validDateKey(event.date)
              ? date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'Tarih belirtilmemiş'}
          </p>
          {!compact && event.sourceId && (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-semibold text-zinc-500">
              {eventKindLabels[event.kind]}
              {event.repeats && <><span aria-hidden="true">·</span><Repeat2 className="size-3" aria-hidden="true" /> Her yıl</>}
            </p>
          )}
        </div>
        {event.kind === 'anniversary' && <Heart className="size-4 shrink-0 text-pink-300" fill="currentColor" aria-hidden="true" />}
      </div>
      {!compact && event.note && <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-600">{event.note}</p>}
      {(onEdit || onRemove) && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-zinc-100 pt-2">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={`${event.title} özel gününü düzenle`}
              className="icon-action inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              Düzenle
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`${event.title} özel gününü kaldır`}
              className="icon-action inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Kaldır
            </button>
          )}
        </div>
      )}
    </article>
  )
}
