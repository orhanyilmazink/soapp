'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Clock3, Heart, Moon, Settings2, Sun } from 'lucide-react'
import { useSharedAppState } from '@/lib/shared-app-state'
import { splitDuration, useNow } from '@/lib/use-now'

const pad = (n: number) => n.toString().padStart(2, '0')
export type AppTheme = 'light' | 'dark'
const themeOptions = [
  { id: 'light', label: 'Açık', Icon: Sun },
  { id: 'dark', label: 'Koyu', Icon: Moon },
] as const

export function HomeTab({
  theme,
  onThemeChange,
}: {
  theme: AppTheme
  onThemeChange: (theme: AppTheme) => void
}) {
  const now = useNow()
  const { state, updateSharedState } = useSharedAppState()
  const { firstName, secondName, togetherSince, meetupDate, meetupTime } = state
  const [settingsOpen, setSettingsOpen] = useState(false)
  const since = new Date(`${togetherSince}T00:00:00`).getTime()
  const together = now ? splitDuration(now - since) : null

  useEffect(() => {
    if (meetupDate && meetupTime) return
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const defaultDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`
    updateSharedState({ meetupDate: defaultDate, meetupTime: '11:00' })
  }, [meetupDate, meetupTime, updateSharedState])

  const nextMeetup = meetupDate && meetupTime ? new Date(`${meetupDate}T${meetupTime}:00`) : null
  const meetupLeft = now && nextMeetup ? splitDuration(nextMeetup.getTime() - now) : null

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col justify-center">
      <header className="surface-panel relative mb-5 px-5 py-4 text-center backdrop-blur-sm">
        <button
          type="button"
          aria-label={settingsOpen ? 'Ayarları kapat' : 'Ayarları aç'}
          aria-expanded={settingsOpen}
          aria-controls={settingsOpen ? 'home-settings' : undefined}
          onClick={() => setSettingsOpen((open) => !open)}
          className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
        >
          <Settings2 className="size-5" aria-hidden="true" />
        </button>
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <span className="font-script text-4xl leading-none text-zinc-900 sm:text-5xl">
            {firstName || 'Şevval'}
          </span>
          <Heart
            className="size-5 text-pink-300 drop-shadow-sm sm:size-6"
            fill="currentColor"
            strokeWidth={0}
            aria-hidden="true"
          />
          <span className="font-script text-4xl leading-none text-zinc-900 sm:text-5xl">
            {secondName || 'Orhan'}
          </span>
        </div>
        {settingsOpen && (
          <div
            id="home-settings"
            role="group"
            aria-label="Uygulama ayarları"
            className="mt-4 flex flex-col gap-3 text-left animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300"
          >
            <section className="rounded-2xl border border-zinc-200 bg-white/80 p-3">
              <label htmlFor="together-since" className="mb-2 block text-xs font-bold text-zinc-500">
                Birlikte başlangıç tarihi
              </label>
              <input
                id="together-since"
                type="date"
                value={togetherSince}
                required
                onChange={(event) => {
                  if (event.target.value) updateSharedState({ togetherSince: event.target.value })
                }}
                className="min-h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
              />
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white/80 p-3">
              <p className="mb-2 text-xs font-bold text-zinc-500">İsimler</p>
              <div className="flex flex-col gap-2">
                <label className="sr-only" htmlFor="first-person-name">İlk kişinin adı</label>
                <input
                  id="first-person-name"
                  aria-label="İlk kişinin adı"
                  type="text"
                  maxLength={24}
                  value={firstName}
                  onChange={(event) => updateSharedState({ firstName: event.target.value })}
                  placeholder="Şevval"
                  className="min-h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
                />
                <label className="sr-only" htmlFor="second-person-name">İkinci kişinin adı</label>
                <input
                  id="second-person-name"
                  aria-label="İkinci kişinin adı"
                  type="text"
                  maxLength={24}
                  value={secondName}
                  onChange={(event) => updateSharedState({ secondName: event.target.value })}
                  placeholder="Orhan"
                  className="min-h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white/80 p-3">
              <p className="mb-2 text-xs font-bold text-zinc-500">Tema</p>
              <div className="flex flex-col gap-2">
                {themeOptions.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={theme === id}
                    onClick={() => onThemeChange(id)}
                    className={`flex min-h-11 items-center justify-start gap-2 rounded-xl border px-3 text-sm font-bold transition-colors ${
                      theme === id
                        ? 'border-pink-300 bg-pink-50 text-pink-600'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
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

            <label className="flex min-h-16 min-w-0 items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-left transition-colors focus-within:ring-2 focus-within:ring-pink-200">
              <Clock3 className="size-4 shrink-0 text-pink-400" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Saat</span>
                <input
                  aria-label="Buluşma saati"
                  type="time"
                  value={meetupTime}
                  onChange={(event) => updateSharedState({ meetupTime: event.target.value })}
                  className="mt-0.5 block min-h-6 w-full min-w-0 appearance-none bg-transparent text-sm font-bold text-zinc-900 outline-none"
                />
              </span>
            </label>
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

    </div>
  )
}
