'use client'

import { useLanguage } from '@/lib/language'
import { restoreLoginViewport } from '@/lib/login-viewport'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ScanFace } from 'lucide-react'
import Image from 'next/image'
import { BottomNav, type TabId } from '@/components/bottom-nav'
import { FloatingHearts } from '@/components/floating-hearts'
import type { AppTheme } from '@/components/tabs/settings-tab'
import { HomeTab } from '@/components/tabs/home-tab'
import { SharedAppStateProvider } from '@/lib/shared-app-state'

const CalendarTab = dynamic(
  () => import('@/components/tabs/calendar-tab').then((module) => module.CalendarTab),
  { loading: () => <TabLoading /> }
)
const AchievementsTab = dynamic(
  () => import('@/components/tabs/achievements-tab').then((module) => module.AchievementsTab),
  { loading: () => <TabLoading /> }
)
const BucketListTab = dynamic(
  () => import('@/components/tabs/bucket-list-tab').then((module) => module.BucketListTab),
  { loading: () => <TabLoading /> }
)
const WishlistTab = dynamic(
  () => import('@/components/tabs/wishlist-tab').then((module) => module.WishlistTab),
  { loading: () => <TabLoading /> }
)
const SettingsTab = dynamic(
  () => import('@/components/tabs/settings-tab').then((module) => module.SettingsTab),
  { loading: () => <TabLoading /> }
)

function TabLoading() {
  const { t } = useLanguage()

  return <div aria-label={t("Yükleniyor")} role="status" className="surface-panel h-80 animate-pulse" />
}

const defaultAppPin = '0111'
const appPinStorageKey = 'soapp-pin'
const pinDisabledStorageKey = 'soapp-pin-disabled'
const rememberedUnlockKey = 'birthday-app-unlocked'
const biometricCredentialKey = 'birthday-app-biometric-credential'
const biometricPromptDismissedKey = 'birthday-app-biometric-prompt-dismissed'
const themeStorageKey = 'soapp-theme'
const maxBiometricAttempts = 2
const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? 'v.0.1.0.0'
const updateResumeKey = 'soapp-update-resume'

function randomChallenge() {
  return crypto.getRandomValues(new Uint8Array(32))
}

function encodeCredentialId(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function decodeCredentialId(encoded: string) {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export function BirthdayApp() {
  const { t } = useLanguage()

  const [tab, setTab] = useState<TabId>('home')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [hasBiometric, setHasBiometric] = useState(false)
  const [canUseBiometric, setCanUseBiometric] = useState(false)
  const [isBiometricBusy, setIsBiometricBusy] = useState(false)
  const [biometricError, setBiometricError] = useState('')
  const [biometricFailures, setBiometricFailures] = useState(0)
  const [pinSetupFailed, setPinSetupFailed] = useState(false)
  const [theme, setTheme] = useState<AppTheme>('light')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [appPin, setAppPin] = useState<string | null>(defaultAppPin)
  const pinInputRef = useRef<HTMLInputElement>(null)
  const loginCardRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLElement>(null)

  const showBiometricButton = !isReady || (hasBiometric && biometricFailures < maxBiometricAttempts)

  useEffect(() => {
    const preserveUpdateSession = (event: Event) => {
      if (!isUnlocked || isBiometricBusy) return
      try {
        sessionStorage.setItem(updateResumeKey, JSON.stringify({
          version: (event as CustomEvent<{ version: string }>).detail.version,
          expiresAt: Date.now() + 30_000,
          tab,
          settingsOpen: isSettingsOpen,
        }))
      } catch {}
    }
    window.addEventListener('soapp:before-update', preserveUpdateSession)
    return () => window.removeEventListener('soapp:before-update', preserveUpdateSession)
  }, [isUnlocked, isBiometricBusy, tab, isSettingsOpen])

  useEffect(() => {
    const savedTheme = localStorage.getItem(themeStorageKey)
    const nextTheme: AppTheme = savedTheme === 'dark' ||
      (savedTheme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'dark'
      : 'light'
    document.documentElement.dataset.theme = nextTheme
    // Reapply after hydration: iOS can restore Next's initial metadata after
    // the early theme script, including while the PIN screen is still locked.
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta =>
      meta.setAttribute('content', nextTheme === 'dark' ? '#190d15' : '#fff4f8')
    )
    setTheme(nextTheme)

  }, [])

  useLayoutEffect(() => {
    if (isUnlocked) return restoreLoginViewport()

    const root = document.documentElement
    const loginInput = pinInputRef.current
    const visualViewport = window.visualViewport
    let lockedViewportHeight = Math.round(window.innerHeight)
    let cardTranslation = 0
    let restingCardBounds: { top: number; bottom: number } | null = null

    // iOS does not resize the layout viewport consistently when its keyboard
    // opens. Keep the login layout on its pre-keyboard height and position the
    // card from the visual viewport instead of letting flexbox re-centre it.
    const setLockedViewportHeight = (height: number) => {
      lockedViewportHeight = Math.round(height)
      root.style.setProperty('--login-viewport-height', `${lockedViewportHeight}px`)
    }

    const setCardTranslation = (translation: number) => {
      cardTranslation = Math.round(translation)
      root.style.setProperty('--login-card-translate', `${cardTranslation}px`)
    }

    root.dataset.loginLocked = 'true'

    // Freeze geometry only when the user starts PIN entry. Startup viewport
    // resize/scroll events must never feed a new height back into the page.
    const beginPinEntry = () => {
      const card = loginCardRef.current
      if (!card) return
      setLockedViewportHeight(card.parentElement?.getBoundingClientRect().height ?? window.innerHeight)
      const bounds = card.getBoundingClientRect()
      restingCardBounds = { top: bounds.top - cardTranslation, bottom: bounds.bottom - cardTranslation }
    }
    const endPinEntry = () => {
      setCardTranslation(0)
      root.style.removeProperty('--login-viewport-height')
      restingCardBounds = null
    }

    const positionLoginCard = () => {
      const card = loginCardRef.current
      if (!visualViewport || !card || document.activeElement !== loginInput) return

      const keyboardHeight = Math.max(
        0,
        lockedViewportHeight - visualViewport.height - visualViewport.offsetTop
      )

      if (keyboardHeight < 80) {
        setCardTranslation(0)
        return
      }

      if (!restingCardBounds) {
        const cardBounds = card.getBoundingClientRect()
        restingCardBounds = {
          top: cardBounds.top - cardTranslation,
          bottom: cardBounds.bottom - cardTranslation,
        }
      }

      const { top: naturalCardTop, bottom: naturalCardBottom } = restingCardBounds
      const keyboardGap = 24
      const visibleBottom = visualViewport.height + visualViewport.offsetTop
      const desiredTranslation = visibleBottom - keyboardGap - naturalCardBottom
      // Keep the card visible even on unusually short landscape viewports.
      const highestAllowedTranslation = 16 - naturalCardTop
      setCardTranslation(Math.min(0, Math.max(highestAllowedTranslation, desiredTranslation)))
    }

    visualViewport?.addEventListener('resize', positionLoginCard)
    visualViewport?.addEventListener('scroll', positionLoginCard)
    window.addEventListener('resize', positionLoginCard)
    loginInput?.addEventListener('focus', beginPinEntry)
    loginInput?.addEventListener('blur', endPinEntry)

    return () => {
      visualViewport?.removeEventListener('resize', positionLoginCard)
      visualViewport?.removeEventListener('scroll', positionLoginCard)
      window.removeEventListener('resize', positionLoginCard)
      loginInput?.removeEventListener('focus', beginPinEntry)
      loginInput?.removeEventListener('blur', endPinEntry)
      root.style.removeProperty('--login-viewport-height')
      root.style.removeProperty('--login-card-translate')
      delete root.dataset.loginLocked
      // Explicitly dismiss the PIN keyboard before mounting fixed navigation.
      loginInput?.blur()
    }
  }, [isUnlocked])

  const changeTheme = (nextTheme: AppTheme) => {
    localStorage.setItem(themeStorageKey, nextTheme)
    document.documentElement.dataset.theme = nextTheme
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta =>
      meta.setAttribute('content', nextTheme === 'dark' ? '#190d15' : '#fff4f8')
    )
    setTheme(nextTheme)
  }

  useLayoutEffect(() => {
    let active = true
    const storedCredential = localStorage.getItem(biometricCredentialKey)
    const promptDismissed = localStorage.getItem(biometricPromptDismissedKey) === 'true'
    const pinDisabled = localStorage.getItem(pinDisabledStorageKey) === 'true'
    const storedPin = localStorage.getItem(appPinStorageKey)
    const activePin = pinDisabled ? null : (storedPin && /^\d{4}$/.test(storedPin) ? storedPin : defaultAppPin)
    let resumeUpdate = false
    try {
      const saved = sessionStorage.getItem(updateResumeKey)
      sessionStorage.removeItem(updateResumeKey)
      const resume = saved ? JSON.parse(saved) : null
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      if (navigation?.type === 'reload' && resume?.version === appVersion && resume.expiresAt > Date.now() &&
        ['home', 'calendar', 'achievements', 'todo', 'wishlist'].includes(resume.tab)) {
        resumeUpdate = true
        setTab(resume.tab as TabId)
        setIsSettingsOpen(resume.settingsOpen === true)
      }
    } catch {}
    setAppPin(activePin)
    setHasBiometric(Boolean(storedCredential))
    setIsUnlocked(
      resumeUpdate || activePin === null || (localStorage.getItem(rememberedUnlockKey) === 'true' && !storedCredential && promptDismissed)
    )
    // Local settings are ready now; authenticator discovery must not delay PIN entry.
    setIsReady(true)

    const canCheckBiometrics =
      window.isSecureContext &&
      typeof PublicKeyCredential !== 'undefined' &&
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'

    if (canCheckBiometrics) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => {
          if (!active) return
          setCanUseBiometric(available)
          setIsReady(true)
        })
        .catch(() => {
          if (!active) return
          setCanUseBiometric(false)
          setIsReady(true)
        })
    } else {
      setIsReady(true)
    }

    return () => {
      active = false
    }
  }, [])

  const unlockApp = (enteredPin: string) => {
    if (!appPin) {
      setIsUnlocked(true)
      return
    }
    if (enteredPin !== appPin) {
      setPin('')
      setPinError(true)
      return
    }

    setPinError(false)
    setBiometricError('')
    if (localStorage.getItem(biometricCredentialKey)) {
      localStorage.setItem(rememberedUnlockKey, 'true')
      setIsUnlocked(true)
    } else if (pinSetupFailed) {
      setIsUnlocked(true)
    } else if (canUseBiometric && !pinSetupFailed) {
      // Start enrollment from the PIN submit gesture so there is no extra
      // in-app confirmation screen before the device's Face ID prompt.
      void enableBiometric()
    } else {
      rememberPinAndUnlock()
    }
  }

  // iOS does not open the software keyboard for focus that happens during
  // render. Keep the field unfocused initially, then focus it directly from
  // the user's touch so the keyboard request is trusted by WebKit.
  const focusPinInput = () => {
    const input = pinInputRef.current
    if (!input || input.disabled) return
    try {
      input.focus({ preventScroll: true })
    } catch {
      input.focus()
    }
  }

  const rememberPinAndUnlock = () => {
    localStorage.setItem(rememberedUnlockKey, 'true')
    localStorage.setItem(biometricPromptDismissedKey, 'true')
    setIsUnlocked(true)
  }

  const disableBiometric = () => {
    localStorage.removeItem(biometricCredentialKey)
    localStorage.removeItem(rememberedUnlockKey)
    localStorage.removeItem(biometricPromptDismissedKey)
    setHasBiometric(false)
    setBiometricFailures(0)
    setPinSetupFailed(false)
  }

  const changeAppPin = (nextPin: string) => {
    localStorage.setItem(appPinStorageKey, nextPin)
    localStorage.removeItem(pinDisabledStorageKey)
    setAppPin(nextPin)
  }

  const removeAppPin = (enteredPin: string) => {
    if (!appPin || enteredPin !== appPin) return false
    localStorage.removeItem(appPinStorageKey)
    localStorage.setItem(pinDisabledStorageKey, 'true')
    setAppPin(null)
    setIsUnlocked(true)
    return true
  }

  const disableBiometricWithPin = (enteredPin: string) => {
    if (!appPin || enteredPin !== appPin) return false
    disableBiometric()
    return true
  }

  async function enableBiometric() {
    if (!canUseBiometric) return
    setIsBiometricBusy(true)
    setBiometricError('')

    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: randomChallenge(),
          rp: { name: 'Şevval ♥ Orhan', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode('birthday-app-owner'),
            name: 'SOapp',
            displayName: 'SOapp',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            residentKey: 'discouraged',
            userVerification: 'required',
          },
          attestation: 'none',
          timeout: 60_000,
        },
      })

      if (!(credential instanceof PublicKeyCredential)) {
        throw new Error('Biometric registration did not return a public key credential.')
      }

      localStorage.setItem(biometricCredentialKey, encodeCredentialId(credential.rawId))
      localStorage.setItem(rememberedUnlockKey, 'true')
      localStorage.setItem(biometricPromptDismissedKey, 'true')
      setHasBiometric(true)
      setIsUnlocked(true)
    } catch {
      setPinSetupFailed(true)
      setBiometricError('Face ID kurulamadı. PIN kodunu girerek devam et.')
      setPin('')
    } finally {
      setIsBiometricBusy(false)
    }
  }

  const unlockWithBiometric = async () => {
    const encodedCredential = localStorage.getItem(biometricCredentialKey)
    if (!encodedCredential) return
    setIsBiometricBusy(true)
    setBiometricError('')

    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: randomChallenge(),
          rpId: window.location.hostname,
          allowCredentials: [{ type: 'public-key', id: decodeCredentialId(encodedCredential) }],
          userVerification: 'required',
          timeout: 60_000,
        },
      })

      if (
        !(credential instanceof PublicKeyCredential) ||
        encodeCredentialId(credential.rawId) !== encodedCredential
      ) {
        throw new Error('Biometric authentication did not match the saved credential.')
      }

      localStorage.setItem(rememberedUnlockKey, 'true')
      setIsUnlocked(true)
    } catch {
      const failures = biometricFailures + 1
      setBiometricFailures(failures)
      setBiometricError(
        failures >= maxBiometricAttempts
          ? 'Face ID iki kez doğrulanamadı. PIN kodunu gir.'
          : 'Yüz tanınmadı. Bir kez daha dene.'
      )
    } finally {
      setIsBiometricBusy(false)
    }
  }

  const changeTab = (next: TabId) => {
    setIsSettingsOpen(false)
    if (next === tab) return
    setTab(next)
    contentRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }

  const openSettings = () => {
    setIsSettingsOpen(true)
    contentRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }

  const closeSettings = () => {
    setIsSettingsOpen(false)
    contentRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }

  if (!isReady || !isUnlocked) {
    return (
      <main aria-busy={isBiometricBusy} className="login-screen app-backdrop flex items-center justify-center overflow-hidden overscroll-none px-5">
        <FloatingHearts />

        <section ref={loginCardRef} aria-labelledby="pin-title" className="login-card relative w-full max-w-sm rounded-3xl border border-white/80 bg-white/85 p-7 text-center shadow-[0_24px_70px_-34px_rgba(24,24,27,0.3)] backdrop-blur-xl sm:p-9">
          <div className="mx-auto grid size-20 place-items-center rounded-full border border-pink-100 bg-pink-50">
            <Image src="/icon1.png" width={72} height={72} alt="" priority className="size-[4.5rem] object-contain" />
          </div>
          <p className="mt-5 text-sm font-black tracking-[0.2em] text-zinc-400">SOapp</p>
          <h1 id="pin-title" className="mt-2 text-2xl font-bold text-zinc-900">
            {t("Hoş geldin")}
          </h1>
          {isReady && !hasBiometric && (
            <p className="mt-2 text-sm text-zinc-500">
              {canUseBiometric
                  ? t("PIN’i ilk kez girdikten sonra Face ID açılacak.")
                  : t("Dört haneli PIN kodunu gir.")}
            </p>
          )}

          {showBiometricButton && (
            <button
              type="button"
              onClick={unlockWithBiometric}
              disabled={!isReady || isBiometricBusy}
              className={`mt-6 flex h-[60px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-pink-200 bg-zinc-50 text-sm font-bold text-zinc-900 hover:bg-white focus:outline-none focus-visible:outline-none ${isBiometricBusy ? 'opacity-50' : ''}`}
            >
              <ScanFace className="size-5 text-pink-500" aria-hidden="true" />
              {isBiometricBusy ? t("Doğrulanıyor…") : t("Face ID ile aç")}
            </button>
          )}
          <div className={showBiometricButton ? 'mt-3' : 'mt-6'}>
            <label htmlFor="app-pin" className="sr-only">{t("Dört haneli PIN kodu")}</label>
            <div className={`${pinError ? 'pin-reject-animation ' : ''}h-[60px] rounded-2xl border-2 border-pink-200 bg-zinc-50 transition-colors focus-within:border-pink-400 focus-within:bg-white`}>
              <input
                ref={pinInputRef}
                id="app-pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={4}
                enterKeyHint="done"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={!isReady || isBiometricBusy}
                value={pin}
                onPointerDown={focusPinInput}
                onChange={(event) => {
                  const enteredPin = event.target.value.replace(/\D/g, '').slice(0, 4)
                  setPin(enteredPin)
                  setPinError(false)
                  setBiometricError('')
                  if (enteredPin.length === 4) unlockApp(enteredPin)
                }}
                aria-invalid={pinError}
                aria-describedby={pinError ? 'pin-error' : undefined}
                placeholder="••••"
                className={`login-pin-input h-full w-full rounded-[0.875rem] border-0 px-4 text-center text-2xl font-bold tracking-[0.7em] ${pinError ? 'bg-rose-50 text-rose-700' : 'bg-transparent text-zinc-900'}`}
              />
            </div>
            {pinError && (
              <p id="pin-error" role="alert" className="mt-2 text-sm font-medium text-rose-500">
                {t("PIN hatalı. Tekrar dene.")}</p>
            )}
          </div>
          {biometricError && <p role="alert" className="mt-3 text-sm font-medium text-rose-500">{t(biometricError)}</p>}
        </section>
      </main>
    )
  }

  return (
    <SharedAppStateProvider>
      <div aria-busy={isBiometricBusy} className="app-shell app-backdrop">
        <FloatingHearts />
        <main
          ref={contentRef}
          id={isSettingsOpen ? 'panel-settings' : `panel-${tab}`}
          role="tabpanel"
          aria-labelledby={isSettingsOpen ? undefined : `tab-${tab}`}
          aria-label={isSettingsOpen ? t("Ayarlar") : undefined}
          className={`app-content relative mx-auto w-full max-w-md px-5 pt-[calc(env(safe-area-inset-top,0px)+2rem)] ${isSettingsOpen ? 'pb-[calc(env(safe-area-inset-bottom,0px)+2rem)]' : 'pb-32'}`}
        >
          <div key={isSettingsOpen ? 'settings' : tab} className={isSettingsOpen ? 'settings-view' : 'tab-view'}>
            {isSettingsOpen ? (
              <SettingsTab
                appVersion={appVersion}
                onBack={closeSettings}
                theme={theme}
                onThemeChange={changeTheme}
                faceIdEnabled={hasBiometric}
                faceIdAvailable={canUseBiometric}
                faceIdBusy={isBiometricBusy}
                pinEnabled={appPin !== null}
                onFaceIdEnable={() => void enableBiometric()}
                onFaceIdRemove={disableBiometricWithPin}
                onPinChange={changeAppPin}
                onPinRemove={removeAppPin}
              />
            ) : null}
            {!isSettingsOpen && tab === 'home' ? (
              <HomeTab onOpenSettings={openSettings} />
            ) : null}
            {!isSettingsOpen && tab === 'calendar' ? <CalendarTab /> : null}
            {!isSettingsOpen && tab === 'achievements' ? <AchievementsTab /> : null}
            {!isSettingsOpen && tab === 'todo' ? <BucketListTab /> : null}
            {!isSettingsOpen && tab === 'wishlist' ? <WishlistTab /> : null}
          </div>
        </main>
        {!isSettingsOpen ? <BottomNav active={tab} onChange={changeTab} /> : null}
      </div>
    </SharedAppStateProvider>
  )
}
