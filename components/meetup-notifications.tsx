'use client'

import { useLanguage } from '@/lib/language'

import { useEffect, useState } from 'react'
import { useSharedAppState, type PushSubscriptionRecord } from '@/lib/shared-app-state'

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function base64UrlToUint8Array(value: string) {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

export function MeetupNotificationsButton() {
  const { t } = useLanguage()

  const { state, updateSharedState } = useSharedAppState()
  const [status, setStatus] = useState('')
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    let active = true

    const syncEnabledState = async () => {
      if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (!active) return
      setEnabled(Boolean(subscription && state.pushSubscriptions.some((item) => item.id === subscription.endpoint)))
    }

    void syncEnabledState()
    return () => {
      active = false
    }
  }, [state.pushSubscriptions])

  const enableNotifications = async () => {
    if (!publicVapidKey || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('Bildirimler bu cihazda henüz kullanılamıyor.')
      return
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setStatus('Bildirim izni verilmedi.')
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(publicVapidKey),
      })
      const json = subscription.toJSON()
      if (!json.endpoint || !json.keys?.auth || !json.keys.p256dh) throw new Error('Geçersiz bildirim aboneliği')

      const record: PushSubscriptionRecord = {
        id: json.endpoint,
        endpoint: json.endpoint,
        expirationTime: json.expirationTime ?? null,
        keys: { auth: json.keys.auth, p256dh: json.keys.p256dh },
      }
      updateSharedState({
        pushSubscriptions: [...state.pushSubscriptions.filter((item) => item.id !== record.id), record],
      })
      setEnabled(true)
      setStatus('Buluşma bildirimleri açık.')
    } catch {
      setStatus('Bildirimler açılamadı. Lütfen yeniden dene.')
    }
  }

  const disableNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        updateSharedState({
          pushSubscriptions: state.pushSubscriptions.filter((item) => item.id !== subscription.endpoint),
        })
      }
      setEnabled(false)
      setStatus('Buluşma bildirimleri kapalı.')
    } catch {
      setStatus('Bildirimler kapatılamadı. Lütfen yeniden dene.')
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white/80 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-foreground">{t("Buluşma bildirimleri")}</p>
        </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`${t('Buluşma bildirimleri')} ${enabled ? t("açık") : t("kapalı")}`}
        onClick={() => void (enabled ? disableNotifications() : enableNotifications())}
        className={`flex h-8 w-[4.75rem] shrink-0 items-center justify-between rounded-full px-1 transition-colors ${enabled ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className="sr-only">{t("Buluşma bildirimleri")}</span>
        {enabled && <span className="ml-1 text-[10px] font-black text-primary-foreground">{t("Açık")}</span>}
        <span className="size-6 rounded-full bg-card shadow-sm" />
        {!enabled && <span className="mr-1 text-[10px] font-black text-muted-foreground">{t("Kapalı")}</span>}
      </button>
      </div>
      {status && <p role="status" className="mt-2 text-center text-xs text-zinc-500">{t(status)}</p>}
    </section>
  )
}
