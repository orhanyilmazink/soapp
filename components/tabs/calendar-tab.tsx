'use client'

import { useLanguage } from '@/lib/language'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  CakeSlice,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Check,
  Pencil,
  Plus,
  Repeat2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { AnimatedDialog } from '@/components/animated-dialog'
import { SectionHeader } from '@/components/section-header'
import { calendarPlaceItemId } from '@/lib/calendar-links'
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
  { value: 'place', label: 'Gezilecek yer' },
]
const eventKindLabels = Object.fromEntries(eventKinds.map(({ value, label }) => [value, label]))
const selectableEventKinds = eventKinds.filter(({ value }) => value !== 'birthday' && value !== 'anniversary')
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
  birthdays: { id: string; name: string; date: string }[],
  t: (text: string, values?: Record<string, string | number>) => string
): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const relationshipStart = parseDateKey(togetherSince)
  const anniversaryNumber = year - relationshipStart.getFullYear()

  if (validDateKey(togetherSince) && anniversaryNumber > 0) {
    events.push({
      id: `anniversary-${year}`,
      title: anniversaryNumber === 1 ? t('İlk yıl dönümünüz') : t('{count}. yıl dönümünüz', { count: anniversaryNumber }),
      date: repeatedDateKey(year, relationshipStart),
      kind: 'anniversary',
    })
  }

  for (const birthday of birthdays) {
    const birthdayDate = parseDateKey(birthday.date)
    if (validDateKey(birthday.date) && year >= birthdayDate.getFullYear()) {
      events.push({
        id: `${birthday.id}-${year}`,
        title: t('{name} {age} yaşına giriyor', { name: birthday.name, age: year - birthdayDate.getFullYear() }),
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


function upcomingCalendarEvents(
  today: string,
  customEvents: SharedCalendarEvent[],
  togetherSince: string,
  birthdays: { id: string; name: string; date: string }[],
  t: (text: string, values?: Record<string, string | number>) => string
): CalendarEvent[] {
  if (!validDateKey(today)) return []
  const year = parseDateKey(today).getFullYear()
  const annual = [
    ...eventsForYear(year, [], togetherSince, birthdays, t),
    ...eventsForYear(year + 1, [], togetherSince, birthdays, t),
  ].filter((event) => event.date >= today).sort((a, b) => a.date.localeCompare(b.date))
  const nearestAnnual = new Map<string, CalendarEvent>()
  for (const event of annual) {
    const identity = event.kind === 'anniversary' ? 'anniversary' : event.id.replace(/-\d{4}$/, '')
    if (!nearestAnnual.has(identity)) nearestAnnual.set(identity, event)
  }
  const custom = customEvents.flatMap((event) => {
    if (!validDateKey(event.date)) return []
    if (!event.repeats) return event.date >= today ? [customCalendarEvent(event)] : []
    const original = parseDateKey(event.date)
    let nextYear = Math.max(year, original.getFullYear())
    let nextDate = repeatedDateKey(nextYear, original)
    if (nextDate < today) nextDate = repeatedDateKey(++nextYear, original)
    return [customCalendarEvent(event, nextDate)]
  })
  return [...nearestAnnual.values(), ...custom].sort((a, b) => a.date.localeCompare(b.date))
}

export function CalendarTab() {
  const { t, locale, language } = useLanguage()

  const weekdayLabels = language === 'tr' ? ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
  const fullDateFormatter = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'long' })
  const dayMonthYearFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' })
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
  const [calendarAction, setCalendarAction] = useState<'add' | 'manage'>('add')
  const isManageSelected = calendarAction === 'manage' && customEvents.length > 0
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newKind, setNewKind] = useState<SharedCalendarEventKind>('special')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const today = new Date()
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(dateKey(today))
  }, [])

  const todayKey = now ? dateKey(new Date(now)) : ''
  const today = now ? new Date(now) : new Date()
  const todayLabel = t('Bugün {date}', { date: `${weekdayFormatter.format(today)}, ${dayMonthYearFormatter.format(today)}` })
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
        ...eventsForYear(visibleYear - 1, customEvents, state.togetherSince, birthdaysForCouple, t),
        ...eventsForYear(visibleYear, customEvents, state.togetherSince, birthdaysForCouple, t),
        ...eventsForYear(visibleYear + 1, customEvents, state.togetherSince, birthdaysForCouple, t),
      ]
    : [], [visibleYear, customEvents, state.togetherSince, birthdaysForCouple, t])
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
  const upcomingEvents = useMemo(() => upcomingCalendarEvents(todayKey, customEvents, state.togetherSince, birthdaysForCouple, t),
    [todayKey, customEvents, state.togetherSince, birthdaysForCouple, t])
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
    const existingEvent = editingId ? customEventsById.get(editingId) : undefined
    const savedEvent: SharedCalendarEvent = {
      id: editingId ?? `special-${typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
      title,
      date: newDate,
      kind: newKind,
      repeats: newKind === 'place' ? false : (existingEvent?.repeats ?? false),
      ...(existingEvent?.note ? { note: existingEvent.note } : {}),
    }
    const nextEvents = editingId
      ? customEvents.map((item) => item.id === editingId ? savedEvent : item)
      : [...customEvents, savedEvent]
    updateSharedState({
      calendarEvents: nextEvents,
      ...(savedEvent.kind !== 'place' ? { done: state.done.filter((id) => id !== calendarPlaceItemId(savedEvent.id)) } : {}),
    })
    setSelectedDate(newDate)
    const date = parseDateKey(newDate)
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    setIsEventDialogOpen(false)
  }

  function openEventForm(event?: SharedCalendarEvent) {
    if (!event) setCalendarAction('add')
    setIsManageOpen(false)
    setPendingDeletion(null)
    setEditingId(event?.id ?? null)
    setNewTitle(event?.title ?? '')
    setNewDate(event?.date ?? (selectedDate || todayKey))
    setNewKind(event?.kind ?? 'special')
    setFormError('')
    setIsEventDialogOpen(true)
  }

  function requestRemoval(event: SharedCalendarEvent) {
    setIsManageOpen(false)
    setPendingDeletion(event)
    setIsEventDialogOpen(true)
  }

  function openManage() {
    setCalendarAction('manage')
    setIsEventDialogOpen(false)
    setIsManageOpen(true)
  }

  function removeCustomEvent() {
    if (!pendingDeletion) return
    updateSharedState({
      calendarEvents: customEvents.filter((event) => event.id !== pendingDeletion.id),
      custom: state.custom.filter((item) => item.id !== calendarPlaceItemId(pendingDeletion.id)),
      done: state.done.filter((id) => id !== calendarPlaceItemId(pendingDeletion.id)),
    })
    setIsEventDialogOpen(false)
  }

  return (
    <div className="pb-2">
      <SectionHeader title={t("Takvim")} largeTitle />

      <section aria-label={t("İlişki takvimi")} className="surface-panel p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            aria-label={t("Önceki ay")}
            onClick={() => moveMonth(-1)}
            disabled={!visibleMonth}
            className="grid size-10 place-items-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <h2 className="text-base font-bold capitalize text-zinc-900">
            {visibleMonth ? monthFormatter.format(visibleMonth) : t("Takvim yükleniyor")}
          </h2>
          <button
            type="button"
            aria-label={t("Sonraki ay")}
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
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-pink-400" /> {t("Özel gününüz")}</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full border border-pink-300" /> {t("Bugün")}</span>
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
              className="flex h-[52px] min-w-0 flex-1 items-center justify-center rounded-full border border-border bg-background/70 px-3 text-center transition-transform duration-250 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="text-xs font-bold leading-tight text-foreground">
                {todayLabel}
              </span>
            </button>
          <div
            role="group"
            aria-label={t("Ekle / Yönet")}
            className="flex shrink-0 items-center gap-2"
          >
            <button
              type="button"
              aria-label={t("Ekle")}
              aria-pressed={!isManageSelected}
              aria-haspopup="dialog"
              onClick={() => {
                setIsManageOpen(false)
                openEventForm()
              }}
              className="flex size-[52px] shrink-0 items-center justify-center rounded-full border border-border bg-background/70 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Plus className="size-5" style={{ color: '#ffffff' }} aria-hidden="true" />
            </button>
            {customEvents.length > 0 && (
              <button
                type="button"
                aria-label={t("Yönet")}
                onClick={openManage}
                aria-haspopup="dialog"
                aria-pressed={isManageSelected}
                aria-expanded={isManageOpen}
                aria-controls="managed-calendar-events"
                className="flex size-[52px] shrink-0 items-center justify-center rounded-full border border-border bg-background/70 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Pencil className="size-5" style={{ color: '#ffffff' }} aria-hidden="true" />
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
            <p className="text-sm text-zinc-500">{t("Bugün için takvimde özel bir tarih yok.")}</p>
          </div>
        )}
      </section>

      <section className="mt-3" aria-labelledby="upcoming-events-title">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-pink-400" aria-hidden="true" />
          <h2 id="upcoming-events-title" className="text-base font-bold text-zinc-900">{t("Yaklaşan özel günler")}</h2>
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
            <li className="rounded-2xl bg-white/60 px-4 py-3 text-sm text-zinc-500">{t(now ? 'Yaklaşan özel gün yok.' : 'Yaklaşan tarihler yükleniyor.')}</li>
          )}
        </ul>
      </section>

      <AnimatedDialog
        open={isEventDialogOpen || isManageOpen}
        onClose={() => {
          setIsEventDialogOpen(false)
          setIsManageOpen(false)
        }}
        titleId="calendar-event-dialog-title"
        descriptionId={!isManageOpen && pendingDeletion ? 'calendar-event-dialog-description' : undefined}
        className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-5 text-left shadow-2xl"
      >
        {isManageOpen ? (
          <div id="managed-calendar-events">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-pink-100 text-pink-500">
                  <Pencil className="size-5" aria-hidden="true" />
                </div>
                <h2 id="calendar-event-dialog-title" className="font-bold text-zinc-900">{t("Özel günleri yönet")}</h2>
              </div>
              <button type="button" aria-label={t("Pencereyi kapat")} onClick={() => setIsManageOpen(false)}
                className="icon-action grid size-9 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <ul className="space-y-2">
              {managedEvents.map((event) => (
                <li key={event.id}>
                  <EventCard event={customCalendarEvent(event)} onEdit={() => openEventForm(event)} onRemove={() => requestRemoval(event)} />
                </li>
              ))}
            </ul>
          </div>
        ) : pendingDeletion ? (
          <div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="calendar-event-dialog-title" className="font-bold text-zinc-900">{t("Özel günü kaldır")}</h2>
                <p id="calendar-event-dialog-description" className="mt-2 break-words text-sm text-zinc-500">
                  {t('“{title}” takvimden kaldırılsın mı?', { title: pendingDeletion.title })}
                  {pendingDeletion.repeats ? t("Her yıl tekrarlanan günleri de kaldırılır.") : ''}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("Pencereyi kapat")}
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
                {t("Vazgeç")}</button>
              <button
                type="button"
                onClick={removeCustomEvent}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {t("Kaldır")}</button>
            </div>
          </div>
        ) : (
          <form onSubmit={saveCustomEvent}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-pink-100 text-pink-500">
                  <Plus className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="calendar-event-dialog-title" className="font-bold text-zinc-900">
                    {editingId ? t("Özel günü düzenle") : t("Özel gün ekle")}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                aria-label={t("Pencereyi kapat")}
                onClick={() => setIsEventDialogOpen(false)}
                className="icon-action grid size-9 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <label className="mb-3 flex flex-col gap-1.5 text-xs font-semibold text-zinc-600">
              <span className="sr-only">{t("Günün adı")}</span><input
                required
                maxLength={48}
                placeholder={t("Günün adı...")}
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                className="min-h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-900 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
              />
            </label>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-600">
                <span className="sr-only">{t("Tarih")}</span><span className="date-field flex h-11 w-full min-w-0 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 focus-within:border-pink-300 focus-within:ring-2 focus-within:ring-pink-100">
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
                <span className="sr-only">{t("Tür")}</span><select
                  value={newKind}
                  onChange={(event) => {
                    const kind = event.target.value as SharedCalendarEventKind
                    setNewKind(kind)
                  }}
                  className="h-11 w-full min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-900 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
                >
                  {editingId && (newKind === 'birthday' || newKind === 'anniversary') && (
                    <option value={newKind} hidden>{t(eventKindLabels[newKind])}</option>
                  )}
                  {selectableEventKinds.map(({ value, label }) => <option key={value} value={value}>{t(label)}</option>)}
                </select>
              </label>
            </div>

            {formError && <p role="alert" className="mt-3 text-xs font-semibold text-zinc-700">{formError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEventDialogOpen(false)}
                className="min-h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                {t("İptal")}</button>
              <button
                type="submit"
                className="min-h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
              >
                {editingId ? t("Değişiklikleri kaydet") : t("Takvime ekle")}
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
  const { t, locale } = useLanguage()

  const { state } = useSharedAppState()
  const isDone = event.kind === 'place' && !!event.sourceId && state.done.includes(calendarPlaceItemId(event.sourceId))
  const EventIcon = event.kind === 'place' ? MapPin : event.kind === 'birthday' ? CakeSlice : event.kind === 'anniversary' ? Heart : Sparkles
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
              ? date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
              : t("Tarih belirtilmemiş")}
          </p>
          {isDone && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              <Check className="size-3" aria-hidden="true" />{t('Yapıldı')}
            </span>
          )}
          {!compact && event.sourceId && (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-semibold text-zinc-500">
              {t(eventKindLabels[event.kind])}
              {event.repeats && <><span aria-hidden="true">·</span><Repeat2 className="size-3" aria-hidden="true" /> {t("Her yıl")}</>}
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
              aria-label={t('{title} özel gününü düzenle', { title: event.title })}
              className="icon-action inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              {t("Düzenle")}</button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={t('{title} özel gününü kaldır', { title: event.title })}
              className="icon-action inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              {t("Kaldır")}</button>
          )}
        </div>
      )}
    </article>
  )
}
