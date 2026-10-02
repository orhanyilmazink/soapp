'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Fingerprint, Heart, LockKeyhole } from 'lucide-react'
import { BottomNav, type TabId } from '@/components/bottom-nav'
import { FloatingHearts } from '@/components/floating-hearts'
import { HomeTab } from '@/components/tabs/home-tab'
import { CalendarTab } from '@/components/tabs/calendar-tab'
import { AchievementsTab } from '@/components/tabs/achievements-tab'
import { BucketListTab } from '@/components/tabs/bucket-list-tab'
import { LetterTab } from '@/components/tabs/letter-tab'
import { SharedAppStateProvider } from '@/lib/shared-app-state'

const tabs: TabId[] = ['home', 'todo', 'calendar', 'achievements', 'letter']
const appPin = '0111'
const rememberedUnlockKey = 'birthday-app-unlocked'
const biometricCredentialKey = 'birthday-app-biometric-credential'
const biometricPromptDismissedKey = 'birthday-app-biometric-prompt-dismissed'

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
  const [isPinVerified, setIsPinVerified] = useState(false)
  const [hasBiometric, setHasBiometric] = useState(false)
  const [canUseBiometric, setCanUseBiometric] = useState(false)
  const [isBiometricBusy, setIsBiometricBusy] = useState(false)
  const [biometricError, setBiometricError] = useState('')
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    let active = true
    const storedCredential = localStorage.getItem(biometricCredentialKey)
    const promptDismissed = localStorage.getItem(biometricPromptDismissedKey) === 'true'
    setHasBiometric(Boolean(storedCredential))
    setIsUnlocked(
      localStorage.getItem(rememberedUnlockKey) === 'true' && !storedCredential && promptDismissed
    )
    setIsReady(true)

    if (
      window.isSecureContext &&
      typeof PublicKeyCredential !== 'undefined' &&
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => {
          if (active) setCanUseBiometric(available)
        })
        .catch(() => {
          if (active) setCanUseBiometric(false)
        })
    }

    return () => {
      active = false
    }
  }, [])

  const unlockApp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pin !== appPin) {
      setPin('')
      setPinError(true)
      return
    }

    setPinError(false)
    setBiometricError('')
    if (localStorage.getItem(biometricCredentialKey)) {
      localStorage.setItem(rememberedUnlockKey, 'true')
      setIsUnlocked(true)
    } else {
      setIsPinVerified(true)
    }
  }

  const rememberPinAndUnlock = () => {
    localStorage.setItem(rememberedUnlockKey, 'true')
    localStorage.setItem(biometricPromptDismissedKey, 'true')
    setIsUnlocked(true)
  }

  const enableBiometric = async () => {
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
            name: 'owner',
            displayName: 'Şevval ♥ Orhan',
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
      setBiometricError('Face ID ayarlanamadı. PIN ile devam edebilirsin.')
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
      setBiometricError('Face ID doğrulanamadı. PIN kodunu kullanabilirsin.')
    } finally {
      setIsBiometricBusy(false)
    }
  }

  const changeTab = (next: TabId) => {
    setTab(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0]
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (touchStartX.current === null || touchStartY.current === null) return

    const touch = event.changedTouches[0]
    const diffX = touch.clientX - touchStartX.current
    const diffY = touch.clientY - touchStartY.current

    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY)) {
      const currentIndex = tabs.indexOf(tab)
      const nextIndex = diffX < 0 ? currentIndex + 1 : currentIndex - 1

      if (nextIndex >= 0 && nextIndex < tabs.length) {
        changeTab(tabs[nextIndex])
      }
    }

    touchStartX.current = null
    touchStartY.current = null
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
          <div className="mx-auto grid size-14 place-items-center rounded-full border border-pink-100 bg-pink-50 text-pink-400">
            {isPinVerified ? <Fingerprint className="size-6" aria-hidden="true" /> : <LockKeyhole className="size-6" aria-hidden="true" />}
          </div>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.32em] text-zinc-400">Şevval ♥ Orhan</p>
          <h1 id="pin-title" className="mt-2 text-2xl font-bold text-zinc-900">
            {!isReady ? 'Açılıyor' : isPinVerified ? 'Face ID ekleyelim mi?' : 'Hoş geldin'}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {!isReady
              ? 'Bir saniye...'
              : isPinVerified
                ? canUseBiometric
                  ? 'Bundan sonra Face ID ile hızlıca giriş yapabilirsin.'
                  : 'Bu cihaz biyometrik giriş desteklemiyor. PIN bu cihazda hatırlanacak.'
                : hasBiometric
                  ? 'Face ID ile ya da PIN kodunla devam et.'
                  : 'Devam etmek için PIN kodunu gir.'}
          </p>

          {isPinVerified ? (
            <div className="mt-6 space-y-3">
              {canUseBiometric && (
                <button
                  type="button"
                  onClick={enableBiometric}
                  disabled={isBiometricBusy}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 text-sm font-bold text-white transition hover:bg-zinc-700 disabled:opacity-50"
                >
                  <Fingerprint className="size-4" aria-hidden="true" />
                  {isBiometricBusy ? 'Ayarlanıyor…' : 'Face ID’yi etkinleştir'}
                </button>
              )}
              <button
                type="button"
                onClick={rememberPinAndUnlock}
                className="h-12 w-full rounded-2xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                {canUseBiometric ? 'Şimdi değil, PIN ile devam et' : 'PIN ile devam et'}
              </button>
            </div>
          ) : (
            <>
              {hasBiometric && (
                <button
                  type="button"
                  onClick={unlockWithBiometric}
                  disabled={isBiometricBusy}
                  className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-pink-50 text-sm font-bold text-zinc-800 transition hover:bg-pink-100 disabled:opacity-50"
                >
                  <Fingerprint className="size-4 text-pink-500" aria-hidden="true" />
                  {isBiometricBusy ? 'Doğrulanıyor…' : 'Face ID ile aç'}
                </button>
              )}
              <form onSubmit={unlockApp} className={hasBiometric ? 'mt-3' : 'mt-6'}>
                <label htmlFor="app-pin" className="sr-only">Dört haneli PIN kodu</label>
                <input
                  id="app-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoFocus
                  value={pin}
                  onChange={(event) => {
                    setPin(event.target.value.replace(/\D/g, '').slice(0, 4))
                    setPinError(false)
                  }}
                  aria-invalid={pinError}
                  aria-describedby={pinError ? 'pin-error' : undefined}
                  placeholder="••••"
                  className="h-14 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-center text-2xl font-bold tracking-[0.7em] text-zinc-900 outline-none transition focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-100"
                />
                {pinError && (
                  <p id="pin-error" role="alert" className="mt-2 text-sm font-medium text-rose-500">
                    PIN kodu hatalı. Tekrar dene.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={!isReady || pin.length !== 4}
                  className="mt-4 h-12 w-full rounded-2xl bg-zinc-900 text-sm font-bold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  PIN ile aç
                </button>
              </form>
            </>
          )}
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
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'pan-y' }}
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
