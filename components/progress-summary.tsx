'use client'

import { useLanguage } from '@/lib/language'

/** Shared, half-height summary used at the same position on all three tabs. */
export function ProgressSummary({ label, completed, total }: { label: string; completed: number; total: number }) {
  const { t, language } = useLanguage()
  const percent = total ? Math.min(100, Math.round((completed / total) * 100)) : 0
  return (
    <section aria-label={t(label)} className="progress-summary mb-5 h-[72px] rounded-2xl bg-foreground px-5 py-2.5 text-background shadow-[0_14px_30px_-16px_oklch(0.18_0_0/0.5)]">
      <div className="flex h-9 items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">{t(label)}</p>
          <p className="whitespace-nowrap text-xl font-extrabold tabular-nums">
            {completed}<span className="text-xs font-semibold opacity-60"> / {total}</span>
          </p>
        </div>
        <p className="text-2xl font-extrabold tabular-nums text-primary">{language === 'tr' ? `%${percent}` : `${percent}%`}</p>
      </div>
      <div role="progressbar" aria-label={t(label)} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-background/15">
        <div className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
      </div>
    </section>
  )
}
