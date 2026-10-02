'use client'

import { Award, CalendarDays, House, ListChecks, Mail, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabId = 'home' | 'calendar' | 'achievements' | 'todo' | 'letter'

const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Ana Sayfa', icon: House },
  { id: 'todo', label: 'Yapılacaklar', icon: ListChecks },
  { id: 'calendar', label: 'Takvim', icon: CalendarDays },
  { id: 'achievements', label: 'Başarımlar', icon: Award },
  { id: 'letter', label: 'Özel Mesaj', icon: Mail },
]

export function BottomNav({
  active,
  onChange,
}: {
  active: TabId
  onChange: (tab: TabId) => void
}) {
  return (
    <nav
      aria-label="Ana menü"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
    >
      <div
        role="tablist"
        className="mx-auto flex max-w-md items-center justify-between gap-1 rounded-full border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(244,244,246,0.92))] p-1.5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl"
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = id === active
          return (
            <button
              key={id}
              id={`tab-${id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${id}`}
              onClick={() => onChange(id)}
              className={cn(
                'group relative flex flex-1 flex-col items-center gap-0.5 overflow-hidden rounded-full px-1 py-2 text-[10px] font-semibold transition-all duration-250 ease-out',
                isActive ? 'text-foreground' : 'scale-[0.94] text-zinc-500 hover:text-zinc-700'
              )}
            >
              {isActive && (
                <span className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,114,182,0.1),rgba(255,255,255,0.82))] shadow-[inset_0_1px_1px_rgba(255,255,255,0.96),0_12px_24px_-18px_rgba(24,24,27,0.6)] backdrop-blur-xl" />
              )}
              <span
                className={cn(
                  'relative flex flex-col items-center gap-0.5 transition-all duration-250 ease-out',
                  isActive ? 'scale-105' : 'scale-90 opacity-80'
                )}
              >
                <Icon
                  className={cn('size-5 transition-all duration-250 ease-out', isActive ? 'text-primary' : '')}
                  aria-hidden="true"
                  fill={isActive ? 'currentColor' : 'none'}
                  strokeWidth={isActive ? 1.8 : 2}
                />
                <span className={cn('leading-none transition-all duration-250', isActive ? 'font-bold text-foreground' : 'font-medium')}>
                  {label}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
