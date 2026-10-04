import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Dancing_Script, Nunito } from 'next/font/google'
import { ServiceWorkerRegister } from '@/components/sw-register'
import './globals.css'

const nunito = Nunito({ subsets: ['latin', 'latin-ext'], variable: '--font-nunito' })
const dancing = Dancing_Script({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-dancing',
  weight: ['500', '700'],
})

export const metadata: Metadata = {
  title: 'SOapp',
  description: 'Sevgilim için hazırlanmış küçük bir doğum günü sürprizi.',
  applicationName: 'SOapp',
  appleWebApp: {
    capable: true,
    title: 'SOapp',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#1c1c1e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

const themeInitialization = `
  try {
    const savedTheme = localStorage.getItem('soapp-theme')
    const theme = savedTheme === 'dark' ||
      (savedTheme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'dark'
      : 'light'
    document.documentElement.dataset.theme = theme
  } catch {}
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className={`${nunito.variable} ${dancing.variable}`} suppressHydrationWarning>
      <head>
        <Script id="theme-initialization" strategy="beforeInteractive">
          {themeInitialization}
        </Script>
      </head>
      <body className="antialiased">
        {children}
        <ServiceWorkerRegister />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
