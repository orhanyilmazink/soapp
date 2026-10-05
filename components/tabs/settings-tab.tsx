'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  Info,
  KeyRound,
  LockKeyhole,
  Bell,
  Languages,
  Moon,
  Palette,
  ScanFace,
  Sun,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { AnimatedDialog } from '@/components/animated-dialog'
import { MeetupNotificationsButton } from '@/components/meetup-notifications'
import { SectionHeader } from '@/components/section-header'
import { useSharedAppState } from '@/lib/shared-app-state'
import { useLanguage } from '@/lib/language'
import { cn } from '@/lib/utils'
import appRelease from '@/app-release.json'

export type AppTheme = 'light' | 'dark'

const themeOptions = [
  { id: 'light', label: 'Açık', Icon: Sun },
  { id: 'dark', label: 'Koyu', Icon: Moon },
] as const

export function SettingsTab({
  appVersion,
  onBack,
  onThemeChange,
  theme,
  faceIdEnabled,
  faceIdAvailable,
  faceIdBusy,
  pinEnabled,
  onFaceIdEnable,
  onFaceIdRemove,
  onPinChange,
  onPinRemove,
}: {
  appVersion: string
  onBack: () => void
  onThemeChange: (theme: AppTheme) => void
  theme: AppTheme
  faceIdEnabled: boolean
  faceIdAvailable: boolean
  faceIdBusy: boolean
  pinEnabled: boolean
  onFaceIdEnable: () => void
  onFaceIdRemove: (enteredPin: string) => boolean
  onPinChange: (pin: string) => void
  onPinRemove: (enteredPin: string) => boolean
}) {
  const { t, language, locale, setLanguage } = useLanguage()
  const { state, updateSharedState } = useSharedAppState()
  const { firstName, secondName, togetherSince } = state
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false)
  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = useState(false)
  const [securityAction, setSecurityAction] = useState<'pin' | 'face-id' | null>(null)
  const [pinDraft, setPinDraft] = useState('')
  const [pinDraftError, setPinDraftError] = useState('')
  const [verificationPin, setVerificationPin] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const publishedAt = 'publishedAt' in appRelease && typeof appRelease.publishedAt === 'string'
    ? appRelease.publishedAt
    : null
  const publicationDate = publishedAt ? new Date(publishedAt) : null
  const formattedPublicationDate = publicationDate && !Number.isNaN(publicationDate.getTime())
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'Europe/Istanbul',
      }).format(publicationDate)
    : null

  const openPinEditor = () => {
    setPinDraft('')
    setPinDraftError('')
    setIsPinDialogOpen(true)
  }

  const savePin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^\d{4}$/.test(pinDraft)) {
      setPinDraftError('Şifre dört rakam olmalı.')
      return
    }
    onPinChange(pinDraft)
    setIsPinDialogOpen(false)
  }

  const openSecurityConfirmation = (action: 'pin' | 'face-id') => {
    setVerificationPin('')
    setVerificationError('')
    setSecurityAction(action)
  }

  const confirmSecurityAction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const confirmed = securityAction === 'pin'
      ? onPinRemove(verificationPin)
      : securityAction === 'face-id'
        ? onFaceIdRemove(verificationPin)
        : false

    if (!confirmed) {
      setVerificationError('Etkin giriş şifresi doğru değil.')
      return
    }

    setSecurityAction(null)
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-bold text-foreground shadow-sm transition-[color,background-color,transform] duration-[var(--motion-duration)] ease-[var(--motion-ease)] hover:bg-muted active:scale-95"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("Geri")}</button>

      <SectionHeader title={t("Ayarlar")} largeTitle />

      <div className="flex flex-col gap-5">
        <SettingsGroup icon={Palette} title={t("Görünüm")}>
          <div role="group" aria-label={t("Tema")} className="grid grid-cols-2 gap-2">
            {themeOptions.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={theme === id}
                onClick={() => onThemeChange(id)}
                className={cn(
                  'flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition-[color,background-color,border-color,transform] duration-[var(--motion-duration)] ease-[var(--motion-ease)] active:scale-95',
                  theme === id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {id === 'light' ? (language === 'en' ? 'Light' : 'Açık') : t(label)}
              </button>
            ))}
          </div>
        </SettingsGroup>

        <SettingsGroup icon={Languages} title={t("Dil")}>
          <div role="group" aria-label={t("Dil")} className="grid grid-cols-2 gap-2">
            {([{ id: 'tr', label: 'Türkçe' }, { id: 'en', label: 'English' }] as const).map(({ id, label }) => (
              <button key={id} type="button" aria-pressed={language === id} onClick={() => setLanguage(id)}
                className={cn('min-h-11 rounded-xl border px-3 text-sm font-bold transition-colors',
                  language === id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground')}>
                {label}
              </button>
            ))}
          </div>
        </SettingsGroup>

        <SettingsGroup icon={UserRound} title={t("Biz")}>
          <div className="grid gap-3">
            <label>
              <span className="sr-only">{t("Birlikte başlangıç tarihi")}</span>
              <span className="date-field flex h-12 items-center rounded-xl border border-border bg-background px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <CalendarDays className="mr-2 size-4 shrink-0 text-primary" aria-hidden="true" />
                <input
                  type="date"
                  value={togetherSince}
                  required
                  onChange={(event) => {
                    if (event.target.value) updateSharedState({ togetherSince: event.target.value })
                  }}
                  className="date-input w-full min-w-0 bg-transparent text-sm font-semibold text-foreground outline-none"
                />
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="sr-only">{t("İlk isim")}</span>
                <input
                  type="text"
                  maxLength={24}
                  value={firstName}
                  onChange={(event) => updateSharedState({ firstName: event.target.value })}
                  placeholder="Şevval"
                  className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label>
                <span className="sr-only">{t("İkinci isim")}</span>
                <input
                  type="text"
                  maxLength={24}
                  value={secondName}
                  onChange={(event) => updateSharedState({ secondName: event.target.value })}
                  placeholder="Orhan"
                  className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
          </div>
        </SettingsGroup>

        <SettingsGroup icon={LockKeyhole} title={t("Kilit ekranı")}>
          <div className="flex min-h-10 items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <ScanFace className="size-4 shrink-0 text-primary" aria-hidden="true" />
              Face ID
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={faceIdEnabled}
              aria-label={`Face ID ${faceIdEnabled ? t("açık") : t("kapalı")}`}
              disabled={!faceIdAvailable || faceIdBusy}
              onClick={() => {
                if (faceIdEnabled) openSecurityConfirmation('face-id')
                else onFaceIdEnable()
              }}
              className={cn(
                'flex h-8 w-[4.75rem] shrink-0 items-center justify-between rounded-full px-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                faceIdEnabled ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span className="sr-only">Face ID</span>
              {faceIdEnabled ? <span className="ml-1 text-[10px] font-black text-primary-foreground">{faceIdBusy ? '...' : t("Açık")}</span> : null}
              <span className="size-6 rounded-full bg-card shadow-sm" />
              {!faceIdEnabled ? <span className="mr-1 text-[10px] font-black text-muted-foreground">{faceIdBusy ? '...' : t("Kapalı")}</span> : null}
            </button>
          </div>

          <div className="mt-4 border-t border-border/60 pt-4">
            <div className="flex min-h-10 items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                <KeyRound className="size-4 shrink-0 text-primary" aria-hidden="true" />
                {t("PIN kodu")}</p>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={openPinEditor} className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground hover:bg-muted">
                  {pinEnabled ? t("Değiştir") : t("Oluştur")}
                </button>
                {pinEnabled ? (
                  <button type="button" onClick={() => openSecurityConfirmation('pin')} className="min-h-10 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-600 hover:bg-rose-100">
                    {t("Kaldır")}</button>
                ) : null}
              </div>
            </div>
          </div>
        </SettingsGroup>

        <SettingsGroup icon={Bell} title={t("Bildirimler")}>
          <MeetupNotificationsButton />
        </SettingsGroup>
      </div>

      <footer className="mt-8 flex items-center justify-center gap-2 pb-3 text-xs font-bold text-muted-foreground" aria-label={t("Uygulama sürümü {version}", { version: appVersion })}>
        <button
          type="button"
          aria-label={t("{version} sürümünün bilgilerini aç", { version: appVersion })}
          aria-haspopup="dialog"
          aria-expanded={isReleaseDialogOpen}
          onClick={() => setIsReleaseDialogOpen(true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Info className="size-4" aria-hidden="true" />
          <span className="tabular-nums">{appVersion}</span>
        </button>
      </footer>

      <AnimatedDialog
        open={isReleaseDialogOpen}
        onClose={() => setIsReleaseDialogOpen(false)}
        titleId="release-info-title"
        className="rounded-3xl"
      >
        <h2 id="release-info-title" className="text-lg font-bold text-foreground">{t("Sürüm bilgileri")}</h2>
        <dl className="mt-5 grid grid-cols-2 gap-4 rounded-2xl border border-border bg-background/70 p-4">
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{t("Sürüm")}</dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">{appVersion}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{t("Yayın tarihi")}</dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
              {formattedPublicationDate && publishedAt
                ? <time dateTime={publishedAt}>{formattedPublicationDate}</time>
                : t("Yayın tarihi belirtilmedi.")}
            </dd>
          </div>
        </dl>
        <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-white">
          {appRelease.changes.map(change => <li key={change}>{t(change)}</li>)}
        </ul>
        <button
          type="button"
          onClick={() => setIsReleaseDialogOpen(false)}
          className="mt-6 min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:opacity-90"
        >
          {t("Kapat")}
        </button>
      </AnimatedDialog>

      <AnimatedDialog
        open={isPinDialogOpen}
        onClose={() => setIsPinDialogOpen(false)}
        titleId="pin-settings-title"
        descriptionId="pin-settings-description"
        className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-5 text-left shadow-2xl"
      >
        <form onSubmit={savePin}>
          <h2 id="pin-settings-title" className="text-lg font-bold text-zinc-900">{pinEnabled ? t("Şifreyi değiştir") : t("Şifre oluştur")}</h2>
          <p id="pin-settings-description" className="mt-1 text-sm text-zinc-500">{t("Uygulama girişinde kullanılacak dört haneli şifreyi gir.")}</p>
          <label className="mt-4 block" htmlFor="new-app-pin">
            <span className="sr-only">{t("Yeni şifre")}</span>
            <input
              id="new-app-pin"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={4}
              autoFocus
              value={pinDraft}
              onChange={(event) => {
                setPinDraft(event.target.value.replace(/\D/g, '').slice(0, 4))
                setPinDraftError('')
              }}
              placeholder="••••"
              className="h-14 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-center text-2xl font-bold tracking-[0.7em] text-zinc-900 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
            />
          </label>
          {pinDraftError ? <p role="alert" className="mt-2 text-sm font-medium text-rose-500">{t(pinDraftError)}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setIsPinDialogOpen(false)} className="min-h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50">{t("İptal")}</button>
            <button type="submit" className="min-h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700">{t("Kaydet")}</button>
          </div>
        </form>
      </AnimatedDialog>

      <AnimatedDialog
        open={securityAction !== null}
        onClose={() => setSecurityAction(null)}
        titleId="security-confirmation-title"
        descriptionId="security-confirmation-description"
        className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-5 text-left shadow-2xl"
      >
        <form onSubmit={confirmSecurityAction}>
          <h2 id="security-confirmation-title" className="text-lg font-bold text-zinc-900">
            {securityAction === 'face-id' ? t("Face ID kaldırılsın mı?") : t("Şifre kaldırılsın mı?")}
          </h2>
          <p id="security-confirmation-description" className="mt-1 text-sm text-zinc-500">{t("Devam etmek için etkin giriş şifreni gir.")}</p>
          <label className="mt-4 block" htmlFor="current-app-pin">
            <span className="sr-only">{t("Etkin giriş şifresi")}</span>
            <input
              id="current-app-pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={4}
              autoFocus
              value={verificationPin}
              onChange={(event) => {
                setVerificationPin(event.target.value.replace(/\D/g, '').slice(0, 4))
                setVerificationError('')
              }}
              placeholder="••••"
              className="h-14 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-center text-2xl font-bold tracking-[0.7em] text-zinc-900 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
            />
          </label>
          {verificationError ? <p role="alert" className="mt-2 text-sm font-medium text-rose-500">{t(verificationError)}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setSecurityAction(null)} className="min-h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50">{t("Vazgeç")}</button>
            <button type="submit" className="min-h-11 rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white hover:bg-rose-600">{t("Kaldır")}</button>
          </div>
        </form>
      </AnimatedDialog>
    </div>
  )
}

function SettingsGroup({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  const { t } = useLanguage()

  return (
    <section className="surface-panel p-4" aria-label={t(title)}>
      <header className="mb-4 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-extrabold text-foreground">{title}</h2>
        </div>
      </header>
      {children}
    </section>
  )
}
