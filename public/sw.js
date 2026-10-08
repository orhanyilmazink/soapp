const CACHE = 'soapp-v14'
const PRECACHE = ['/', '/icon-unified-192.png', '/icon-unified-512.png', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('soapp-') && k !== CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

function saveResponse(event, response) {
  if (!response.ok) return response
  const copy = response.clone()
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {})
  )
  return response
}

async function cachedResponse(request, navigation) {
  const cache = await caches.open(CACHE)
  return (await cache.match(request)) || (navigation && (await cache.match('/'))) || Response.error()
}

function networkFirst(event, navigation = false) {
  return fetch(event.request)
    .then((response) => saveResponse(event, response))
    .catch(() => cachedResponse(event.request, navigation))
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    request.headers.has('range') ||
    request.headers.has('RSC') ||
    url.searchParams.has('_rsc') ||
    url.pathname.startsWith('/api/') ||
    url.pathname === '/api' ||
    url.pathname === '/sw.js'
  ) {
    return
  }

  let response
  if (request.mode === 'navigate') {
    response = networkFirst(event, true)
  } else if (url.pathname.startsWith('/_next/static/')) {
    response = caches.open(CACHE).then(async (cache) =>
      (await cache.match(request)) || networkFirst(event)
    )
  } else if (
    !url.pathname.startsWith('/_next/') &&
    (/\.(?:png|jpe?g|gif|webp|avif|ico|svg|woff2?|ttf|otf|css|js)$/i.test(url.pathname) ||
      url.pathname === '/manifest.webmanifest')
  ) {
    response = networkFirst(event)
  } else {
    // Leave APIs, server components and other dynamic responses to the browser.
    return
  }

  event.respondWith(response)
  // Keep the fetch event alive until asynchronous cache writes can be scheduled.
  event.waitUntil(response.then(() => undefined).catch(() => {}))
})

self.addEventListener('push', (event) => {
  const payload = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(payload.title || 'SOapp', {
      body: payload.body || 'Buluşmana yaklaşıyorsun.',
      icon: '/icon-restored-192.png',
      badge: '/icon-restored-192.png',
      tag: payload.tag,
      data: { url: payload.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((client) => 'focus' in client)
      return existing ? existing.focus() : clients.openWindow(event.notification.data?.url || '/')
    })
  )
})
