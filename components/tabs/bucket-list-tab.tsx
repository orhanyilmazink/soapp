'use client'

import { useState } from 'react'
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

export function BucketListTab() {
  const { done, custom, toggle, add, remove } = useSharedBucketList()
  const [filter, setFilter] = useState<Filter>('all')
  const [editingCategory, setEditingCategory] = useState<ActiveCategoryId | null>(null)
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([])
  const changeFilter = (nextFilter: Filter) => {
    setFilter(nextFilter)
    setEditingCategory(null)
    setSelectedForDeletion([])
  }

  const groups = categories.map((cat) => {
    const items = [
      ...cat.items.map((i) => ({ ...i, custom: false })),
      ...custom.filter((c) => c.category === cat.id).map((c) => ({ id: c.id, text: c.text, custom: true })),
    ]

    return {
      ...cat,
      items: [...items].sort((a, b) => Number(done.has(a.id)) - Number(done.has(b.id))),
    }
  })

  const allItems = groups.flatMap((g) => g.items)
  const doneCount = allItems.filter((i) => done.has(i.id)).length
  const percent = allItems.length ? Math.round((doneCount / allItems.length) * 100) : 0
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
              <span className="text-lg font-semibold opacity-60">{` / ${allItems.length}`}</span>
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
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
      </section>

      <div
        role="group"
        aria-label="Kategoriler"
        className="mx-auto mb-5 flex w-full max-w-md items-center gap-1 rounded-full border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(244,244,246,0.92))] p-1.5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl"
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
            count={`${g.items.filter((i) => done.has(i.id)).length}/${g.items.length}`}
          />
        ))}
      </div>

      <div className="flex flex-col gap-5">
        {visible.map((group) => {
          const Icon = icons[group.id]
          const groupDone = group.items.filter((i) => done.has(i.id)).length
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
                  {`${groupDone}/${group.items.length}`}
                </span>
              </header>

              <ul className="flex flex-col">
                {group.items.map((item) => {
                  const isDone = done.has(item.id)
                  const isSelectedForDeletion = selectedForDeletion.includes(item.id)
                  return (
                    <li key={item.id} className="flex items-center gap-1 border-t border-border/60 first:border-t-0">
                      <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 py-2">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => toggle(item.id)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card',
                            isDone ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                          )}
                        >
                          {isDone && <Check className="size-3.5 animate-in zoom-in-50 duration-200" strokeWidth={3.5} />}
                        </span>
                        <span
                          className={cn(
                            'text-sm leading-snug transition-colors',
                            isDone ? 'text-muted-foreground line-through decoration-primary/70' : 'text-foreground'
                          )}
                        >
                          {item.text}
                        </span>
                      </label>
                      {editingCategory === group.id && item.custom && (
                        <label className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full">
                          <input
                            type="checkbox"
                            checked={isSelectedForDeletion}
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
                              'flex size-6 items-center justify-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card',
                              isSelectedForDeletion
                                ? 'border-destructive bg-destructive text-destructive-foreground'
                                : 'border-border hover:border-destructive/70'
                            )}
                          >
                            {isSelectedForDeletion && <Check className="size-3.5" strokeWidth={3.5} />}
                          </span>
                        </label>
                      )}
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
                  group.items.some((item) => item.custom) &&
                  (editingCategory === null || editingCategory === group.id)
                }
                isEditing={editingCategory === group.id}
                selectedCount={selectedForDeletion.length}
                onEditAction={() => {
                  if (editingCategory !== group.id) {
                    setEditingCategory(group.id)
                    setSelectedForDeletion([])
                    return
                  }

                  if (selectedForDeletion.length > 0) remove(selectedForDeletion)
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
        'group relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-full px-0.5 py-2 text-[9px] font-semibold transition-all duration-250 ease-out sm:text-[10px]',
        active
          ? 'text-foreground'
          : 'scale-[0.94] text-zinc-500 hover:text-zinc-700'
      )}
    >
      {active && (
        <span className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,114,182,0.1),rgba(255,255,255,0.82))] shadow-[inset_0_1px_1px_rgba(255,255,255,0.96),0_12px_24px_-18px_rgba(24,24,27,0.6)] backdrop-blur-xl" />
      )}
      <span className={cn(
        'relative flex flex-col items-center gap-0.5 transition-all duration-250 ease-out',
        active ? 'scale-105' : 'scale-90 opacity-80'
      )}>
        <Icon
          className={cn('size-5 transition-all duration-250 ease-out', active ? 'text-primary' : '')}
          aria-hidden="true"
          fill={active ? 'currentColor' : 'none'}
          strokeWidth={active ? 1.8 : 2}
        />
        <span className={cn('max-w-full truncate leading-none transition-all duration-250', active ? 'font-bold text-foreground' : 'font-medium')}>
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
  onEditAction,
}: {
  label: string
  onAdd: (text: string) => void
  canEdit: boolean
  isEditing: boolean
  selectedCount: number
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
        className="h-10 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-60"
      />
      <button
        type="submit"
        aria-label="Ekle"
        disabled={!text.trim() || isEditing}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
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
        disabled={!canEdit && !isEditing}
        className={cn(
          'flex h-10 shrink-0 items-center justify-center gap-1 rounded-full transition-colors disabled:opacity-40',
          isEditing && selectedCount > 0
            ? 'bg-destructive px-3 text-destructive-foreground'
            : 'size-10 bg-muted text-muted-foreground hover:text-foreground'
        )}
      >
        {isEditing && selectedCount > 0 ? (
          <>
            <Trash2 className="size-4" aria-hidden="true" />
            <span className="text-xs font-bold">{selectedCount}</span>
          </>
        ) : isEditing ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Pencil className="size-4" aria-hidden="true" />
        )}
      </button>
    </form>
  )
}
