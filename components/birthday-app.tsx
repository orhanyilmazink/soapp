'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Heart, ScanFace } from 'lucide-react'
import Image from 'next/image'
import { BottomNav, type TabId } from '@/components/bottom-nav'
import { FloatingHearts } from '@/components/floating-hearts'
import { HomeTab, type AppTheme } from '@/components/tabs/home-tab'
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
const LetterTab = dynamic(
  () => import('@/components/tabs/letter-tab').then((module) => module.LetterTab),
  { loading: () => <TabLoading /> }
)

function TabLoading() {
  return <div aria-label="Yükleniyor" role="status" className="surface-panel h-80 animate-pulse" />
}

const defaultAppPin = '0111'
const appPinStorageKey = 'soapp-pin'
const pinDisabledStorageKey = 'soapp-pin-disabled'
const rememberedUnlockKey = 'birthday-app-unlocked'
const biometricCredentialKey = 'birthday-app-biometric-credential'
const biometricPromptDismissedKey = 'birthday-app-biometric-prompt-dismissed'
const themeStorageKey = 'soapp-theme'
const maxBiometricAttempts = 2

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
  const [letterBurstKey, setLetterBurstKey] = useState(0)
  const [appPin, setAppPin] = useState<string | null>(defaultAppPin)
  const pinInputRef = useRef<HTMLInputElement>(null)

  const showBiometricButton = hasBiometric && biometricFailures < maxBiometricAttempts

  useEffect(() => {
    const savedTheme = localStorage.getItem(themeStorageKey)
    const nextTheme: AppTheme = savedTheme === 'dark' ||
      (savedTheme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'dark'
      : 'light'
    document.documentElement.dataset.theme = nextTheme
    setTheme(nextTheme)
  }, [])

  useEffect(() => {
    if (isUnlocked) return

    const root = document.documentElement
    const initialViewportHeight = window.innerHeight
    // Keep the page fixed, then move only the card by a measured amount. This
    // avoids iOS re-centering the whole page while still keeping the PIN field
    // comfortably above the keyboard.
    root.style.setProperty('--login-viewport-height', `${initialViewportHeight}px`)
    root.dataset.loginLocked = 'true'
    const positionLoginCard = () => {
      const visualViewport = window.visualViewport
      if (!visualViewport) return
      const keyboardHeight = Math.max(0, initialViewportHeight - visualViewport.height - visualViewport.offsetTop)
      const translation = keyboardHeight > 80
        ? -Math.min(96, Math.max(48, Math.round(keyboardHeight * 0.28)))
        : 0
      root.style.setProperty('--login-card-translate', `${translation}px`)
    }
    const visualViewport = window.visualViewport
    visualViewport?.addEventListener('resize', positionLoginCard)
    visualViewport?.addEventListener('scroll', positionLoginCard)

    return () => {
      visualViewport?.removeEventListener('resize', positionLoginCard)
      visualViewport?.removeEventListener('scroll', positionLoginCard)
      root.style.removeProperty('--login-viewport-height')
      root.style.removeProperty('--login-card-translate')
      delete root.dataset.loginLocked
    }
  }, [isUnlocked])

  const changeTheme = (nextTheme: AppTheme) => {
    localStorage.setItem(themeStorageKey, nextTheme)
    document.documentElement.dataset.theme = nextTheme
    setTheme(nextTheme)
  }

  useEffect(() => {
    let active = true
    const storedCredential = localStorage.getItem(biometricCredentialKey)
    const promptDismissed = localStorage.getItem(biometricPromptDismissedKey) === 'true'
    const pinDisabled = localStorage.getItem(pinDisabledStorageKey) === 'true'
    const storedPin = localStorage.getItem(appPinStorageKey)
    const activePin = pinDisabled ? null : (storedPin && /^\d{4}$/.test(storedPin) ? storedPin : defaultAppPin)
    setAppPin(activePin)
    setHasBiometric(Boolean(storedCredential))
    setIsUnlocked(
      activePin === null || (localStorage.getItem(rememberedUnlockKey) === 'true' && !storedCredential && promptDismissed)
    )

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
    input.focus()
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
    if (next === tab) {
      if (next === 'letter') setLetterBurstKey((key) => key + 1)
      return
    }
    setTab(next)
    if (next === 'letter') setLetterBurstKey((key) => key + 1)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  if (!isReady || !isUnlocked) {
    return (
      <main className="login-screen flex items-center justify-center overflow-hidden overscroll-none bg-[radial-gradient(ellipse_at_top,rgba(244,114,182,0.1),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,245,247,1))] px-5">
        <FloatingHearts />

        <section aria-labelledby="pin-title" className="login-card relative w-full max-w-sm rounded-3xl border border-white/80 bg-white/85 p-7 text-center shadow-[0_24px_70px_-34px_rgba(24,24,27,0.3)] backdrop-blur-xl sm:p-9">
          <div className="mx-auto grid size-20 place-items-center rounded-full border border-pink-100 bg-pink-50">
            <Image src="/icon1.png" width={72} height={72} alt="" priority className="size-[4.5rem] object-contain" />
          </div>
          <p className="mt-5 text-sm font-black tracking-[0.2em] text-zinc-400">SOapp</p>
          <h1 id="pin-title" className="mt-2 text-2xl font-bold text-zinc-900">
            {!isReady ? 'Açılıyor' : 'Hoş geldin'}
          </h1>
          {(!isReady || !hasBiometric) && (
            <p className="mt-2 text-sm text-zinc-500">
              {!isReady
                ? 'Bir saniye...'
                : canUseBiometric
                  ? 'PIN’i ilk kez girdikten sonra Face ID açılacak.'
                  : 'Dört haneli PIN kodunu gir.'}
            </p>
          )}

          {showBiometricButton && (
            <button
              type="button"
              onClick={unlockWithBiometric}
              disabled={isBiometricBusy}
              className="mt-6 flex h-[60px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-pink-200 bg-zinc-50 text-sm font-bold text-zinc-900 hover:bg-white focus:outline-none focus-visible:outline-none disabled:opacity-50"
            >
              <ScanFace className="size-5 text-pink-500" aria-hidden="true" />
              {isBiometricBusy ? 'Doğrulanıyor…' : 'Face ID ile aç'}
            </button>
          )}
          <div className={showBiometricButton ? 'mt-3' : 'mt-6'}>
            <label htmlFor="app-pin" className="sr-only">Dört haneli PIN kodu</label>
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
                disabled={isBiometricBusy}
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
                PIN hatalı. Tekrar dene.
              </p>
            )}
          </div>
          {biometricError && <p role="alert" className="mt-3 text-sm font-medium text-rose-500">{biometricError}</p>}
        </section>
      </main>
    )
  }

  return (
    <SharedAppStateProvider>
      <div className="app-shell relative min-h-dvh overflow-x-hidden">
        <FloatingHearts letterBurstKey={letterBurstKey} />
        <main
          id={`panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          className="relative mx-auto w-full max-w-md px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-32"
        >
          <div key={tab} className="tab-view">
            {tab === 'home' && (
              <HomeTab
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
            )}
            {tab === 'calendar' && <CalendarTab />}
            {tab === 'achievements' && <AchievementsTab />}
            {tab === 'todo' && <BucketListTab />}
            {tab === 'letter' && <LetterTab />}
          </div>
        </main>
        <BottomNav active={tab} onChange={changeTab} />
      </div>
    </SharedAppStateProvider>
  )
}
