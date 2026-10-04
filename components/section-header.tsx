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
  return (
    <header className="mb-6 text-center">
      {eyebrow && <p className="text-[10px] font-black uppercase tracking-[0.26em] text-primary/80">{eyebrow}</p>}
      <h1 className={`${largeTitle ? 'mt-0 text-6xl leading-[1.05]' : 'mt-2 text-5xl leading-[1.15]'} py-1 font-script font-bold text-foreground text-balance drop-shadow-[0_8px_18px_rgba(251,113,133,0.08)]`}>
        {title}
      </h1>
      {description && <p className="mx-auto mt-3 max-w-xs font-sans text-xs font-semibold leading-relaxed tracking-wide text-muted-foreground text-pretty">{description}</p>}
    </header>
  )
}
