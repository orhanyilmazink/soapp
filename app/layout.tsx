import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
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
  title: 'İyi ki Doğdun Sevgilim',
  description: 'Sevgilim için hazırlanmış küçük bir doğum günü sürprizi.',
  generator: 'v0.app',
  applicationName: 'İyi ki Doğdun',
  appleWebApp: {
    capable: true,
    title: 'İyi ki Doğdun',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icon-512.png',
    apple: '/icon-512.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f5f5f5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className={`${nunito.variable} ${dancing.variable}`}>
      <body className="antialiased">
        {children}
        <ServiceWorkerRegister />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
