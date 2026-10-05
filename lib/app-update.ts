const checkInterval = 15_000
const idleDelay = 3_000
const retryDelay = 120_000
const reloadGuardKey = 'soapp-update-reload'

/** Check the production alias, rather than relying on sw.js changing per deploy. */
export function startAppUpdateMonitor(currentVersion: string, targetWindow: Window = window) {
  const document = targetWindow.document
  let disposed = false
  let checking = false
  let reloading = false
  let pendingVersion: string | null = null
  let lastInteraction = 0
  let reloadTimer: number | undefined
  let requestController: AbortController | undefined

  const canReload = () => {
    const activeElement = document.activeElement
    const editing = activeElement instanceof Element && (
      activeElement.matches('input, textarea, select') ||
      Boolean(activeElement.closest('[contenteditable]:not([contenteditable="false"])'))
    )
    return document.visibilityState === 'visible' && targetWindow.navigator.onLine !== false &&
      !editing && !document.querySelector('[role="dialog"], [role="alertdialog"]') &&
      !document.querySelector('[aria-busy="true"]') &&
      Date.now() - lastInteraction >= idleDelay
  }

  const applyUpdate = () => {
    if (disposed || reloading || !pendingVersion || !canReload()) return
    try {
      const guard = JSON.parse(targetWindow.sessionStorage.getItem(reloadGuardKey) ?? 'null')
      if (guard?.from === currentVersion && guard?.to === pendingVersion && Date.now() - guard.at < retryDelay) return
      targetWindow.sessionStorage.setItem(reloadGuardKey, JSON.stringify({ from: currentVersion, to: pendingVersion, at: Date.now() }))
    } catch {
      // Private mode may make session storage unavailable; version checks still work.
    }

    reloading = true
    targetWindow.dispatchEvent(new CustomEvent('soapp:before-update', { detail: { version: pendingVersion } }))
    // Navigation is network-first in our service worker. Refresh its offline cache
    // too, but don't block a live update on service worker installation.
    if ('serviceWorker' in targetWindow.navigator) {
      void targetWindow.navigator.serviceWorker.getRegistration()
        .then((registration) => registration?.update()).catch(() => {})
    }
    targetWindow.location.reload()
  }

  const scheduleUpdate = () => {
    if (reloadTimer !== undefined) targetWindow.clearTimeout(reloadTimer)
    reloadTimer = targetWindow.setTimeout(applyUpdate, idleDelay)
  }

  const checkVersion = async () => {
    if (disposed || checking || reloading || document.visibilityState !== 'visible' || targetWindow.navigator.onLine === false) return
    checking = true
    requestController = new AbortController()
    const timeout = targetWindow.setTimeout(() => requestController?.abort(), 8_000)
    try {
      const response = await targetWindow.fetch('/api/version', {
        cache: 'no-store',
        signal: requestController.signal,
      })
      if (!response.ok) return
      const data: unknown = await response.json()
      if (disposed || !data || typeof data !== 'object' || !('version' in data) ||
        typeof data.version !== 'string' || !/^v\.\d+\.\d+\.\d+\.\d+$/.test(data.version)) return
      pendingVersion = data.version === currentVersion ? null : data.version
      applyUpdate()
    } catch {
      // A failed/offline check must never interrupt the current screen.
    } finally {
      targetWindow.clearTimeout(timeout)
      checking = false
      requestController = undefined
    }
  }

  const onInteraction = () => {
    lastInteraction = Date.now()
    if (pendingVersion) scheduleUpdate()
  }
  const onReturn = () => { void checkVersion() }
  const interactionEvents = ['input', 'change', 'pointerdown', 'keydown', 'focusin', 'focusout'] as const
  for (const event of interactionEvents) document.addEventListener(event, onInteraction, true)
  document.addEventListener('visibilitychange', onReturn)
  targetWindow.addEventListener('online', onReturn)
  targetWindow.addEventListener('pageshow', onReturn)

  const interval = targetWindow.setInterval(() => { void checkVersion() }, checkInterval)
  void checkVersion()

  return () => {
    disposed = true
    requestController?.abort()
    targetWindow.clearInterval(interval)
    if (reloadTimer !== undefined) targetWindow.clearTimeout(reloadTimer)
    for (const event of interactionEvents) document.removeEventListener(event, onInteraction, true)
    document.removeEventListener('visibilitychange', onReturn)
    targetWindow.removeEventListener('online', onReturn)
    targetWindow.removeEventListener('pageshow', onReturn)
  }
}
