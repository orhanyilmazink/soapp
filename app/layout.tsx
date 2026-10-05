import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Dancing_Script, Nunito } from 'next/font/google'
import { ServiceWorkerRegister } from '@/components/sw-register'
import { AppUpdates } from '@/components/app-updates'
import { PinchZoomLock } from '@/components/pinch-zoom-lock'
import { LanguageProvider } from '@/lib/language'
import { appIcons, appleAppIcon } from '@/lib/app-icons'
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
    icon: appIcons.map(({ src, ...icon }) => ({ url: src, ...icon })),
    apple: [appleAppIcon],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fff4f8' },
    { media: '(prefers-color-scheme: dark)', color: '#190d15' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute('content', theme === 'dark' ? '#190d15' : '#fff4f8'))
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
        {/* Next emits the generic capability tag; iOS also needs its legacy tag
            to consistently apply the translucent status-bar configuration. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* Must run during HTML parsing, before the first themed paint.
            A queued Next Script can otherwise leave the SSR login in light mode. */}
        <script id="theme-initialization" dangerouslySetInnerHTML={{ __html: themeInitialization }} />
      </head>
      <body className="antialiased">
        <PinchZoomLock />
        <LanguageProvider>{children}</LanguageProvider>
        <ServiceWorkerRegister />
        <AppUpdates />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
