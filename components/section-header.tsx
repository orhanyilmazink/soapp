'use client'

import { useLanguage } from '@/lib/language'

import type { ReactNode } from 'react'

export function SectionHeader({
  eyebrow,
  title,
  description,
  largeTitle = false,
}: {
  eyebrow?: string
  title: ReactNode
  description?: string
  largeTitle?: boolean
}) {
  const { t } = useLanguage()

  return (
    <header className="mb-6 text-center">
      {eyebrow && <p className="text-[10px] font-black uppercase tracking-[0.26em] text-primary/80">{t(eyebrow)}</p>}
      <h1 className={`${largeTitle ? 'mt-0 text-6xl leading-[1.05]' : 'mt-2 text-5xl leading-[1.15]'} py-1 font-script font-bold text-foreground text-balance`}>
        {typeof title === 'string' ? t(title) : title}
      </h1>
      {description && <p className="mx-auto mt-3 max-w-xs font-sans text-xs font-semibold leading-relaxed tracking-wide text-muted-foreground text-pretty">{t(description)}</p>}
    </header>
  )
}
