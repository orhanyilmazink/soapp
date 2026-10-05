'use client'

import { useLanguage } from '@/lib/language'
import { useLayoutEffect, useRef } from 'react'
import { attachViewportDock } from '@/lib/viewport-dock'

import { Award, CalendarDays, House, ListChecks, Heart, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DraggableTabList } from '@/components/draggable-tab-list'

export type TabId = 'home' | 'calendar' | 'achievements' | 'todo' | 'wishlist'

const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Ana Sayfa', icon: House },
  { id: 'todo', label: 'Yapılacaklar', icon: ListChecks },
  { id: 'wishlist', label: 'İstekler', icon: Heart },
  { id: 'achievements', label: 'Başarımlar', icon: Award },
  { id: 'calendar', label: 'Takvim', icon: CalendarDays },
]

export function BottomNav({
  active,
  onChange,
}: {
  active: TabId
  onChange: (tab: TabId) => void
}) {
  const { t, language } = useLanguage()
  const navRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (navRef.current) return attachViewportDock(navRef.current)
  }, [])

  return (
    <nav
      ref={navRef}
      aria-label={t("Ana menü")}
      className="bottom-nav-dock absolute inset-x-0 bottom-0 z-40 px-4"
    >
      <DraggableTabList
        onSelect={index => onChange(tabs[index].id)}
        role="tablist"
        className="bottom-nav-panel mx-auto flex max-w-md items-center justify-between gap-1 rounded-full border p-1.5"
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
                  {id === 'achievements' && language === 'en' ? 'Awards' : t(label)}
                </span>
              </span>
            </button>
          )
        })}
      </DraggableTabList>
    </nav>
  )
}
