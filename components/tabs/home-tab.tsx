'use client'

import { useLanguage } from '@/lib/language'

import { useEffect } from 'react'
import { CalendarDays, Clock3, Heart } from 'lucide-react'
import { MetalGears } from '@/components/metal-gears'
import { useSharedAppState } from '@/lib/shared-app-state'
import { splitDuration, useNow } from '@/lib/use-now'

const pad = (n: number) => n.toString().padStart(2, '0')

export function HomeTab({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { t, locale } = useLanguage()

  const now = useNow()
  const { state, updateSharedState } = useSharedAppState()
  const { firstName, secondName, togetherSince, meetupDate, meetupTime } = state
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
    <div className="relative flex min-h-[calc(100dvh-12rem)] flex-col justify-center pt-12">
      <button
        type="button"
        aria-label={t("Ayarları aç")}
        onClick={onOpenSettings}
        className="absolute left-0 top-0 z-50 grid size-11 place-items-center rounded-full border border-border/80 bg-card/90 text-foreground shadow-sm backdrop-blur transition hover:scale-105 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
      >
        <MetalGears />
      </button>

      <header className="surface-panel mb-5 px-5 py-4 text-center backdrop-blur-sm">
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
          className="relative mx-auto mb-3 size-12 animate-heartbeat text-pink-300"
          fill="currentColor"
          strokeWidth={0}
          aria-hidden="true"
        />
        <h1 id="counter-title" className="relative text-[11px] font-black uppercase tracking-[0.42em] text-zinc-500">
          {t("Birlikte geçirdiğimiz")}</h1>
        <p className="relative mt-1 flex items-baseline justify-center gap-2" aria-live="off">
          <span className="text-7xl font-black tabular-nums tracking-tight text-primary">
            {together ? together.days.toLocaleString(locale) : '—'}
          </span>
          <span className="text-2xl font-bold text-foreground">{t("gün")}</span>
        </p>

        <dl className="relative mt-5 grid grid-cols-3 gap-2">
          {[
            { label: t("saat"), value: together?.hours },
            { label: t("dakika"), value: together?.minutes },
            { label: t("saniye"), value: together?.seconds },
          ].map((item) => (
            <div key={t(item.label)} className="flex flex-col-reverse rounded-2xl bg-muted px-2 py-3">
              <dt className="text-xs font-semibold text-muted-foreground">{t(item.label)}</dt>
              <dd className="text-2xl font-extrabold tabular-nums text-foreground">
                {item.value === undefined ? '--' : pad(item.value)}
              </dd>
            </div>
          ))}
        </dl>

      </section>

      <section aria-labelledby="meetup-countdown-title" className="surface-panel mt-5 p-5 backdrop-blur-sm">
        <h2 id="meetup-countdown-title" className="w-full text-center text-[10px] font-black uppercase tracking-[0.38em] text-zinc-500 text-balance">
          {t("Bir dahaki buluşmaya kalan süre")}
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="flex h-16 min-w-0 items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-left transition-colors focus-within:ring-2 focus-within:ring-pink-200">
            <CalendarDays className="size-4 shrink-0 text-pink-400" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{t("Tarih")}</span>
              <input
                aria-label={t("Buluşma tarihi")}
                type="date"
                value={meetupDate}
                onChange={(event) => updateSharedState({ meetupDate: event.target.value })}
                className="mt-0.5 block min-h-6 w-full min-w-0 appearance-none bg-transparent text-sm font-bold text-zinc-900 outline-none"
              />
            </span>
          </label>

            <label className="flex h-16 min-w-0 items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-left transition-colors focus-within:ring-2 focus-within:ring-pink-200">
              <Clock3 className="size-4 shrink-0 text-pink-400" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{t("Saat")}</span>
                <input
                  aria-label={t("Buluşma saati")}
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
            { label: t("gün"), value: meetupLeft?.days },
            { label: t("saat"), value: meetupLeft?.hours },
            { label: t("dk"), value: meetupLeft?.minutes },
            { label: t("sn"), value: meetupLeft?.seconds },
          ].map((item) => (
            <div key={t(item.label)} className="rounded-2xl bg-zinc-50 px-2 py-3">
              <div className="text-2xl font-black tabular-nums text-zinc-900">
                {item.value === undefined ? '--' : pad(item.value)}
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {t(item.label)}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
