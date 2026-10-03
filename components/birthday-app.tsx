'use client'

import { useEffect, useState } from 'react'
import { Heart, ScanFace } from 'lucide-react'
import Image from 'next/image'
import { BottomNav, type TabId } from '@/components/bottom-nav'
import { FloatingHearts } from '@/components/floating-hearts'
import { HomeTab } from '@/components/tabs/home-tab'
import { CalendarTab } from '@/components/tabs/calendar-tab'
import { AchievementsTab } from '@/components/tabs/achievements-tab'
import { BucketListTab } from '@/components/tabs/bucket-list-tab'
import { LetterTab } from '@/components/tabs/letter-tab'
import { SharedAppStateProvider } from '@/lib/shared-app-state'

const appPin = '0111'
const rememberedUnlockKey = 'birthday-app-unlocked'
const biometricCredentialKey = 'birthday-app-biometric-credential'
const biometricPromptDismissedKey = 'birthday-app-biometric-prompt-dismissed'
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

  const showBiometricButton = hasBiometric && biometricFailures < maxBiometricAttempts

  useEffect(() => {
    let active = true
    const storedCredential = localStorage.getItem(biometricCredentialKey)
    const promptDismissed = localStorage.getItem(biometricPromptDismissedKey) === 'true'
    setHasBiometric(Boolean(storedCredential))
    setIsUnlocked(
      localStorage.getItem(rememberedUnlockKey) === 'true' && !storedCredential && promptDismissed
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

  const rememberPinAndUnlock = () => {
    localStorage.setItem(rememberedUnlockKey, 'true')
    localStorage.setItem(biometricPromptDismissedKey, 'true')
    setIsUnlocked(true)
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
    setTab(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!isReady || !isUnlocked) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,rgba(244,114,182,0.1),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,245,247,1))] px-5">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <Heart className="absolute left-[12%] top-[18%] size-5 text-pink-200/70" fill="currentColor" strokeWidth={0} />
          <Heart className="absolute right-[14%] top-[28%] size-3 text-pink-200/70" fill="currentColor" strokeWidth={0} />
          <Heart className="absolute bottom-[20%] left-[22%] size-4 text-pink-200/70" fill="currentColor" strokeWidth={0} />
        </div>

        <section aria-labelledby="pin-title" className="relative w-full max-w-sm rounded-3xl border border-white/80 bg-white/85 p-7 text-center shadow-[0_24px_70px_-34px_rgba(24,24,27,0.3)] backdrop-blur-xl sm:p-9">
          <div className="mx-auto grid size-16 place-items-center rounded-full border border-pink-100 bg-pink-50">
            <Image src="/icon-512-v3.png" width={56} height={56} alt="" priority className="size-14 object-contain" />
          </div>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.32em] text-zinc-400">SOapp</p>
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
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-pink-50 text-sm font-bold text-zinc-800 transition hover:bg-pink-100 disabled:opacity-50"
            >
              <ScanFace className="size-5 text-pink-500" aria-hidden="true" />
              {isBiometricBusy ? 'Doğrulanıyor…' : 'Face ID ile aç'}
            </button>
          )}
          <div className={showBiometricButton ? 'mt-3' : 'mt-6'}>
            <label htmlFor="app-pin" className="sr-only">Dört haneli PIN kodu</label>
            <div className={pinError ? 'pin-reject-animation' : undefined}>
              <input
                id="app-pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus
                disabled={isBiometricBusy}
                value={pin}
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
                className={`h-14 w-full rounded-2xl border px-4 text-center text-2xl font-bold tracking-[0.7em] outline-none transition focus:bg-white focus:ring-4 ${pinError ? 'border-rose-300 bg-rose-50 text-rose-700 focus:border-rose-300 focus:ring-rose-100' : 'border-zinc-200 bg-zinc-50 text-zinc-900 focus:border-pink-300 focus:ring-pink-100'}`}
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
      <div className="relative min-h-dvh overflow-x-hidden bg-[radial-gradient(ellipse_at_top,rgba(244,114,182,0.1),transparent_32%),radial-gradient(ellipse_at_bottom_right,rgba(212,212,216,0.18),transparent_35%)]">
        <FloatingHearts />
        <main
          id={`panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          className="relative mx-auto w-full max-w-md px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-32"
        >
          <div key={tab} className="animate-[fadeIn_0.35s_ease,slideIn_0.4s_cubic-bezier(0.22,1,0.36,1)]">
            {tab === 'home' && <HomeTab />}
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
