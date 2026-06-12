'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  {
    href: '/',
    label: 'خانه',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/>
      </svg>
    ),
  },
  {
    href: '/leaderboard',
    label: 'رنکینگ',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h16"/><rect x="5" y="11" width="4" height="8" rx="1"/><rect x="10" y="6" width="4" height="13" rx="1"/><rect x="15" y="14" width="4" height="5" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/competitions',
    label: 'مسابقات',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9h12v3a6 6 0 0 1-12 0z"/><path d="M9 18h6M10 21h4"/><path d="M6 9H4a2 2 0 0 1 0-4h2M18 9h2a2 2 0 0 0 0-4h-2"/>
      </svg>
    ),
  },
  {
    href: '/players',
    label: 'گیمرها',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const path = usePathname()
  const active = (href: string) =>
    href === '/' ? path === '/' : path.startsWith(href)

  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        height: 68,
        display: 'flex', alignItems: 'stretch', justifyContent: 'space-around',
        background: 'rgba(11,15,20,.96)',
        borderTop: '1px solid #1e293b',
        backdropFilter: 'blur(14px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {TABS.map((t) => {
        const on = active(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 4, textDecoration: 'none',
              color: on ? '#22d3ee' : '#64748b',
              transition: 'color .15s',
            }}
          >
            {t.icon}
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Vazirmatn, sans-serif' }}>
              {t.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
