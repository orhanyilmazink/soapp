// Keep installed Apple apps, manifest consumers and browser icons in sync.
export const appIcons = [
  { src: '/icon-restored-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/icon-restored-512.png', sizes: '512x512', type: 'image/png' },
]

export const appleAppIcon = {
  // Safari's documented site-wide Web Clip path. Keep this query-free so iOS
  // can also discover it directly from the website root.
  url: '/apple-touch-icon.png',
  sizes: '180x180',
  type: 'image/png',
}
