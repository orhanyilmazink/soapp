// Keep installed Apple apps, manifest consumers and browser icons in sync.
export const appIcons = [
  { src: '/icon-restored-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/icon-restored-512.png', sizes: '512x512', type: 'image/png' },
]

export const appleAppIcon = {
  // Use Apple's conventional filename and rev the URL whenever the artwork
  // changes; iOS otherwise keeps a stale home-screen icon very aggressively.
  url: '/apple-touch-icon.png?v=35',
  sizes: '180x180',
  type: 'image/png',
}
