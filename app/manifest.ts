import type { MetadataRoute } from 'next'
import { appIcons } from '@/lib/app-icons'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SOapp',
    short_name: 'SOapp',
    description: 'Sevgilim için hazırlanmış küçük bir doğum günü sürprizi.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#190d15',
    theme_color: '#190d15',
    lang: 'tr',
    icons: appIcons,
  }
}
