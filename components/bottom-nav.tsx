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
        className="bottom-nav-panel mx-auto flex max-w-md items-center justify-between gap-1 rounded-full border p-1.5 backdrop-blur-xl"
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
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(id)}
              onKeyDown={(event) => {
                const currentIndex = tabs.findIndex((item) => item.id === id)
                const nextIndex = event.key === 'ArrowRight' ? (currentIndex + 1) % tabs.length
                  : event.key === 'ArrowLeft' ? (currentIndex + tabs.length - 1) % tabs.length
                    : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
                if (nextIndex === null) return
                event.preventDefault()
                onChange(tabs[nextIndex].id)
                document.getElementById(`tab-${tabs[nextIndex].id}`)?.focus()
              }}
              className={cn(
                'group relative flex flex-1 flex-col items-center gap-0.5 overflow-hidden rounded-full px-1 py-2 text-[10px] font-semibold transition-[color,transform] duration-250 ease-out',
                isActive ? 'text-foreground' : 'scale-[0.94] text-zinc-500 hover:text-zinc-700'
              )}
            >
              <span aria-hidden="true" className={cn('bottom-nav-active absolute inset-0 rounded-full transition-opacity', isActive ? 'opacity-100' : 'opacity-0')} />
              <span
                className={cn(
                  'relative flex flex-col items-center gap-0.5 transition-[transform,opacity] duration-250 ease-out',
                  isActive ? 'scale-105' : 'scale-90 opacity-80'
                )}
              >
                <Icon
                  className={cn('size-5 transition-colors duration-250 ease-out', isActive ? 'text-primary' : '')}
                  aria-hidden="true"
                  fill={isActive ? 'currentColor' : 'none'}
                  strokeWidth={isActive ? 1.8 : 2}
                />
                <span className={cn('leading-none transition-colors duration-250', isActive ? 'font-bold text-foreground' : 'font-medium')}>
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
