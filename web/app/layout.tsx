import './globals.css'
import type { Metadata, Viewport } from 'next'
import SwRegister from './sw-register'
import BottomNav from '@/components/BottomNav'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'Gameland — گیم‌لند',
  description: 'رنکینگ ملی ای‌اسپورت ایران · مسابقات حرفه‌ای · پروفایل گیمرها',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'گیم‌لند' },
  other: { enamad: '37786331' },   // eNamad ownership verification
}

export const viewport: Viewport = {
  themeColor: '#14110D',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body style={{ background: '#14110D', minHeight: '100vh' }}>
        <Providers>
          <main style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 88, minHeight: '100vh' }}>
            {children}
          </main>
          <BottomNav />
        </Providers>
        <SwRegister />
      </body>
    </html>
  )
}
