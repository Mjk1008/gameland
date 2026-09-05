'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { isArenaEnabled } from '@/lib/arena-enabled'
import { isTodayHubEnabled } from '@/lib/today-hub-enabled'

const ACCENT = '#A855F7', MUT = '#6E6252', INK = '#14110D', LINE = '#322A1F', GOLD = '#F5A623'

const icons = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5" />,
  cup: <><path d="M6 9h12v3a6 6 0 0 1-12 0z" /><path d="M9 18h6M10 21h4" /><path d="M6 9H4a2 2 0 0 1 0-4h2M18 9h2a2 2 0 0 0 0-4h-2" /></>,
  rank: <><path d="M4 20h16" /><rect x="5" y="11" width="4" height="8" rx="1" /><rect x="10" y="6" width="4" height="13" rx="1" /><rect x="15" y="14" width="4" height="5" rx="1" /></>,
  users: <><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" /></>,
  arena: <><circle cx="8" cy="10" r="2.5" /><circle cx="16" cy="10" r="2.5" /><path d="M5 19a7 7 0 0 1 14 0" /><path d="M12 3v3M9.5 5.5h5" /></>,
  today: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  me: <><circle cx="12" cy="9" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  login: <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h12" /></>,
}
function Icon({ d }: { d: React.ReactNode }) {
  return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
}

const ARENA_ON = isArenaEnabled()
const TODAY_ON = isTodayHubEnabled()

// «امروز» replaces «دعوت» whenever its own flag is on, independent of
// Arena's — the two occupy what were originally different tab slots, so
// both can be simultaneously on (a 6th tab; the flex:1 layout tolerates it).
const TABS = [
  { href: '/', label: 'خانه', icon: icons.home },
  { href: '/competitions', label: 'مسابقات', icon: icons.cup },
  { href: '/leaderboard', label: 'رنکینگ', icon: icons.rank },
  ...(ARENA_ON ? [{ href: '/arena', label: 'میدون', icon: icons.arena }] : []),
  ...(TODAY_ON
    ? [{ href: '/today', label: 'امروز', icon: icons.today }]
    : ARENA_ON ? [] : [{ href: '/invite', label: 'دعوت', icon: icons.gift }]),
]

export default function BottomNav() {
  const path = usePathname()

  // catch ?ref=<tag> and ?code=<promo> from links anywhere in the app
  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search)
      const ref = qs.get('ref')
      if (ref) localStorage.setItem('gl_ref', ref)
      const code = qs.get('code')
      if (code) localStorage.setItem('gl_code', code)
    } catch {}
  }, [path])
  const { status } = useSession()
  const meTab = status === 'authenticated'
    ? { href: '/me', label: 'من', icon: icons.me }
    : { href: '/login', label: 'ورود', icon: icons.login }
  const tabs = [...TABS, meTab]

  const [notifCount, setNotifCount] = useState(0)
  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    const tick = () => fetch('/api/notif-count').then(r => r.json()).then(j => { if (!cancelled) setNotifCount(j.count || 0) }).catch(() => {})
    tick()
    const id = setInterval(tick, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [status, path])

  if (path?.startsWith('/login') || path?.startsWith('/signup') || path?.startsWith('/welcome') || path?.startsWith('/admin') || path?.startsWith('/assistant')) return null

  const active = (href: string) => (href === '/' ? path === '/' : path?.startsWith(href))

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      height: 'calc(66px + env(safe-area-inset-bottom, 0px))',
      display: 'flex', alignItems: 'stretch', justifyContent: 'space-around',
      background: 'rgba(20,17,13,.96)', borderTop: `1px solid ${LINE}`,
      backdropFilter: 'blur(14px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      maxWidth: 480, margin: '0 auto',
    }}>
      {tabs.map(t => {
        const on = active(t.href)
        return (
          <Link key={t.href} href={t.href} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 5, textDecoration: 'none', color: on ? ACCENT : MUT, transition: 'color .15s', position: 'relative',
          }}>
            <Icon d={t.icon} />
            <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: 'Vazirmatn, sans-serif' }}>{t.label}</span>
            {t.href === '/me' && notifCount > 0 && (
              <span dir="ltr" style={{ position: 'absolute', top: 6, right: 'calc(50% - 22px)', minWidth: 16, height: 16, padding: '0 5px', borderRadius: 999, background: GOLD, color: INK, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{notifCount > 9 ? '9+' : notifCount}</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
