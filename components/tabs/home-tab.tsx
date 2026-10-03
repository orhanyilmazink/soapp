'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronRight, Clock3, Heart, X } from 'lucide-react'
import { config } from '@/lib/config'
import { useSharedAppState } from '@/lib/shared-app-state'
import { splitDuration, useNow } from '@/lib/use-now'

const pad = (n: number) => n.toString().padStart(2, '0')

export function HomeTab() {
  const now = useNow()
  const { state, updateSharedState } = useSharedAppState()
  const { meetupDate, meetupTime } = state
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)
  const [draftTime, setDraftTime] = useState('')
  const pickerDialogRef = useRef<HTMLDialogElement>(null)
  const since = new Date(config.togetherSince).getTime()
  const together = now ? splitDuration(now - since) : null

  useEffect(() => {
    if (meetupDate && meetupTime) return
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const defaultDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`
    updateSharedState({ meetupDate: defaultDate, meetupTime: '11:00' })
  }, [meetupDate, meetupTime, updateSharedState])

  useEffect(() => {
    const dialog = pickerDialogRef.current
    if (!dialog || !isTimePickerOpen) return

    const previousBodyOverflow = document.body.style.overflow
    const previousDocumentOverflow = document.documentElement.style.overflow
    if (!dialog.open) dialog.showModal()
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      if (dialog.open) dialog.close()
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousDocumentOverflow
    }
  }, [isTimePickerOpen])

  const nextMeetup = meetupDate && meetupTime ? new Date(`${meetupDate}T${meetupTime}:00`) : null
  const meetupLeft = now && nextMeetup ? splitDuration(nextMeetup.getTime() - now) : null

  function saveMeetupTime(time: string) {
    updateSharedState({ meetupTime: time })
  }

  function openTimePicker() {
    setDraftTime(meetupTime)
    setIsTimePickerOpen(true)
  }

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col justify-center">
      <header className="surface-panel mb-5 px-5 py-4 text-center backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <span className="font-script text-4xl leading-none text-zinc-900 sm:text-5xl">Şevval</span>
          <Heart
            className="size-5 text-pink-300 drop-shadow-sm sm:size-6"
            fill="currentColor"
            strokeWidth={0}
            aria-hidden="true"
          />
          <span className="font-script text-4xl leading-none text-zinc-900 sm:text-5xl">Orhan</span>
        </div>
      </header>

      <section
        aria-labelledby="counter-title"
        className="surface-panel relative overflow-hidden p-6 text-center"
      >
        <Heart
          className="absolute -right-6 -top-6 size-28 rotate-12 text-pink-100"
          fill="currentColor"
          strokeWidth={0}
          aria-hidden="true"
        />
        <Heart
          className="relative mx-auto mb-3 size-10 animate-heartbeat text-pink-300"
          fill="currentColor"
          strokeWidth={0}
          aria-hidden="true"
        />
        <h1 id="counter-title" className="relative text-sm font-bold text-muted-foreground">
          Birlikte geçirdiğimiz
        </h1>
        <p className="relative mt-1 flex items-baseline justify-center gap-2" aria-live="off">
          <span className="text-7xl font-black tabular-nums tracking-tight text-primary">
            {together ? together.days.toLocaleString('tr-TR') : '—'}
          </span>
          <span className="text-2xl font-bold text-foreground">gün</span>
        </p>

        <dl className="relative mt-5 grid grid-cols-3 gap-2">
          {[
            { label: 'saat', value: together?.hours },
            { label: 'dakika', value: together?.minutes },
            { label: 'saniye', value: together?.seconds },
          ].map((item) => (
            <div key={item.label} className="flex flex-col-reverse rounded-2xl bg-muted px-2 py-3">
              <dt className="text-xs font-semibold text-muted-foreground">{item.label}</dt>
              <dd className="text-2xl font-extrabold tabular-nums text-foreground">
                {item.value === undefined ? '--' : pad(item.value)}
              </dd>
            </div>
          ))}
        </dl>

      </section>

      <section className="surface-panel mt-5 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.38em] text-zinc-500">
              Bir dahaki buluşma
            </p>
          </div>
          <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-pink-500">
            Kalan süre
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="flex min-h-16 min-w-0 items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-left transition-colors focus-within:ring-2 focus-within:ring-pink-200">
            <CalendarDays className="size-4 shrink-0 text-pink-400" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Tarih</span>
              <input
                aria-label="Buluşma tarihi"
                type="date"
                value={meetupDate}
                onChange={(event) => updateSharedState({ meetupDate: event.target.value })}
                className="mt-0.5 block min-h-6 w-full min-w-0 appearance-none bg-transparent text-sm font-bold text-zinc-900 outline-none"
              />
            </span>
          </label>

            <button
              type="button"
              onClick={openTimePicker}
              className="flex min-h-16 min-w-0 items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-left outline-none transition-colors hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-pink-200"
            >
              <Clock3 className="size-4 shrink-0 text-pink-400" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Saat</span>
                <span className="mt-0.5 block truncate text-sm font-bold text-zinc-900">
                  {meetupTime || 'Saat seç'}
                </span>
              </span>
                <ChevronRight className="size-4 shrink-0 text-zinc-400" aria-hidden="true" />
            </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'gün', value: meetupLeft?.days },
            { label: 'saat', value: meetupLeft?.hours },
            { label: 'dk', value: meetupLeft?.minutes },
            { label: 'sn', value: meetupLeft?.seconds },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-zinc-50 px-2 py-3">
              <div className="text-2xl font-black tabular-nums text-zinc-900">
                {item.value === undefined ? '--' : pad(item.value)}
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <dialog
        ref={pickerDialogRef}
        aria-labelledby="meetup-time-picker-title"
        onCancel={(event) => {
          event.preventDefault()
          setIsTimePickerOpen(false)
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsTimePickerOpen(false)
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock3 className="size-5 text-pink-400" aria-hidden="true" />
              <div>
                <h2 id="meetup-time-picker-title" className="text-base font-bold">Saat seç</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Buluşma saatini düzenle</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Pencereyi kapat"
              onClick={() => setIsTimePickerOpen(false)}
              className="grid size-9 shrink-0 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <label className="mt-5 flex flex-col gap-2 text-xs font-semibold text-zinc-500">
            Buluşma saati
            <input
              aria-label="Buluşma saati"
              type="time"
              value={draftTime}
              onChange={(event) => setDraftTime(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-base font-medium text-zinc-900 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
            />
          </label>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsTimePickerOpen(false)}
              className="min-h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() => {
                saveMeetupTime(draftTime)
                setIsTimePickerOpen(false)
              }}
              disabled={!draftTime}
              className="min-h-11 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Kaydet
            </button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
