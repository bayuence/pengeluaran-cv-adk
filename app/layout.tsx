import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geist = Geist({ subsets: ['latin'] });
const geistMono = Geist_Mono({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CV Akbar Dharma Karya - Input Pengeluaran Proyek',
  description: 'Aplikasi pengelolaan pengeluaran proyek CV Akbar Dharma Karya dengan offline support',
  generator: 'v0.app',
  manifest: '/manifest.json',
  keywords: ['expense', 'proyek', 'konstruksi', 'pengeluaran', 'pwa', 'CV Akbar Dharma Karya'],
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'CV Akbar Dharma Karya - Input Pengeluaran Proyek',
    description: 'Aplikasi pengelolaan pengeluaran proyek CV Akbar Dharma Karya dengan offline support',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1a1a1a',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Pengeluaran ADK" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${geist.className} antialiased bg-background text-foreground`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
