import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SOapp',
    short_name: 'SOapp',
    description: 'Sevgilim için hazırlanmış küçük bir doğum günü sürprizi.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#1c1c1e',
    theme_color: '#1c1c1e',
    lang: 'tr',
    icons: [
      { src: '/icon-512-v3.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-v3.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
