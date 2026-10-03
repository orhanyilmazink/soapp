'use client'

import { useState } from 'react'
import {
  Clapperboard,
  Compass,
  Crown,
  Flame,
  Gamepad2,
  Gem,
  Gift,
  Heart,
  LockKeyhole,
  MapPin,
  PartyPopper,
  Sparkles,
  Star,
  Trophy,
  Tv,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import { SectionHeader } from '@/components/section-header'
import { categories as todoCategories, type ActiveCategoryId } from '@/lib/bucket-list'
import { useSharedAppState, useSharedBucketList } from '@/lib/shared-app-state'
import { cn } from '@/lib/utils'
import { useNow } from '@/lib/use-now'

type AchievementCategoryId = 'relationship' | ActiveCategoryId
type Achievement = { count: number; title: string; detail: string; icon: LucideIcon }
type RelationshipMilestoneId = 'isteme' | 'soz' | 'nisan' | 'kina' | 'evlilik'

const relationshipMilestonesKey = 'relationship-life-milestones'
const relationshipMilestones: { id: RelationshipMilestoneId; title: string }[] = [
  { id: 'isteme', title: 'İsteme' },
  { id: 'soz', title: 'Söz' },
  { id: 'nisan', title: 'Nişan' },
  { id: 'kina', title: 'Kına' },
  { id: 'evlilik', title: 'Evlilik' },
]

const categoryIcons: Record<ActiveCategoryId, LucideIcon> = {
  places: MapPin,
  games: Gamepad2,
  series: Tv,
  movies: Clapperboard,
  food: UtensilsCrossed,
}

const achievements: Record<AchievementCategoryId, Achievement[]> = {
  relationship: [
    { count: 100, title: 'İlk 100 gün', detail: 'Birlikte nice güzel günlere', icon: Heart },
    { count: 365, title: 'İlk yılınız', detail: 'Bir yıl, binlerce güzel an', icon: Gift },
    { count: 500, title: '500 gün', detail: 'Her gün biraz daha yakın', icon: Sparkles },
    { count: 730, title: 'İki yıl', detail: 'Hikâyeniz büyümeye devam ediyor', icon: PartyPopper },
    { count: 1000, title: '1000 gün', detail: 'Bin gün, tek güzel hikâye', icon: Trophy },
    { count: 1500, title: '1500 gün', detail: 'Birlikte nice mevsimler geride kaldı', icon: Crown },
    { count: 2000, title: 'İki bin gün', detail: 'Her gün seçilen aynı güzel hikâye', icon: Gem },
    { count: 3000, title: '3000 gün', detail: 'Bir ömre sığacak kadar çok anı', icon: Flame },
  ],
  games: [
    { count: 1, title: 'İlk oyun', detail: 'İlk ortak oyun macerası', icon: Gamepad2 },
    { count: 5, title: 'Beş oyun', detail: 'Rövanşlar sırada', icon: Sparkles },
    { count: 10, title: 'İlk 10 oyun', detail: 'Tatlı bir rekabet başladı', icon: Heart },
    { count: 25, title: 'Oyun arkadaşı', detail: '25 oyunda aynı takım', icon: Gift },
    { count: 50, title: 'Oyun gecesi ustaları', detail: 'Birlikte 50 oyun tamamlandı', icon: Trophy },
    { count: 75, title: 'Rövanş bitmez', detail: 'Yetmiş beş oyunda aynı takım', icon: Flame },
    { count: 100, title: 'Yüzüncü zafer', detail: 'Yüz oyuna ulaşmak sabır ister', icon: Crown },
    { count: 150, title: 'Efsane ikili', detail: 'Yüz elli ortak oyun tamamlandı', icon: Gem },
  ],
  places: [
    { count: 1, title: 'İlk keşif', detail: 'İlk yeni yerinizi birlikte gördünüz', icon: MapPin },
    { count: 5, title: 'İlk keşifler', detail: 'Birlikte 5 yeni yer', icon: MapPin },
    { count: 10, title: 'Gezgin çift', detail: '10 yerde ortak bir anı', icon: Heart },
    { count: 20, title: '20 yer, tek hikâye', detail: 'Birlikte nice yollar keşfettiniz', icon: Sparkles },
    { count: 50, title: '50 yer', detail: 'Birlikte keşfedilecek daha çok yer var', icon: PartyPopper },
    { count: 75, title: 'Yolların ustası', detail: 'Yetmiş beş farklı yerde anı biriktirin', icon: Compass },
    { count: 100, title: 'Yüz durak', detail: 'Yüz ayrı keşif, tek ortak hikâye', icon: Crown },
    { count: 150, title: 'Dünya sizin', detail: 'Yüz elli yeni yer keşfedildi', icon: Gem },
  ],
  series: [
    { count: 1, title: 'İlk bölüm', detail: 'İlk dizinize birlikte başladınız', icon: Tv },
    { count: 3, title: 'Üç bölüm daha', detail: 'Bölüm sonu sürprizlerine hazır olun', icon: Sparkles },
    { count: 5, title: 'Dizi keyfi', detail: 'Birlikte beş dizi tamamlandı', icon: Heart },
    { count: 10, title: 'Dizi maratonu', detail: 'On dizi, bolca güzel akşam', icon: Trophy },
    { count: 20, title: 'Jenerik ezberi', detail: 'Birlikte yirmi dizi macerası', icon: PartyPopper },
    { count: 30, title: 'Bir bölüm daha', detail: 'Otuz dizi birlikte tamamlandı', icon: Flame },
    { count: 50, title: 'Dizi arşivi', detail: 'Elli ortak dizi macerası', icon: Crown },
    { count: 75, title: 'Jenerik uzmanları', detail: 'Yetmiş beş dizinin sonuna birlikte', icon: Gem },
  ],
  movies: [
    { count: 1, title: 'İlk film gecesi', detail: 'Atıştırmalıklar hazır', icon: Clapperboard },
    { count: 5, title: 'Beş film', detail: 'Koltukta en güzel eşlik', icon: Heart },
    { count: 10, title: 'Film seçme ustaları', detail: 'On ortak film gecesi', icon: Star },
    { count: 25, title: 'Jenerik bitene kadar', detail: 'Yirmi beş film birlikte izlendi', icon: Gift },
    { count: 50, title: 'Sinema kulübü', detail: 'Ellinci filminiz kutlu olsun', icon: PartyPopper },
    { count: 75, title: 'Yetmiş beş film', detail: 'Her film yeni bir ortak anı', icon: Flame },
    { count: 100, title: 'Yüzüncü film', detail: 'Yüz film gecesini birlikte tamamlayın', icon: Crown },
    { count: 150, title: 'Beyaz perde efsaneleri', detail: 'Yüz elli film, sayısız güzel sahne', icon: Gem },
  ],
  food: [
    { count: 1, title: 'İlk yeni lezzet', detail: 'İlk ortak tat keşfi', icon: UtensilsCrossed },
    { count: 5, title: 'Beş yeni tat', detail: 'Damak tadınız birlikte gelişiyor', icon: Heart },
    { count: 10, title: 'Lezzet avcıları', detail: 'On farklı tat birlikte denendi', icon: Sparkles },
    { count: 20, title: 'Menüde ne varsa', detail: 'Yirmi yeni lezzet keşfedildi', icon: Gift },
    { count: 50, title: 'Gurme çift', detail: 'Birlikte elli lezzet anısı', icon: Trophy },
    { count: 75, title: 'Lezzet kâşifleri', detail: 'Yetmiş beş yeni tat keşfedildi', icon: Flame },
    { count: 100, title: 'Yüzüncü tat', detail: 'Yüz ayrı lezzeti birlikte deneyin', icon: Crown },
    { count: 150, title: 'Gurme efsaneleri', detail: 'Yüz elli lezzet, ortak sofrada', icon: Gem },
  ],
}

const categories: { id: AchievementCategoryId; label: string; shortLabel: string; icon: LucideIcon }[] = [
  { id: 'relationship', label: 'İlişki', shortLabel: 'İlişki', icon: Heart },
  ...todoCategories.map(({ id, label }) => ({ id, label, shortLabel: {
    places: 'Yerler',
    games: 'Oyunlar',
    series: 'Diziler',
    movies: 'Filmler',
    food: 'Lezzetler',
  }[id], icon: categoryIcons[id] })),
]

export function AchievementsTab() {
  const now = useNow()
  const [activeCategory, setActiveCategory] = useState<AchievementCategoryId>('relationship')
  const { done, custom } = useSharedBucketList()
  const { state, updateSharedState } = useSharedAppState()
  const completedRelationshipMilestones = state.relationshipMilestones as RelationshipMilestoneId[]

  const togetherDays = now
    ? Math.max(0, Math.floor((now - new Date(`${state.togetherSince}T00:00:00`).getTime()) / 86_400_000))
    : 0
  const completedCounts = todoCategories.reduce<Record<ActiveCategoryId, number>>((counts, category) => {
    const completedBuiltIn = category.items.filter((item) => done.has(item.id)).length
    const completedCustom = custom.filter((item) => item.category === category.id && done.has(item.id)).length
    counts[category.id] = completedBuiltIn + completedCustom
    return counts
  }, {} as Record<ActiveCategoryId, number>)
  const currentCounts: Record<AchievementCategoryId, number> = { relationship: togetherDays, ...completedCounts }
  const currentCount = currentCounts[activeCategory]
  const activeAchievements = achievements[activeCategory]
  const countUnits: Record<AchievementCategoryId, string> = {
    relationship: 'gün',
    places: 'yer',
    games: 'oyun',
    series: 'dizi',
    movies: 'film',
    food: 'lezzet',
  }
  const countUnit = countUnits[activeCategory]
  const unlockedTotal = Object.entries(achievements).reduce(
    (total, [category, items]) => total + items.filter((item) => currentCounts[category as AchievementCategoryId] >= item.count).length,
    0
  )
  const totalAchievements = Object.values(achievements).reduce((total, items) => total + items.length, 0)

  function toggleRelationshipMilestone(milestoneId: RelationshipMilestoneId) {
    const milestoneIndex = relationshipMilestones.findIndex((milestone) => milestone.id === milestoneId)
    const isCompleted = completedRelationshipMilestones.includes(milestoneId)
    if (!isCompleted && milestoneIndex !== completedRelationshipMilestones.length) return

    const nextMilestones = isCompleted
      ? completedRelationshipMilestones.slice(0, milestoneIndex)
      : [...completedRelationshipMilestones, milestoneId]

    updateSharedState({ relationshipMilestones: nextMilestones })
  }

  return (
    <div className="pb-2">
      <SectionHeader title="Başarımlar" largeTitle />

      <section
        aria-label="Başarım ilerlemesi"
        className="mb-5 rounded-3xl bg-foreground p-5 text-background shadow-[0_14px_30px_-16px_oklch(0.18_0_0/0.5)]"
      >
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">Kazanılan</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">
              {unlockedTotal}
              <span className="text-lg font-semibold opacity-60">{` / ${totalAchievements}`}</span>
            </p>
          </div>
          <p className="text-4xl font-extrabold tabular-nums text-primary">
            {`%${totalAchievements ? Math.round((unlockedTotal / totalAchievements) * 100) : 0}`}
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={totalAchievements ? Math.round((unlockedTotal / totalAchievements) * 100) : 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Kazanılan başarım oranı"
          className="mt-4 h-2.5 overflow-hidden rounded-full bg-background/15"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${totalAchievements ? (unlockedTotal / totalAchievements) * 100 : 0}%` }}
          />
        </div>
      </section>

      <section aria-label="Başarım ayrıntıları" className="mt-2">
        <div
          role="tablist"
          aria-label="Başarım kategorileri"
          className="mx-auto mb-3 flex w-full max-w-md items-center gap-1 rounded-full border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(244,244,246,0.92))] p-1.5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl"
        >
          {categories.map(({ id, label, shortLabel, icon: CategoryIcon }) => {
            const isActive = activeCategory === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-label={label}
                aria-selected={isActive}
                onClick={() => setActiveCategory(id)}
                className={cn(
                  'group relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-full px-0.5 py-2 text-[9px] font-semibold transition-all duration-250 ease-out sm:text-[10px]',
                  isActive ? 'text-foreground' : 'scale-[0.94] text-zinc-500 hover:text-zinc-700'
                )}
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,114,182,0.1),rgba(255,255,255,0.82))] shadow-[inset_0_1px_1px_rgba(255,255,255,0.96),0_12px_24px_-18px_rgba(24,24,27,0.6)] backdrop-blur-xl" />
                )}
                <span className={cn(
                  'relative flex flex-col items-center gap-0.5 transition-all duration-250 ease-out',
                  isActive ? 'scale-105' : 'scale-90 opacity-80'
                )}>
                  <CategoryIcon
                    className={cn('size-5 transition-all duration-250 ease-out', isActive ? 'text-primary' : '')}
                    aria-hidden="true"
                    fill={isActive ? 'currentColor' : 'none'}
                    strokeWidth={isActive ? 1.8 : 2}
                  />
                  <span className={cn('leading-none transition-all duration-250', isActive ? 'font-bold text-foreground' : 'font-medium')}>
                    {shortLabel}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {activeCategory !== 'relationship' && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-zinc-500">Tamamlanan yapılacaklar</p>
              <p className="mt-0.5 text-lg font-black tabular-nums text-zinc-900">
                {currentCount} <span className="text-xs font-semibold text-zinc-500">{countUnit}</span>
              </p>
            </div>
            <span className="text-xs font-semibold text-zinc-400">Yapılacaklardan</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5" role="tabpanel" aria-label={categories.find((category) => category.id === activeCategory)?.label}>
          {activeAchievements.map((achievement) => {
            const unlocked = currentCount >= achievement.count
            const AchievementIcon = achievement.icon
            const progress = Math.min(100, (currentCount / achievement.count) * 100)
            return (
              <article
                key={achievement.count}
                aria-label={`${achievement.title}, ${unlocked ? 'kazanıldı' : 'kilitli'}`}
                className={`relative overflow-hidden rounded-2xl border p-3.5 transition-colors ${
                  unlocked ? 'border-pink-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(253,242,248,0.9))]' : 'border-zinc-200 bg-white/65'
                }`}
              >
                {!unlocked && <LockKeyhole className="absolute right-3 top-3 size-3.5 text-zinc-400" aria-hidden="true" />}
                <div className={`mb-3 grid size-11 place-items-center rounded-full ${unlocked ? 'bg-pink-100 text-pink-500' : 'bg-zinc-100 text-zinc-400'}`}>
                  <AchievementIcon className="size-5" aria-hidden="true" />
                </div>
                <h3 className={`text-sm font-bold ${unlocked ? 'text-zinc-900' : 'text-zinc-500'}`}>{achievement.title}</h3>
                <p className="mt-1 min-h-8 text-[11px] leading-relaxed text-zinc-500">{achievement.detail}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100" aria-label={`${Math.round(progress)}% tamamlandı`}>
                  <div className={`h-full rounded-full ${unlocked ? 'bg-pink-300' : 'bg-zinc-300'}`} style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1.5 text-[10px] font-semibold text-zinc-400">
                  {unlocked ? 'Kazanıldı' : `${Math.min(currentCount, achievement.count)} / ${achievement.count} ${countUnit}`}
                </p>
              </article>
            )
          })}
        </div>

        {activeCategory === 'relationship' && (
          <section className="mt-7" aria-labelledby="relationship-milestones-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">İlişki yolculuğunuz</p>
                <h3 id="relationship-milestones-title" className="mt-1 text-base font-bold text-zinc-900">
                  Dönüm noktaları
                </h3>
              </div>
              <span className="text-xs font-semibold tabular-nums text-zinc-500">
                {completedRelationshipMilestones.length}/{relationshipMilestones.length}
              </span>
            </div>

            <ol className="overflow-hidden rounded-2xl border border-zinc-200 bg-white/80">
              {relationshipMilestones.map((milestone, index) => {
                const isCompleted = completedRelationshipMilestones.includes(milestone.id)
                const canCheck = isCompleted || index === completedRelationshipMilestones.length
                return (
                  <li key={milestone.id} className="border-b border-zinc-100 last:border-b-0">
                    <label className={`flex min-h-14 items-center gap-3 px-4 py-2.5 ${canCheck ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        disabled={!canCheck}
                        onChange={() => toggleRelationshipMilestone(milestone.id)}
                        aria-label={`${milestone.title}${canCheck ? '' : ', önceki adım tamamlanmalı'}`}
                        className="size-5 shrink-0 accent-pink-400 disabled:opacity-35"
                      />
                      <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        isCompleted ? 'bg-pink-100 text-pink-600' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className={`flex-1 text-sm font-semibold ${isCompleted ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                        {milestone.title}
                      </span>
                      {!canCheck && <LockKeyhole className="size-4 text-zinc-300" aria-hidden="true" />}
                    </label>
                  </li>
                )
              })}
              <li>
                <div aria-label="Çocuk, sonsuza kadar kilitli" className="flex min-h-16 items-center gap-3 bg-zinc-50 px-4 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-200 text-zinc-700">
                    <LockKeyhole className="size-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold text-black">Çocuk</span>
                    <span className="mt-0.5 block text-sm font-black italic text-black">Sonsuza kadar kilitli</span>
                  </span>
                </div>
              </li>
            </ol>
          </section>
        )}
      </section>
    </div>
  )
}
