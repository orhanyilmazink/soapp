// Modern Safari reads Home Screen artwork from the web app manifest when no
// apple-touch-icon is declared. Keep these icons opaque, square and full-bleed.
export const appIcons = [
  { src: '/icon-unified-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icon-unified-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
] as const
