export function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <header className="mb-6 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-primary/80">{eyebrow}</p>
      <h1 className="mt-2 py-1 font-script text-5xl font-bold leading-[1.15] text-foreground text-balance drop-shadow-[0_8px_18px_rgba(251,113,133,0.08)]">
        {title}
      </h1>
      {description && <p className="mx-auto mt-3 max-w-xs font-sans text-xs font-semibold leading-relaxed tracking-wide text-muted-foreground text-pretty">{description}</p>}
    </header>
  )
}
