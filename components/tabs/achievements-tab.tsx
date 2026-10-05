'use client'

import { useLanguage } from '@/lib/language'
import { DraggableTabList } from '@/components/draggable-tab-list'

import { useMemo, useState } from 'react'
import {
  Clapperboard,
  Check,
  Coffee,
  HeartHandshake,
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
import { ProgressSummary } from '@/components/progress-summary'
import { SectionHeader } from '@/components/section-header'
import { categories as todoCategories, type ActiveCategoryId } from '@/lib/bucket-list'
import { useSharedAppState, useSharedBucketList } from '@/lib/shared-app-state'
import { cn } from '@/lib/utils'
import { useNow } from '@/lib/use-now'

type AchievementCategoryId = 'relationship' | ActiveCategoryId
type Achievement = { count: number; title: string; detail: string; icon: LucideIcon }
type RelationshipMilestoneId = 'isteme' | 'soz' | 'nisan' | 'kina' | 'evlilik'

const relationshipMilestones: { id: RelationshipMilestoneId; title: string; detail: string; icon: LucideIcon }[] = [
  { id: 'isteme', title: 'İsteme', detail: 'Kahveler hazır, heyecan yüksek.', icon: Coffee },
  { id: 'soz', title: 'Söz', detail: 'Bir söz, iki kocaman gülümseme.', icon: HeartHandshake },
  { id: 'nisan', title: 'Nişan', detail: 'Yüzükler tamam, geri sayım başladı.', icon: Gem },
  { id: 'kina', title: 'Kına', detail: 'Biraz duygu, bolca dans.', icon: Flame },
  { id: 'evlilik', title: 'Evlilik', detail: 'Aynı takım, artık aynı ev.', icon: Heart },
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
    { count: 7, title: "Bir hafta biz", detail: "7 gün: iyi ki mesaj atmışız.", icon: Heart },
    { count: 30, title: "Aylık abonelik: biz", detail: "30 gün birlikte. İptal tuşu nerede?", icon: Gift },
    { count: 100, title: "Yüz kere iyi ki", detail: "100 gün, aynı favori insan.", icon: Sparkles },
    { count: 365, title: "Bir tur güneş", detail: "Bir yılı birlikte tamamladınız.", icon: PartyPopper },
    { count: 730, title: "İkinci sezon onaylandı", detail: "İki yıl oldu, hikâye hâlâ güzel.", icon: Trophy },
    { count: 1000, title: "Bin günlük takım", detail: "1000 gün aynı taraftasınız.", icon: Crown },
    { count: 1825, title: "Beş yıllık klasik", detail: "Birlikte yaklaşık beş yıl. Artık klasiksiniz.", icon: Gem },
    { count: 3650, title: "On yıllık efsane", detail: "Yaklaşık on yıl, hâlâ yan yana.", icon: Flame },
  ],
  games: [
    { count: 1, title: "İkinci oyuncu bağlandı", detail: "İlk oyunu birlikte tamamladınız.", icon: Gamepad2 },
    { count: 3, title: "Rövanş lütfen", detail: "3 oyun bitti. Skor kimde?", icon: Sparkles },
    { count: 5, title: "Aynı takımdayız", detail: "5 oyunluk ortak macera.", icon: Heart },
    { count: 10, title: "Oyun gecesi müdavimleri", detail: "10 oyun tamamlandı; kumandalar sıcak.", icon: Gift },
    { count: 20, title: "Yenilsek de beraber", detail: "20 oyun, bol kahkaha.", icon: Trophy },
    { count: 35, title: "Kumanda paylaşımı uzmanı", detail: "35 oyunu birlikte bitirdiniz.", icon: Flame },
    { count: 50, title: "Elli oyunun hatırı", detail: "50 ortak oyun. Mola versek mi?", icon: Crown },
    { count: 100, title: "Efsane ikili", detail: "100 oyunluk güçlü bir takım.", icon: Gem },
  ],
  places: [
    { count: 1, title: "İlk durak", detail: "İlk yeni yerinizi birlikte keşfettiniz.", icon: MapPin },
    { count: 3, title: "Evden çıkış başarılı", detail: "3 farklı yerde ortak anı.", icon: Compass },
    { count: 5, title: "Rota bizden sorulur", detail: "5 yeni yer keşfedildi.", icon: Heart },
    { count: 10, title: "Gezgin ikili", detail: "10 durak, aynı yol arkadaşı.", icon: Sparkles },
    { count: 20, title: "Haritada izimiz var", detail: "20 farklı yerde birlikteydiniz.", icon: PartyPopper },
    { count: 35, title: "Bir sonraki durak neresi?", detail: "35 yeni yer. Rota uzuyor.", icon: Compass },
    { count: 50, title: "Elli duraklık hikâye", detail: "50 ortak keşif tamamlandı.", icon: Crown },
    { count: 100, title: "Dünya küçük, biz büyük", detail: "100 yerlik ortak bir yolculuk.", icon: Gem },
  ],
  series: [
    { count: 1, title: "Bir bölüm daha ekibi", detail: "İlk dizinizi birlikte bitirdiniz.", icon: Tv },
    { count: 3, title: "Koltuk rezerve", detail: "3 dizi tamamlandı, yerimiz belli.", icon: Sparkles },
    { count: 5, title: "Spoiler yasak", detail: "5 dizinin sonunu birlikte gördünüz.", icon: Heart },
    { count: 10, title: "Dizi maratonu", detail: "10 dizi bitti. Uykuya da vakit var mı?", icon: Trophy },
    { count: 20, title: "Jenerik ezberi", detail: "20 ortak dizi macerası.", icon: PartyPopper },
    { count: 35, title: "Bir sezon daha", detail: "35 dizi tamamlandı.", icon: Flame },
    { count: 50, title: "Koltuk eleştirmenleri", detail: "50 dizilik ortak arşiv.", icon: Crown },
    { count: 100, title: "Dizi efsaneleri", detail: "100 dizi! Kumanda artık sizi tanıyor.", icon: Gem },
  ],
  movies: [
    { count: 1, title: "İlk film gecesi", detail: "İlk film bitti. Patlamış mısır kaldı mı?", icon: Clapperboard },
    { count: 3, title: "Film seçebildik", detail: "3 film izlendi; seçim süresi sayılmaz.", icon: Heart },
    { count: 5, title: "Koltuk sineması", detail: "5 ortak film gecesi.", icon: Star },
    { count: 10, title: "Jeneriğe kadar beraber", detail: "10 filmi birlikte tamamladınız.", icon: Gift },
    { count: 20, title: "Sinema kulübü", detail: "20 film, bolca konuşacak sahne.", icon: PartyPopper },
    { count: 35, title: "Fragmana kanmadık", detail: "35 film izlendi; favoriler belli oldu.", icon: Flame },
    { count: 50, title: "Elli film biriktirdik", detail: "50 film gecesinin hatırası.", icon: Crown },
    { count: 100, title: "Beyaz perde efsaneleri", detail: "100 film! Ödül: bir film daha.", icon: Gem },
  ],
  food: [
    { count: 1, title: "İlk lokma ortak", detail: "İlk yeni lezzeti birlikte denediniz.", icon: UtensilsCrossed },
    { count: 3, title: "Bir çatal da senden", detail: "3 yeni tat keşfedildi.", icon: Heart },
    { count: 5, title: "Menüye cesur bakış", detail: "5 farklı lezzeti denediniz.", icon: Sparkles },
    { count: 10, title: "Lezzet avcıları", detail: "10 yeni tat, ortak favoriler.", icon: Gift },
    { count: 20, title: "Her zamankinden farklı", detail: "20 lezzet keşfi tamamlandı.", icon: Trophy },
    { count: 35, title: "Tadım ekibi", detail: "35 yeni lezzet. Biraz da bana bırak.", icon: Flame },
    { count: 50, title: "Gurme çift", detail: "50 ortak lezzet anısı.", icon: Crown },
    { count: 100, title: "Sofranın efsaneleri", detail: "100 yeni tat! Tatlıya yer kaldı mı?", icon: Gem },
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
  const { t } = useLanguage()

  const now = useNow(60_000)
  const [activeCategory, setActiveCategory] = useState<AchievementCategoryId>('relationship')
  const { done, custom } = useSharedBucketList()
  const { state, updateSharedState } = useSharedAppState()
  const completedRelationshipMilestones = state.relationshipMilestones as RelationshipMilestoneId[]

  const togetherDays = now
    ? Math.max(0, Math.floor((now - new Date(`${state.togetherSince}T00:00:00`).getTime()) / 86_400_000))
    : 0
  const completedCounts = useMemo(() => todoCategories.reduce<Record<ActiveCategoryId, number>>((counts, category) => {
    const completedBuiltIn = category.items.filter((item) => done.has(item.id)).length
    const completedCustom = custom.filter((item) => item.category === category.id && done.has(item.id)).length
    counts[category.id] = completedBuiltIn + completedCustom
    return counts
  }, {} as Record<ActiveCategoryId, number>), [done, custom])
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
      <SectionHeader title={t("Başarımlar")} largeTitle />

      <ProgressSummary label="Kazanılan" completed={unlockedTotal} total={totalAchievements} />

      <section aria-label={t("Başarım ayrıntıları")} className="mt-2">
        <DraggableTabList
          onSelect={index => setActiveCategory(categories[index].id)}
          role="tablist"
          aria-label={t("Başarım kategorileri")}
          className="mx-auto mb-3 flex w-full max-w-md items-center gap-1 rounded-full border p-1.5"
        >
          {categories.map(({ id, label, shortLabel, icon: CategoryIcon }) => {
            const isActive = activeCategory === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-label={t(label)}
                aria-selected={isActive}
                onClick={() => setActiveCategory(id)}
                className={cn(
                  'group relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-full px-0.5 py-2 text-[9px] font-semibold transition-[color,transform] duration-250 sm:text-[10px]',
                  isActive ? 'text-foreground' : 'scale-[0.94] text-zinc-500 hover:text-zinc-700'
                )}
              >
                <span className={cn(
                  'relative flex flex-col items-center gap-0.5 transition-[transform,opacity] duration-250',
                  isActive ? 'scale-105' : 'scale-90 opacity-80'
                )}>
                  <CategoryIcon
                    className={cn('size-5 transition-colors duration-250', isActive ? 'text-primary' : '')}
                    aria-hidden="true"
                    fill={isActive ? 'currentColor' : 'none'}
                    strokeWidth={isActive ? 1.8 : 2}
                  />
                  <span className={cn('leading-none transition-colors duration-250', isActive ? 'font-bold text-foreground' : 'font-medium')}>
                    {t(shortLabel)}
                  </span>
                </span>
              </button>
            )
          })}
        </DraggableTabList>

        {activeCategory !== 'relationship' && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-zinc-500">{t("Tamamlanan yapılacaklar")}</p>
              <p className="mt-0.5 text-lg font-black tabular-nums text-zinc-900">
                {currentCount} <span className="text-xs font-semibold text-zinc-500">{t(countUnit)}</span>
              </p>
            </div>
            <span className="text-xs font-semibold text-zinc-400">{t("Yapılacaklardan")}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5" role="tabpanel" aria-label={t(categories.find((category) => category.id === activeCategory)?.label ?? '')}>
          {activeAchievements.map((achievement) => {
            const unlocked = currentCount >= achievement.count
            const AchievementIcon = achievement.icon
            const progress = Math.min(100, (currentCount / achievement.count) * 100)
            return (
              <article
                key={achievement.count}
                aria-label={`${t(achievement.title)}, ${unlocked ? t("kazanıldı") : t("kilitli")}`}
                className={`relative overflow-hidden rounded-2xl border p-3.5 transition-colors ${
                  unlocked ? 'border-pink-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(253,242,248,0.9))]' : 'border-zinc-200 bg-white/65'
                }`}
              >
                {!unlocked && <LockKeyhole className="absolute right-3 top-3 size-3.5 text-zinc-400" aria-hidden="true" />}
                <div className={`mb-3 grid size-11 place-items-center rounded-full ${unlocked ? 'bg-pink-100 text-pink-500' : 'bg-zinc-100 text-zinc-400'}`}>
                  <AchievementIcon className="size-5" aria-hidden="true" />
                </div>
                <h3 className={`text-sm font-bold ${unlocked ? 'text-zinc-900' : 'text-zinc-500'}`}>{t(achievement.title)}</h3>
                <p className="mt-1 min-h-8 text-[11px] leading-relaxed text-zinc-500">{t(achievement.detail)}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100" aria-label={t("{count}% tamamlandı", { count: Math.round(progress) })}>
                  <div className={`h-full rounded-full ${unlocked ? 'bg-pink-300' : 'bg-zinc-300'}`} style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1.5 text-[10px] font-semibold text-zinc-400">
                  {unlocked ? t("Kazanıldı") : `${Math.min(currentCount, achievement.count)} / ${achievement.count} ${t(countUnit)}`}
                </p>
              </article>
            )
          })}
        </div>

        {activeCategory === 'relationship' && (
          <section className="mt-7" aria-labelledby="relationship-milestones-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <MapPin className="mt-1 size-4 shrink-0 text-pink-400" aria-hidden="true" />
                <h3 id="relationship-milestones-title" className="text-base font-bold text-zinc-900">
                  {t('İlişki yolculuğunuzun dönüm noktaları')}
                </h3>
              </div>
              <span className="text-xs font-semibold tabular-nums text-zinc-500">
                {completedRelationshipMilestones.length}/{relationshipMilestones.length}
              </span>
            </div>

            <ol className="surface-panel overflow-hidden p-3">
              {relationshipMilestones.map((milestone, index) => {
                const isCompleted = completedRelationshipMilestones.includes(milestone.id)
                const isNext = index === completedRelationshipMilestones.length
                const canCheck = isCompleted || isNext
                const MilestoneIcon = milestone.icon
                return (
                  <li key={milestone.id} className="relative pb-3 last:pb-0">
                    {index < relationshipMilestones.length - 1 && <span aria-hidden="true" className={cn('absolute left-[2.1rem] top-12 h-16 w-0.5', isCompleted ? 'bg-primary/50' : 'bg-border')} />}
                    <label className={cn('relative flex min-h-20 items-center gap-3 rounded-2xl border px-3 py-3 transition-colors',
                      isCompleted ? 'cursor-pointer border-primary/25 bg-primary/5' : isNext ? 'cursor-pointer border-primary/40 bg-secondary/40' : 'cursor-not-allowed border-transparent bg-muted/35')}>
                      <input type="checkbox" checked={isCompleted} disabled={!canCheck}
                        onChange={() => toggleRelationshipMilestone(milestone.id)}
                        aria-label={`${t(milestone.title)}${canCheck ? '' : `, ${t('önceki adım tamamlanmalı')}`}`}
                        className="peer sr-only" />
                      <span className={cn('relative z-10 grid size-10 shrink-0 place-items-center rounded-full border peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
                        isCompleted ? 'border-primary bg-primary text-primary-foreground' : isNext ? 'border-primary/30 bg-secondary text-primary' : 'border-border bg-card text-muted-foreground')}>
                        {isCompleted ? <Check className="size-5" aria-hidden="true" /> : <MilestoneIcon className="size-5" aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-foreground">{t(milestone.title)}</span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{t(milestone.detail)}</span>
                      </span>
                      {isCompleted ? <span className="text-[9px] font-bold text-primary">{t('Tamam')}</span>
                        : isNext ? <span className="rounded-full bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary">{t('Sıradaki')}</span>
                          : <LockKeyhole className="size-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />}
                    </label>
                  </li>
                )
              })}
              <li>
                <div aria-label={t("Çocuk, sonsuza kadar kilitli")} className="relative flex min-h-20 cursor-not-allowed items-center gap-3 rounded-2xl border border-transparent bg-muted/35 px-3 py-3">
                  <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground">
                    <LockKeyhole className="size-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold text-black">{t("Çocuk")}</span>
                    <span className="mt-0.5 block text-sm font-black italic text-black">{t("Sonsuza kadar kilitli")}</span>
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
