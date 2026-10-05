'use client'

import { useState, type FormEvent } from 'react'
import { Check, Plus, Star, Trash2 } from 'lucide-react'
import { SectionHeader } from '@/components/section-header'
import { ProgressSummary } from '@/components/progress-summary'
import { useSharedAppState, type SharedWish } from '@/lib/shared-app-state'
import { useLanguage } from '@/lib/language'
import { cn } from '@/lib/utils'

export function WishlistTab() {
  const { state } = useSharedAppState()
  const { t } = useLanguage()
  return (
    <div>
      <SectionHeader title={t('İstekler')} largeTitle />
      <ProgressSummary label="Yapılan" completed={state.wishes.filter((wish) => wish.done).length} total={state.wishes.length} />
      <div className="surface-panel grid min-h-[calc(100dvh-23rem)] grid-cols-2 divide-x divide-border overflow-hidden">
        <WishColumn owner="first" name={state.firstName || t('İlk kişi')} />
        <WishColumn owner="second" name={state.secondName || t('İkinci kişi')} />
      </div>
    </div>
  )
}

function WishColumn({ owner, name }: { owner: SharedWish['owner']; name: string }) {
  const { state, updateSharedState } = useSharedAppState()
  const { t } = useLanguage()
  const [draft, setDraft] = useState('')
  const [deletedWishes, setDeletedWishes] = useState<{ wish: SharedWish; index: number }[]>([])
  const lastDeleted = deletedWishes.at(-1)
  const ownerWishes = state.wishes.filter((wish) => wish.owner === owner)
  const wishes = [
    ...ownerWishes.filter((wish) => !wish.done && wish.priority),
    ...ownerWishes.filter((wish) => !wish.done && !wish.priority),
    ...ownerWishes.filter((wish) => wish.done),
  ]
  function addWish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim().slice(0, 240)
    if (!text) return
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    updateSharedState({ wishes: [...state.wishes, { id, owner, text, done: false, priority: false }] })
    setDraft('')
  }
  function deleteWish(wish: SharedWish) {
    const index = state.wishes.findIndex((item) => item.id === wish.id)
    if (index < 0) return
    setDeletedWishes((deleted) => [...deleted, { wish, index }])
    updateSharedState({ wishes: state.wishes.filter((item) => item.id !== wish.id) })
  }
  function undoDelete() {
    if (!lastDeleted) return
    if (!state.wishes.some((item) => item.id === lastDeleted.wish.id)) {
      const restored = [...state.wishes]
      restored.splice(Math.min(lastDeleted.index, restored.length), 0, lastDeleted.wish)
      updateSharedState({ wishes: restored })
    }
    setDeletedWishes((deleted) => deleted.slice(0, -1))
  }
  return (
    <section className="min-w-0 px-2.5 pb-5 pt-3 sm:px-4" aria-labelledby={`wishlist-${owner}-name`}>
      <h2 id={`wishlist-${owner}-name`} className="break-words text-center font-script text-3xl font-bold text-foreground">{name}</h2>
      <p className="mt-1 text-center text-[11px] text-muted-foreground">{t(wishes.length === 1 ? '1 istek' : '{count} istek', { count: wishes.length })}</p>
      <form onSubmit={addWish} className="mt-5 flex items-center gap-1.5">
        <label htmlFor={`wish-${owner}`} className="sr-only">{t('{name} için istek', { name })}</label>
        <input id={`wish-${owner}`} value={draft} onChange={(event) => setDraft(event.target.value)}
          maxLength={240} placeholder={t('İstek ekle...')}
          onKeyDown={(event) => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-2 text-base text-foreground outline-none placeholder:text-xs placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
        <button type="submit" disabled={!draft.trim()} aria-label={t('İstek ekle')}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-primary/10 text-primary transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 disabled:opacity-40">
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </form>
      {lastDeleted && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 rounded-xl border border-border bg-muted/70 px-2 py-1">
          <p role="status" className="text-center text-xs text-muted-foreground">{t(deletedWishes.length === 1 ? 'İstek silindi.' : '{count} istek silindi.', { count: deletedWishes.length })}</p>
          <button type="button" onClick={undoDelete} aria-label={t('{text} isteğini geri getir', { text: lastDeleted.wish.text })}
            className="min-h-11 rounded-lg px-2 text-sm font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {t('Geri al')}
          </button>
        </div>
      )}
      {wishes.length === 0 ? <p className="mt-8 text-center text-xs text-muted-foreground">{t('Henüz istek yok.')}</p> : (
        <ul className="mt-4 space-y-2">
          {wishes.map((wish) => (
            <li key={wish.id} className={cn('rounded-xl border bg-background/70 p-2.5 transition-colors', wish.priority && !wish.done ? 'border-primary/50 bg-primary/5' : 'border-border')}>
              <p className={cn('whitespace-pre-wrap break-words text-center text-sm leading-relaxed', wish.done ? 'text-muted-foreground line-through' : 'text-foreground')}>{wish.text}</p>
              <div className="mt-2 flex items-center justify-between gap-1">
                <button type="button" aria-pressed={wish.done} aria-label={t(wish.done ? '{text} isteğini geri al' : '{text} isteğini tamamla', { text: wish.text })}
                  onClick={() => updateSharedState({ wishes: state.wishes.map((item) => item.id === wish.id ? { ...item, done: !item.done } : item) })}
                  className={cn('grid min-h-11 min-w-11 place-items-center rounded-lg border transition-colors', wish.done ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>
                  <Check className="size-4" aria-hidden="true" />
                </button>
                <button type="button" aria-pressed={wish.priority === true} aria-label={t(wish.priority ? '{text} isteğinin önceliğini kaldır' : '{text} isteğini öncelikli yap', { text: wish.text })}
                  onClick={() => updateSharedState({ wishes: state.wishes.map((item) => item.id === wish.id ? { ...item, priority: !item.priority } : item) })}
                  className={cn('grid min-h-11 min-w-11 place-items-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', wish.priority ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted hover:text-primary')}>
                  <Star className="size-4" fill={wish.priority ? 'currentColor' : 'none'} aria-hidden="true" />
                </button>
                <button type="button" aria-label={t('{text} isteğini sil', { text: wish.text })}
                  onClick={() => deleteWish(wish)}
                  className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-rose-500">
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
