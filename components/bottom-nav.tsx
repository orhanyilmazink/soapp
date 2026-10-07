'use client'

import { useLanguage } from '@/lib/language'
import { useLayoutEffect, useRef } from 'react'
import { attachViewportDock } from '@/lib/viewport-dock'

import { Award, CalendarDays, House, ListChecks, ShoppingBasket, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DraggableTabList } from '@/components/draggable-tab-list'

export type TabId = 'home' | 'calendar' | 'achievements' | 'todo' | 'wishlist'

const tabs: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Ana Sayfa', icon: House },
  { id: 'todo', label: 'Yapılacaklar', icon: ListChecks },
  { id: 'wishlist', label: 'İstekler', icon: ShoppingBasket },
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
      className="bottom-nav-dock absolute inset-x-0 bottom-0 z-40 px-6"
    >
      <DraggableTabList
        onSelect={index => onChange(tabs[index].id)}
        role="tablist"
        className="bottom-nav-panel mx-auto flex max-w-[400px] items-center justify-between rounded-full border p-1"
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
                'bottom-nav-tab group relative flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-full px-0.5 text-[10px] font-semibold transition-colors duration-250 ease-out',
                isActive ? 'text-primary' : 'text-foreground'
              )}
            >
              <span
                className={cn(
                  'relative flex flex-col items-center gap-1'
                )}
              >
                <Icon
                  className="size-[23px] transition-colors duration-250 ease-out"
                  aria-hidden="true"
                  fill={isActive && id === 'home' ? 'currentColor' : 'none'}
                  strokeWidth={isActive ? 1.8 : 2}
                />
                <span className="whitespace-nowrap leading-[12px]">
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
