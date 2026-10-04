'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { CalendarDays, Clock3, Heart, LockKeyhole, Moon, ScanFace, Settings2, Sun } from 'lucide-react'
import { AnimatedDialog } from '@/components/animated-dialog'
import { MeetupNotificationsButton } from '@/components/meetup-notifications'
import { usePresence } from '@/lib/use-presence'
import { useSharedAppState } from '@/lib/shared-app-state'
import { splitDuration, useNow } from '@/lib/use-now'

const pad = (n: number) => n.toString().padStart(2, '0')
export type AppTheme = 'light' | 'dark'
const themeOptions = [
  { id: 'light', label: 'Açık', Icon: Sun },
  { id: 'dark', label: 'Koyu', Icon: Moon },
] as const

export function HomeTab({
  theme,
  onThemeChange,
  faceIdEnabled,
  faceIdAvailable,
  faceIdBusy,
  pinEnabled,
  onFaceIdEnable,
  onFaceIdRemove,
  onPinChange,
  onPinRemove,
}: {
  theme: AppTheme
  onThemeChange: (theme: AppTheme) => void
  faceIdEnabled: boolean
  faceIdAvailable: boolean
  faceIdBusy: boolean
  pinEnabled: boolean
  onFaceIdEnable: () => void
  onFaceIdRemove: (enteredPin: string) => boolean
  onPinChange: (pin: string) => void
  onPinRemove: (enteredPin: string) => boolean
}) {
  const now = useNow()
  const { state, updateSharedState } = useSharedAppState()
  const { firstName, secondName, togetherSince, meetupDate, meetupTime } = state
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false)
  const [messageDraft, setMessageDraft] = useState('')
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false)
  const [securityAction, setSecurityAction] = useState<'pin' | 'face-id' | null>(null)
  const [pinDraft, setPinDraft] = useState('')
  const [pinDraftError, setPinDraftError] = useState('')
  const [verificationPin, setVerificationPin] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const settingsPresent = usePresence(settingsOpen)
  const since = new Date(`${togetherSince}T00:00:00`).getTime()
  const together = now ? splitDuration(now - since) : null

  useEffect(() => {
    if (meetupDate && meetupTime) return
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const defaultDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`
    updateSharedState({ meetupDate: defaultDate, meetupTime: '11:00' })
  }, [meetupDate, meetupTime, updateSharedState])

  const nextMeetup = meetupDate && meetupTime ? new Date(`${meetupDate}T${meetupTime}:00`) : null
  const meetupLeft = now && nextMeetup ? splitDuration(nextMeetup.getTime() - now) : null

  const openMessageEditor = () => {
    setMessageDraft(state.specialMessage)
    setIsMessageDialogOpen(true)
  }

  const saveSpecialMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateSharedState({ specialMessage: messageDraft })
    setIsMessageDialogOpen(false)
  }

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
    <div className="relative flex min-h-[calc(100dvh-12rem)] flex-col justify-center pt-12">
      {settingsPresent && (
        <>
          <button
            type="button"
            aria-label="Ayarlar penceresini kapat"
            onClick={() => setSettingsOpen(false)}
            data-state={settingsOpen ? 'open' : 'closed'}
            className="motion-backdrop fixed inset-0 z-40 cursor-default bg-zinc-950/25 backdrop-blur-sm"
          />
        <div
          id="home-settings"
          role="group"
          aria-label="Uygulama ayarları"
          data-state={settingsOpen ? 'open' : 'closed'}
          aria-hidden={!settingsOpen || undefined}
          className="motion-panel surface-panel absolute left-0 top-12 z-50 flex w-[min(20rem,calc(100vw-2.5rem))] max-w-[calc(100vw-2.5rem)] min-w-0 overflow-hidden flex-col gap-3 p-4 text-left shadow-2xl backdrop-blur-xl"
        >
          <section className="min-w-0 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white/80 p-3">
            <label htmlFor="together-since" className="mb-2 block text-xs font-bold text-zinc-500">
              Birlikte başlangıç tarihi
            </label>
            <span className="date-field flex h-16 w-full min-w-0 max-w-full items-center rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 transition-[border-color,box-shadow,background-color,transform] duration-300 ease-[var(--motion-ease)] focus-within:scale-[1.015] focus-within:border-pink-300 focus-within:bg-pink-50/40 focus-within:ring-2 focus-within:ring-pink-200">
              <input
                id="together-since"
                type="date"
                value={togetherSince}
                required
                onChange={(event) => {
                  if (event.target.value) updateSharedState({ togetherSince: event.target.value })
                }}
                className="date-input w-full min-w-0 text-center text-sm font-semibold text-zinc-800 outline-none"
              />
            </span>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white/80 p-3">
            <p className="mb-2 text-xs font-bold text-zinc-500">İsimler</p>
            <div className="flex flex-col gap-2">
              <label className="sr-only" htmlFor="first-person-name">İlk kişinin adı</label>
              <input
                id="first-person-name"
                type="text"
                maxLength={24}
                value={firstName}
                onChange={(event) => updateSharedState({ firstName: event.target.value })}
                placeholder="Şevval"
                className="min-h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
              />
              <label className="sr-only" htmlFor="second-person-name">İkinci kişinin adı</label>
              <input
                id="second-person-name"
                type="text"
                maxLength={24}
                value={secondName}
                onChange={(event) => updateSharedState({ secondName: event.target.value })}
                placeholder="Orhan"
                className="min-h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white/80 p-3">
            <p className="mb-2 text-xs font-bold text-zinc-500">Tema</p>
            <div className="flex flex-col gap-2">
              {themeOptions.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={theme === id}
                  onClick={() => onThemeChange(id)}
                  className={`flex min-h-11 items-center justify-start gap-2 rounded-xl border px-3 text-sm font-bold transition-colors ${
                    theme === id
                      ? 'border-pink-300 bg-pink-50 text-pink-600'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </section>
          <MeetupNotificationsButton />
          <section className="rounded-2xl border border-zinc-200 bg-white/80 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold text-zinc-800"><ScanFace className="size-4 text-pink-500" aria-hidden="true" /> Face ID</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={faceIdEnabled}
                aria-label={`Face ID ${faceIdEnabled ? 'açık' : 'kapalı'}`}
                disabled={!faceIdAvailable || faceIdBusy}
                onClick={() => {
                  if (faceIdEnabled) openSecurityConfirmation('face-id')
                  else onFaceIdEnable()
                }}
                className={`flex h-8 w-[4.75rem] shrink-0 items-center justify-between rounded-full px-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${faceIdEnabled ? 'bg-pink-500' : 'bg-zinc-200'}`}
              >
                <span className="sr-only">Face ID</span>
                {faceIdEnabled && <span className="ml-1 text-[10px] font-black text-white">{faceIdBusy ? '...' : 'Açık'}</span>}
                <span className="size-6 rounded-full bg-white shadow-sm" />
                {!faceIdEnabled && <span className="mr-1 text-[10px] font-black text-zinc-600">{faceIdBusy ? '...' : 'Kapalı'}</span>}
              </button>
            </div>
          </section>
          <section className="rounded-2xl border border-zinc-200 bg-white/80 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-zinc-800"><LockKeyhole className="size-4 text-pink-500" aria-hidden="true" /> Giriş şifresi</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openPinEditor}
                className="min-h-10 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                {pinEnabled ? 'Şifreyi değiştir' : 'Şifre oluştur'}
              </button>
              {pinEnabled && (
                <button
                  type="button"
                  onClick={() => openSecurityConfirmation('pin')}
                  className="min-h-10 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-100"
                >
                  Kaldır
                </button>
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-zinc-200 bg-white/80 p-3">
            <button
              type="button"
              onClick={openMessageEditor}
              className="flex min-h-10 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Özel mesajı düzenle
            </button>
          </section>
        </div>
        </>
      )}
      <button
        type="button"
        aria-label={settingsOpen ? 'Ayarları kapat' : 'Ayarları aç'}
        aria-expanded={settingsOpen}
        aria-controls={settingsOpen ? 'home-settings' : undefined}
        onClick={() => setSettingsOpen((open) => !open)}
        className="absolute left-0 top-0 z-50 grid size-11 place-items-center rounded-full border border-border/80 bg-card/90 text-foreground shadow-sm backdrop-blur transition hover:scale-105 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
      >
        <Settings2 className="size-5" aria-hidden="true" />
      </button>

      <AnimatedDialog
        open={isMessageDialogOpen}
        onClose={() => setIsMessageDialogOpen(false)}
        titleId="special-message-title"
        descriptionId="special-message-description"
        className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-5 text-left shadow-2xl"
      >
        <form onSubmit={saveSpecialMessage}>
          <h2 id="special-message-title" className="text-lg font-bold text-zinc-900">Özel mesajı düzenle</h2>
          <p id="special-message-description" className="mt-1 text-sm text-zinc-500">Bu mesaj özel mesaj ekranında görünür.</p>
          <label className="mt-4 block" htmlFor="special-message">
            <span className="sr-only">Özel mesaj</span>
            <textarea
              id="special-message"
              value={messageDraft}
              maxLength={1500}
              rows={7}
              autoFocus
              onChange={(event) => setMessageDraft(event.target.value)}
              className="block w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
            />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setIsMessageDialogOpen(false)} className="min-h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50">İptal</button>
            <button type="submit" className="min-h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700">Kaydet</button>
          </div>
        </form>
      </AnimatedDialog>

      <AnimatedDialog
        open={isPinDialogOpen}
        onClose={() => setIsPinDialogOpen(false)}
        titleId="pin-settings-title"
        descriptionId="pin-settings-description"
        className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-5 text-left shadow-2xl"
      >
        <form onSubmit={savePin}>
          <h2 id="pin-settings-title" className="text-lg font-bold text-zinc-900">{pinEnabled ? 'Şifreyi değiştir' : 'Şifre oluştur'}</h2>
          <p id="pin-settings-description" className="mt-1 text-sm text-zinc-500">Uygulama girişinde kullanılacak dört haneli şifreyi gir.</p>
          <label className="mt-4 block" htmlFor="new-app-pin">
            <span className="sr-only">Yeni şifre</span>
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
          {pinDraftError && <p role="alert" className="mt-2 text-sm font-medium text-rose-500">{pinDraftError}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setIsPinDialogOpen(false)} className="min-h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50">İptal</button>
            <button type="submit" className="min-h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700">Kaydet</button>
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
            {securityAction === 'face-id' ? 'Face ID kaldırılsın mı?' : 'Şifre kaldırılsın mı?'}
          </h2>
          <p id="security-confirmation-description" className="mt-1 text-sm text-zinc-500">
            Devam etmek için etkin giriş şifreni gir.
          </p>
          <label className="mt-4 block" htmlFor="current-app-pin">
            <span className="sr-only">Etkin giriş şifresi</span>
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
          {verificationError && <p role="alert" className="mt-2 text-sm font-medium text-rose-500">{verificationError}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setSecurityAction(null)} className="min-h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50">Vazgeç</button>
            <button type="submit" className="min-h-11 rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white hover:bg-rose-600">Kaldır</button>
          </div>
        </form>
      </AnimatedDialog>

      <header className="surface-panel mb-5 px-5 py-4 text-center backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <span className="font-script text-4xl leading-none text-zinc-900 sm:text-5xl">
            {firstName || 'Şevval'}
          </span>
          <Heart
            className="size-5 text-pink-300 drop-shadow-sm sm:size-6"
            fill="currentColor"
            strokeWidth={0}
            aria-hidden="true"
          />
          <span className="font-script text-4xl leading-none text-zinc-900 sm:text-5xl">
            {secondName || 'Orhan'}
          </span>
        </div>
      </header>

      <section
        aria-labelledby="counter-title"
        className="surface-panel relative overflow-hidden p-6 text-center"
      >
        <Heart
          className="absolute -right-6 -top-6 size-28 rotate-12 text-pink-100"
          fill="currentColor"
          strokeWidth={0}
          aria-hidden="true"
        />
        <Heart
          className="relative mx-auto mb-3 size-12 animate-heartbeat text-pink-300"
          fill="currentColor"
          strokeWidth={0}
          aria-hidden="true"
        />
        <h1 id="counter-title" className="relative text-[11px] font-black uppercase tracking-[0.42em] text-zinc-500">
          Birlikte geçirdiğimiz
        </h1>
        <p className="relative mt-1 flex items-baseline justify-center gap-2" aria-live="off">
          <span className="text-7xl font-black tabular-nums tracking-tight text-primary">
            {together ? together.days.toLocaleString('tr-TR') : '—'}
          </span>
          <span className="text-2xl font-bold text-foreground">gün</span>
        </p>

        <dl className="relative mt-5 grid grid-cols-3 gap-2">
          {[
            { label: 'saat', value: together?.hours },
            { label: 'dakika', value: together?.minutes },
            { label: 'saniye', value: together?.seconds },
          ].map((item) => (
            <div key={item.label} className="flex flex-col-reverse rounded-2xl bg-muted px-2 py-3">
              <dt className="text-xs font-semibold text-muted-foreground">{item.label}</dt>
              <dd className="text-2xl font-extrabold tabular-nums text-foreground">
                {item.value === undefined ? '--' : pad(item.value)}
              </dd>
            </div>
          ))}
        </dl>

      </section>

      <section className="surface-panel mt-5 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.38em] text-zinc-500">
              Bir dahaki buluşma
            </p>
          </div>
          <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-pink-500">
            Kalan süre
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="flex h-16 min-w-0 items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-left transition-colors focus-within:ring-2 focus-within:ring-pink-200">
            <CalendarDays className="size-4 shrink-0 text-pink-400" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Tarih</span>
              <input
                aria-label="Buluşma tarihi"
                type="date"
                value={meetupDate}
                onChange={(event) => updateSharedState({ meetupDate: event.target.value })}
                className="mt-0.5 block min-h-6 w-full min-w-0 appearance-none bg-transparent text-sm font-bold text-zinc-900 outline-none"
              />
            </span>
          </label>

            <label className="flex h-16 min-w-0 items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-left transition-colors focus-within:ring-2 focus-within:ring-pink-200">
              <Clock3 className="size-4 shrink-0 text-pink-400" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Saat</span>
                <input
                  aria-label="Buluşma saati"
                  type="time"
                  value={meetupTime}
                  onChange={(event) => updateSharedState({ meetupTime: event.target.value })}
                  className="mt-0.5 block min-h-6 w-full min-w-0 appearance-none bg-transparent text-sm font-bold text-zinc-900 outline-none"
                />
              </span>
            </label>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'gün', value: meetupLeft?.days },
            { label: 'saat', value: meetupLeft?.hours },
            { label: 'dk', value: meetupLeft?.minutes },
            { label: 'sn', value: meetupLeft?.seconds },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-zinc-50 px-2 py-3">
              <div className="text-2xl font-black tabular-nums text-zinc-900">
                {item.value === undefined ? '--' : pad(item.value)}
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
