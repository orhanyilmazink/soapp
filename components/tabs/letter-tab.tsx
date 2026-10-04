'use client'

import { memo, useState, type ReactNode } from 'react'
import { Gift, Heart, Lock, MailOpen, Sparkles } from 'lucide-react'
import { SectionHeader } from '@/components/section-header'
import { config, gift, letter } from '@/lib/config'
import { useSharedAppState } from '@/lib/shared-app-state'
import { splitDuration, useNow } from '@/lib/use-now'

export function LetterTab() {
  const now = useNow()
  const { state } = useSharedAppState()
  const [opened, setOpened] = useState(false)
  const unlockAt = new Date(config.birthday).getTime()
  const unlocked = now !== null && now >= unlockAt
  return (
    <div>
      <section aria-label="Doğum günü kutlaması" className="mb-8 text-center">
        <SectionHeader title={<>İyi ki Doğdun<br />{config.partnerName}</>} largeTitle />
        <div className="surface-panel mt-5 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,247,249,0.8))] px-5 py-5 text-left">
          <p className="font-serif text-[16px] leading-8 tracking-[0.01em] text-foreground text-pretty">{state.specialMessage}</p>
        </div>
      </section>

      <SectionHeader title="Özel Hediye" largeTitle />

      {now === null ? (
        <div className="h-80 animate-pulse rounded-3xl bg-muted" />
      ) : !unlocked ? (
        <LockedEnvelope remaining={unlockAt - now} />
      ) : opened ? (
        <LetterPaper />
      ) : (
        <button
          type="button"
          onClick={() => setOpened(true)}
          className="group w-full transition-transform active:scale-95"
          aria-label="Mektubu aç"
        >
          <Envelope>
            <span className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground shadow-md transition-transform group-hover:scale-105">
              <MailOpen className="size-4" aria-hidden="true" />
              Mektubu aç
            </span>
          </Envelope>
        </button>
      )}
    </div>
  )
}

function Envelope({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="surface-panel mx-auto w-full overflow-hidden shadow-[0_18px_35px_-24px_rgba(24,24,27,0.24)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1/2 bg-accent [clip-path:polygon(0_0,100%_0,50%_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1/2 bg-card/60 [clip-path:polygon(0_100%,50%_0,100%_100%)]"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">{children}</div>
      </div>
      {footer && <div className="border-t border-border/80 bg-card/40 p-4">{footer}</div>}
    </div>
  )
}

function LockedEnvelope({ remaining }: { remaining: number }) {
  const { days, hours, minutes, seconds } = splitDuration(remaining)
  const units = [
    { label: 'gün', value: days },
    { label: 'saat', value: hours },
    { label: 'dakika', value: minutes },
    { label: 'saniye', value: seconds },
  ]

  return (
    <section aria-label="Mektup ve açılmasına kalan süre">
      <Envelope
        footer={(
          <dl className="grid grid-cols-4 gap-2 text-center">
          {units.map((u) => (
            <div key={u.label} className="flex flex-col-reverse rounded-2xl bg-muted px-1 py-3">
              <dt className="text-[11px] font-semibold text-muted-foreground">{u.label}</dt>
              <dd className="text-2xl font-extrabold tabular-nums text-primary">{u.value.toString().padStart(2, '0')}</dd>
            </div>
          ))}
          </dl>
        )}
      >
        <span className="flex size-16 animate-wiggle items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground shadow-lg">
          <Lock className="size-7" aria-hidden="true" />
        </span>
        <span className="rounded-full bg-card/85 px-4 py-1.5 text-sm font-bold text-foreground backdrop-blur">
          Henüz kilitli
        </span>
      </Envelope>
    </section>
  )
}

const LetterPaper = memo(function LetterPaper() {
  return (
    <article className="surface-panel relative px-6 py-8 animate-in fade-in zoom-in-95 slide-in-from-bottom-6 duration-700 [background-image:repeating-linear-gradient(transparent,transparent_31px,oklch(0.88_0_0/0.6)_32px)]">
      <Heart
        className="absolute -top-4 left-1/2 size-9 -translate-x-1/2 animate-heartbeat text-primary"
        fill="currentColor"
        strokeWidth={0}
        aria-hidden="true"
      />
      <p className="font-script text-3xl font-bold leading-8 text-primary">{letter.greeting}</p>
      <div className="mt-4 flex flex-col gap-8">
        {letter.paragraphs.map((p, i) => (
          <p key={i} className="leading-8 text-foreground text-pretty">
            {p}
          </p>
        ))}
      </div>
      <p className="mt-8 text-right leading-8 text-muted-foreground">{letter.signOff}</p>
      <p className="text-right font-script text-3xl font-bold leading-8 text-primary">{config.senderName}</p>
      <GiftBox />
    </article>
  )
})

function GiftBox() {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="mt-8 rounded-3xl border-2 border-dashed border-primary/40 bg-secondary/60 p-5 text-center">
      {revealed ? (
        <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-90 duration-500" aria-live="polite">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <Sparkles className="size-7" aria-hidden="true" />
          </span>
          <p className="py-1 font-script text-3xl font-bold leading-[1.2] text-primary">{gift.title}</p>
          <p className="text-sm leading-relaxed text-foreground text-pretty">{gift.message}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="group flex w-full flex-col items-center gap-3 transition-transform active:scale-95"
        >
          <span className="flex size-16 animate-wiggle items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-105">
            <Gift className="size-8" aria-hidden="true" />
          </span>
          <span className="font-bold text-foreground">{gift.title}</span>
          <span className="text-xs font-semibold text-muted-foreground">{gift.hint}</span>
        </button>
      )}
    </div>
  )
}
