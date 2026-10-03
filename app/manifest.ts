import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'İyi ki Doğdun Sevgilim',
    short_name: 'İyi ki Doğdun',
    description: 'Sevgilim için hazırlanmış küçük bir doğum günü sürprizi.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#1c1c1e',
    theme_color: '#1c1c1e',
    lang: 'tr',
    icons: [
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
