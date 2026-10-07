'use client'

import { useEffect, useState } from 'react'
import { CalendarClock, HeartHandshake, type LucideIcon } from 'lucide-react'
import { useLanguage } from '@/lib/language'
import { useSharedAppState, type PushSubscriptionRecord } from '@/lib/shared-app-state'

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
type NotificationPreference = keyof PushSubscriptionRecord['preferences']

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
  const [endpoint, setEndpoint] = useState('')

  const current = state.pushSubscriptions.find((item) => item.id === endpoint)
  const enabled = current?.preferences ?? { meetup: false, calendar: false }

  useEffect(() => {
    let active = true

    const syncDevice = async () => {
      if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (active) setEndpoint(subscription?.endpoint ?? '')
    }

    void syncDevice()
    return () => { active = false }
  }, [])

  const subscribe = async () => {
    if (!publicVapidKey || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('Bildirimler bu cihazda henüz kullanılamıyor.')
      return null
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setStatus('Bildirim izni verilmedi.')
      return null
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(publicVapidKey),
    })
    const json = subscription.toJSON()
    if (!json.endpoint || !json.keys?.auth || !json.keys.p256dh) throw new Error('Geçersiz bildirim aboneliği')

    return {
      id: json.endpoint,
      endpoint: json.endpoint,
      expirationTime: json.expirationTime ?? null,
      keys: { auth: json.keys.auth, p256dh: json.keys.p256dh },
      preferences: { meetup: false, calendar: false },
    } satisfies PushSubscriptionRecord
  }

  const setPreference = async (preference: NotificationPreference, nextEnabled: boolean) => {
    try {
      let record = current
      if (nextEnabled && !record) record = await subscribe() ?? undefined
      if (!record) return

      const nextRecord: PushSubscriptionRecord = {
        ...record,
        preferences: { ...record.preferences, [preference]: nextEnabled },
      }
      const hasEnabledPreference = Object.values(nextRecord.preferences).some(Boolean)
      if (!hasEnabledPreference) {
        const registration = await navigator.serviceWorker.ready
        await (await registration.pushManager.getSubscription())?.unsubscribe()
        updateSharedState({ pushSubscriptions: state.pushSubscriptions.filter((item) => item.id !== record.id) })
        setEndpoint('')
      } else {
        updateSharedState({
          pushSubscriptions: [...state.pushSubscriptions.filter((item) => item.id !== nextRecord.id), nextRecord],
        })
        setEndpoint(nextRecord.endpoint)
      }

      const label = preference === 'calendar' ? 'Takvim hatırlatmaları' : 'Buluşma bildirimleri'
      setStatus(`${label} ${nextEnabled ? 'açık.' : 'kapalı.'}`)
    } catch {
      setStatus('Bildirim ayarı değiştirilemedi. Lütfen yeniden dene.')
    }
  }

  return (
    <section className="grid gap-2">
      <NotificationSwitch
        Icon={HeartHandshake}
        label={t('Buluşma bildirimleri')}
        description={t('Buluşma gününe kalan süreyi seçtiğin saatte bildirir.')}
        enabled={enabled.meetup}
        onChange={(value) => void setPreference('meetup', value)}
      />
      <NotificationSwitch
        Icon={CalendarClock}
        label={t('Takvim hatırlatmaları')}
        description={t('Takvimdeki günler için 14, 7 ve 1 gün kala bildirir.')}
        enabled={enabled.calendar}
        onChange={(value) => void setPreference('calendar', value)}
      />
      {status && <p role="status" className="px-1 text-center text-xs text-muted-foreground">{t(status)}</p>}
    </section>
  )
}

function NotificationSwitch({ Icon, label, description, enabled, onChange }: {
  Icon: LucideIcon
  label: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  const { t } = useLanguage()
  return (
    <div className="rounded-2xl border border-border bg-background/80 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {label}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`${label} ${enabled ? t('açık') : t('kapalı')}`}
          onClick={() => onChange(!enabled)}
          className={`flex h-8 w-[4.75rem] shrink-0 items-center justify-between rounded-full px-1 transition-colors ${enabled ? 'bg-primary' : 'bg-muted'}`}
        >
          <span className="sr-only">{label}</span>
          {enabled && <span className="ml-1 text-[10px] font-black text-primary-foreground">{t('Açık')}</span>}
          <span className="size-6 rounded-full bg-card shadow-sm" />
          {!enabled && <span className="mr-1 text-[10px] font-black text-muted-foreground">{t('Kapalı')}</span>}
        </button>
      </div>
    </div>
  )
}
