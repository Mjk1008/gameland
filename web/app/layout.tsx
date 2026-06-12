import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Gameland — گیم‌لند',
  description: 'خانهٔ مسابقات و رنکینگ گیمرهای ایران',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="font-sans">
        <header className="border-b divider sticky top-0 z-10 backdrop-blur bg-bg/80">
          <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="inline-block w-8 h-8 rounded-lg bg-accent/20 ring-1 ring-accent/40 grid place-items-center text-accent font-bold">G</span>
              <div>
                <div className="text-lg font-bold leading-none">گیم‌لند</div>
                <div className="text-xs text-muted leading-none mt-1">Gameland · آمل</div>
              </div>
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/leaderboard" className="hover:text-accent">رنکینگ</Link>
              <Link href="/competitions" className="hover:text-accent">مسابقات</Link>
              <Link href="/players" className="hover:text-accent">گیمرها</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-5 py-8">{children}</main>
        <footer className="max-w-6xl mx-auto px-5 py-10 mt-10 border-t divider text-xs text-muted">
          گیم‌لند · برگزارکنندهٔ مسابقات در ایران · آمل، مازندران
        </footer>
      </body>
    </html>
  )
}
