'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Clapperboard,
  Gamepad2,
  LayoutGrid,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Tv,
  UtensilsCrossed,
} from 'lucide-react'
import { SectionHeader } from '@/components/section-header'
import { categories, type ActiveCategoryId } from '@/lib/bucket-list'
import { useSharedBucketList } from '@/lib/shared-app-state'
import { cn } from '@/lib/utils'

const icons: Record<ActiveCategoryId, typeof MapPin> = {
  places: MapPin,
  games: Gamepad2,
  series: Tv,
  movies: Clapperboard,
  food: UtensilsCrossed,
}

const shortLabels: Record<ActiveCategoryId, string> = {
  places: 'Yerler',
  games: 'Oyunlar',
  series: 'Diziler',
  movies: 'Filmler',
  food: 'Lezzetler',
}

type Filter = ActiveCategoryId | 'all'
type BucketItem = { id: string; text: string; custom: boolean }
type PendingDeletion = { ids: string[]; category: ActiveCategoryId }

const rowExitDuration = 360

export function BucketListTab() {
  const { done, custom, toggle, add, remove } = useSharedBucketList()
  const [filter, setFilter] = useState<Filter>('all')
  const [editingCategory, setEditingCategory] = useState<ActiveCategoryId | null>(null)
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([])
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null)
  const removeRef = useRef(remove)

  useEffect(() => {
    removeRef.current = remove
  }, [remove])

  useEffect(() => {
    if (!pendingDeletion) return
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : rowExitDuration
    const timeout = window.setTimeout(() => {
      removeRef.current(pendingDeletion.ids)
      setSelectedForDeletion([])
      setEditingCategory(null)
      setPendingDeletion(null)
    }, delay)

    return () => window.clearTimeout(timeout)
  }, [pendingDeletion])

  const changeFilter = (nextFilter: Filter) => {
    setFilter(nextFilter)
    setEditingCategory(null)
    setSelectedForDeletion([])
    setPendingDeletion(null)
  }

  const { groups, totalCount, doneCount } = useMemo(() => {
    const customByCategory = new Map<string, BucketItem[]>()
    for (const item of custom) {
      const items = customByCategory.get(item.category) ?? []
      items.push({ id: item.id, text: item.text, custom: true })
      customByCategory.set(item.category, items)
    }

    let totalCount = 0
    let doneCount = 0
    const groups = categories.map((category) => {
      const customItems = customByCategory.get(category.id) ?? []
      const items = [...category.items.map((item) => ({ ...item, custom: false })), ...customItems]
      const remaining: BucketItem[] = []
      const completed: BucketItem[] = []
      for (const item of items) {
        if (done.has(item.id)) completed.push(item)
        else remaining.push(item)
      }
      totalCount += items.length
      doneCount += completed.length

      return {
        ...category,
        items: [...remaining, ...completed],
        doneCount: completed.length,
        customCount: customItems.length,
      }
    })

    return { groups, totalCount, doneCount }
  }, [custom, done])

  const selectedIds = useMemo(() => new Set(selectedForDeletion), [selectedForDeletion])
  const deletingIds = useMemo(() => new Set(pendingDeletion?.ids ?? []), [pendingDeletion])
  const percent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0
  const visible = filter === 'all' ? groups : groups.filter((g) => g.id === filter)

  return (
    <div>
      <SectionHeader title="Yapılacaklar" largeTitle />

      <section
        aria-label="Genel ilerleme"
        className="mb-5 rounded-3xl bg-foreground p-5 text-background shadow-[0_14px_30px_-16px_oklch(0.18_0_0/0.5)]"
      >
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">Tamamlanan</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">
              {doneCount}
              <span className="text-lg font-semibold opacity-60">{` / ${totalCount}`}</span>
            </p>
          </div>
          <p className="text-4xl font-extrabold tabular-nums text-primary">{`%${percent}`}</p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tamamlanma oranı"
          className="mt-4 h-2.5 overflow-hidden rounded-full bg-background/15"
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[var(--motion-ease)]" style={{ width: `${percent}%` }} />
        </div>
      </section>

      <div
        role="group"
        aria-label="Kategoriler"
        className="mx-auto mb-5 flex w-full max-w-md items-center gap-1 rounded-full border border-border/70 bg-card p-1.5 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.5)]"
      >
        <FilterChip active={filter === 'all'} onClick={() => changeFilter('all')} icon={LayoutGrid} label="Tümü" />
        {groups.map((g) => (
          <FilterChip
            key={g.id}
            active={filter === g.id}
            onClick={() => changeFilter(g.id)}
            icon={icons[g.id]}
            label={g.label}
            shortLabel={shortLabels[g.id]}
            count={`${g.doneCount}/${g.items.length}`}
          />
        ))}
      </div>

      <div className="flex flex-col gap-5">
        {visible.map((group) => {
          const Icon = icons[group.id]
          return (
            <section key={group.id} aria-labelledby={`cat-${group.id}`} className="surface-panel p-4">
              <header className="mb-3 flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h2 id={`cat-${group.id}`} className="flex-1 text-base font-extrabold text-foreground">
                  {group.label}
                </h2>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold tabular-nums text-muted-foreground">
                  {`${group.doneCount}/${group.items.length}`}
                </span>
              </header>

              <ul className="flex flex-col">
                {group.items.map((item) => {
                  const isDone = done.has(item.id)
                  const isSelectedForDeletion = selectedIds.has(item.id)
                  const isDeleting = deletingIds.has(item.id)
                  return (
                    <li
                      key={item.id}
                      aria-hidden={isDeleting || undefined}
                      className={cn(
                        'grid border-t border-border/60 transition-[grid-template-rows,opacity,transform,border-color] duration-[360ms] ease-[var(--motion-ease)] first:border-t-0',
                        isDeleting ? 'pointer-events-none grid-rows-[0fr] -translate-y-1 scale-[0.98] border-transparent opacity-0' : 'grid-rows-[1fr] scale-100 opacity-100'
                      )}
                    >
                      <div className="flex min-h-0 items-center gap-1 overflow-hidden">
                      <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 py-2">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => toggle(item.id)}
                          disabled={isDeleting}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-[color,background-color,border-color,transform] duration-[var(--motion-duration)] ease-[var(--motion-ease)] peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card',
                            isDone ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                          )}
                        >
                          <Check
                            className={cn('size-3.5 transition-[opacity,transform] duration-[var(--motion-duration)] ease-[var(--motion-ease)]', isDone ? 'scale-100 opacity-100' : 'scale-50 opacity-0')}
                            strokeWidth={3.5}
                          />
                        </span>
                        <span
                          className={cn(
                            'break-words text-sm leading-snug transition-colors duration-[var(--motion-duration)] ease-[var(--motion-ease)]',
                            isDone ? 'text-muted-foreground line-through decoration-primary/70' : 'text-foreground'
                          )}
                        >
                          {item.text}
                        </span>
                      </label>
                      {item.custom && (
                        <label
                          aria-hidden={editingCategory !== group.id || undefined}
                          className={cn(
                            'flex h-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full transition-[width,opacity,transform] duration-[var(--motion-duration)] ease-[var(--motion-ease)]',
                            editingCategory === group.id ? 'w-10 opacity-100' : 'pointer-events-none w-0 translate-x-1 opacity-0'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelectedForDeletion}
                            disabled={pendingDeletion !== null || editingCategory !== group.id}
                            onChange={() => {
                              setSelectedForDeletion((selected) =>
                                selected.includes(item.id)
                                  ? selected.filter((id) => id !== item.id)
                                  : [...selected, item.id]
                              )
                            }}
                            aria-label={`${item.text} maddesini silmek için seç`}
                            className="peer sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={cn(
                              'flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-[color,background-color,border-color,transform] duration-[var(--motion-duration)] ease-[var(--motion-ease)] peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card',
                              isSelectedForDeletion
                                ? 'scale-100 border-foreground bg-foreground text-background'
                                : 'scale-95 border-border hover:border-foreground/70'
                            )}
                          >
                            <Check
                              className={cn('size-3.5 transition-[opacity,transform] duration-[var(--motion-duration)] ease-[var(--motion-ease)]', isSelectedForDeletion ? 'scale-100 opacity-100' : 'scale-50 opacity-0')}
                              strokeWidth={3.5}
                            />
                          </span>
                        </label>
                      )}
                      </div>
                    </li>
                  )
                })}
              </ul>

              {editingCategory === group.id && (
                <p className="mt-2 text-xs text-muted-foreground" role="status">
                  Silmek istediklerini işaretle, sonra çöp kutusuna dokun.
                </p>
              )}
              <AddItemForm
                label={group.label}
                onAdd={(text) => add(group.id, text)}
                canEdit={
                  group.customCount > 0 &&
                  (editingCategory === null || editingCategory === group.id)
                }
                isEditing={editingCategory === group.id}
                selectedCount={selectedForDeletion.length}
                isDeleting={pendingDeletion?.category === group.id}
                onEditAction={() => {
                  if (pendingDeletion) return
                  if (editingCategory !== group.id) {
                    setEditingCategory(group.id)
                    setSelectedForDeletion([])
                    return
                  }

                  const ids = group.items.filter((item) => item.custom && selectedIds.has(item.id)).map((item) => item.id)
                  if (ids.length > 0) {
                    setPendingDeletion({ ids, category: group.id })
                    return
                  }
                  setSelectedForDeletion([])
                  setEditingCategory(null)
                }}
              />
            </section>
          )
        })}
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  icon: Icon,
  label,
  shortLabel,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: typeof MapPin
  label: string
  shortLabel?: string
  count?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={count ? `${label} ${count}` : label}
      title={label}
      className={cn(
        'group relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-full px-0.5 py-2 text-[9px] font-semibold transition-[color,transform] duration-[var(--motion-duration)] ease-[var(--motion-ease)] active:scale-95 sm:text-[10px]',
        active
          ? 'text-foreground'
          : 'scale-[0.94] text-muted-foreground hover:text-foreground'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-0 rounded-full bg-gradient-to-br from-card to-secondary/70 shadow-[0_8px_16px_-12px_rgba(24,24,27,0.4)] transition-opacity duration-[var(--motion-duration)] ease-[var(--motion-ease)]',
          active ? 'opacity-100' : 'opacity-0'
        )}
      />
      <span className={cn(
        'relative flex flex-col items-center gap-0.5 transition-[opacity,transform] duration-[var(--motion-duration)] ease-[var(--motion-ease)]',
        active ? 'scale-105' : 'scale-90 opacity-80'
      )}>
        <Icon
          className={cn('size-5', active ? 'text-primary' : '')}
          aria-hidden="true"
          fill={active ? 'currentColor' : 'none'}
          strokeWidth={active ? 1.8 : 2}
        />
        <span className={cn('max-w-full truncate leading-none transition-colors duration-[var(--motion-duration)] ease-[var(--motion-ease)]', active ? 'font-bold text-foreground' : 'font-medium')}>
          {shortLabel ?? label}
        </span>
        {count && <span className="text-[9px] leading-none tabular-nums opacity-60">{count}</span>}
      </span>
    </button>
  )
}

function AddItemForm({
  label,
  onAdd,
  canEdit,
  isEditing,
  selectedCount,
  isDeleting,
  onEditAction,
}: {
  label: string
  onAdd: (text: string) => void
  canEdit: boolean
  isEditing: boolean
  selectedCount: number
  isDeleting: boolean
  onEditAction: () => void
}) {
  const [text, setText] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim()) return
        onAdd(text)
        setText('')
      }}
      className="mt-3 flex items-center gap-2"
    >
      <label className="sr-only" htmlFor={`add-${label}`}>{`${label} listesine ekle`}</label>
      <input
        id={`add-${label}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
        }}
        maxLength={80}
        placeholder={isEditing ? 'Silinecek maddeleri seç...' : 'Kendi planını ekle...'}
        disabled={isEditing}
        className="h-10 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm text-foreground transition-[border-color,opacity] duration-[var(--motion-duration)] ease-[var(--motion-ease)] placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-60"
      />
      <button
        type="submit"
        aria-label="Ekle"
        disabled={!text.trim() || isEditing}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-[opacity,transform] duration-[var(--motion-duration)] ease-[var(--motion-ease)] active:scale-95 disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onEditAction}
        aria-label={
          !isEditing
            ? 'Maddeleri düzenle'
            : selectedCount > 0
              ? `Seçilen ${selectedCount} maddeyi sil`
              : 'Düzenlemeyi bitir'
        }
        title={
          !isEditing
            ? 'Maddeleri düzenle'
            : selectedCount > 0
              ? `Seçilen ${selectedCount} maddeyi sil`
              : 'Düzenlemeyi bitir'
        }
        disabled={isDeleting || (!canEdit && !isEditing)}
        aria-busy={isDeleting || undefined}
        className={cn(
          'relative flex size-10 shrink-0 items-center justify-center rounded-full bg-muted transition-[color,background-color,transform,opacity] duration-[var(--motion-duration)] ease-[var(--motion-ease)] active:scale-95 disabled:opacity-40',
          isEditing && selectedCount > 0
            ? 'text-[#000000] dark:text-[#ffffff]'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <span
          aria-hidden="true"
          className={cn('absolute transition-[opacity,transform] duration-[var(--motion-duration)] ease-[var(--motion-ease)]', !isEditing ? 'scale-100 opacity-100' : 'scale-75 opacity-0')}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </span>
        <span
          aria-hidden="true"
          className={cn('absolute transition-[opacity,transform] duration-[var(--motion-duration)] ease-[var(--motion-ease)]', isEditing && selectedCount === 0 ? 'scale-100 opacity-100' : 'scale-75 opacity-0')}
        >
          <Check className="size-4" aria-hidden="true" />
        </span>
        <span
          aria-hidden="true"
          className={cn('absolute transition-[opacity,transform] duration-[var(--motion-duration)] ease-[var(--motion-ease)]', isEditing && selectedCount > 0 ? 'scale-100 opacity-100' : 'scale-75 opacity-0')}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </span>
        {isEditing && selectedCount > 0 && (
          <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-foreground px-1 py-0.5 text-[9px] font-bold leading-none text-background">
            {selectedCount}
          </span>
        )}
      </button>
    </form>
  )
}
