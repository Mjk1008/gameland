'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { isArenaEnabled } from '@/lib/arena-enabled'
import { isTodayHubEnabled } from '@/lib/today-hub-enabled'

const ACCENT = '#A855F7', MUT = '#A89A88', INK = '#14110D', GOLD = '#F5A623'

const icons = {
  home: <><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" /></>,
  cup: <><path d="M7 4h10v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5V4Z" /><path d="M7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3" /><path d="M12 12v3M9 20h6M10 20v-2h4v2" /></>,
  rank: <><rect x="4" y="13" width="4" height="7" rx="1" /><rect x="10" y="8" width="4" height="12" rx="1" /><rect x="16" y="15" width="4" height="5" rx="1" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" /></>,
  arena: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  today: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  me: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></>,
  login: <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h12" /></>,
}
function Icon({ d, style }: { d: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ transition: 'transform .16s cubic-bezier(.2,.8,.2,1.5)', ...style }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
    </div>
  )
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

// Floating glass pill with a liquid highlight that slides + squishes to the
// active tab (measured off the real DOM, so it tracks whatever width/order
// the tabs render with — no hardcoded positions).
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

  const hidden = path?.startsWith('/login') || path?.startsWith('/signup') || path?.startsWith('/welcome') || path?.startsWith('/admin') || path?.startsWith('/assistant')

  const active = (href: string) => (href === '/' ? path === '/' : path?.startsWith(href))
  const activeIndex = tabs.findIndex(t => active(t.href))

  const barRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: 0, width: 0 })
  const [squish, setSquish] = useState(0)
  const prevIndex = useRef(activeIndex)

  function measure(i: number) {
    if (i < 0) return
    const el = barRef.current?.querySelectorAll('a')[i] as HTMLElement | undefined
    if (!el) return
    const next = { left: el.offsetLeft, width: el.offsetWidth }
    setPos(p => (p.left === next.left && p.width === next.width) ? p : next)
  }

  useEffect(() => { measure(activeIndex) }, [activeIndex, tabs.length])
  useEffect(() => {
    const onResize = () => measure(activeIndex)
    window.addEventListener('resize', onResize)
    const t = setTimeout(() => measure(activeIndex), 400)   // fonts settling late
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t) }
  }, [activeIndex])

  // liquid squish toward whichever direction the active tab moved
  useEffect(() => {
    const prev = prevIndex.current
    prevIndex.current = activeIndex
    if (prev === activeIndex || prev < 0 || activeIndex < 0) return
    const dir = activeIndex > prev ? 1 : -1
    setSquish(dir)
    const t = setTimeout(() => setSquish(0), 150)
    return () => clearTimeout(t)
  }, [activeIndex])

  if (hidden) return null

  const scaleX = squish ? 1.3 : 1
  const scaleY = squish ? 0.86 : 1
  const skew = squish ? squish * -9 : 0
  const showPill = activeIndex >= 0 && pos.width > 0
  const pillShadow = squish
    ? `inset 0 1px 0 rgba(255,255,255,.5), 0 0 0 1px ${ACCENT}80, 0 0 26px ${ACCENT}cc`
    : `inset 0 1px 0 rgba(255,255,255,.35), 0 0 14px ${ACCENT}80`

  return (
    <nav style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40, maxWidth: 480, margin: '0 auto', pointerEvents: 'none' }}>
      <div ref={barRef} style={{
        pointerEvents: 'auto', position: 'relative', overflow: 'hidden',
        margin: `0 16px calc(16px + env(safe-area-inset-bottom, 0px))`,
        height: 60, borderRadius: 30, display: 'flex', alignItems: 'center', padding: '0 7px',
        background: 'linear-gradient(180deg, rgba(64,55,44,.48), rgba(23,20,15,.66))',
        backdropFilter: 'blur(30px) saturate(190%)', WebkitBackdropFilter: 'blur(30px) saturate(190%)',
        border: '1px solid rgba(246,239,228,.09)',
        boxShadow: 'inset 0 1px 0 rgba(246,239,228,.22), inset 0 -1px 0 rgba(0,0,0,.5), 0 18px 44px rgba(0,0,0,.6)',
      }}>
        {showPill && (
          <div style={{
            position: 'absolute', left: 0, top: -30, width: 120, height: 120, borderRadius: '50%',
            background: `radial-gradient(circle, ${ACCENT}4d 0%, rgba(0,0,0,0) 70%)`, pointerEvents: 'none',
            transform: `translateX(${pos.left + pos.width / 2 - 60}px)`, transition: 'transform .26s cubic-bezier(.2,.85,.2,1.2)',
          }} />
        )}
        {showPill && (
          <div style={{
            position: 'absolute', left: 0, top: 6, bottom: 6, width: pos.width, borderRadius: 24,
            background: `linear-gradient(180deg, ${ACCENT}7a, ${ACCENT}1f)`, border: `1px solid ${ACCENT}b3`,
            boxShadow: pillShadow, transform: `translateX(${pos.left}px) scale(${scaleX},${scaleY}) skewX(${skew}deg)`,
            transition: 'transform .19s cubic-bezier(.2,.85,.2,1.35), width .19s cubic-bezier(.2,.85,.2,1.35), box-shadow .12s linear',
          }} />
        )}
        {tabs.map((t, i) => {
          const on = i === activeIndex
          return (
            <Link key={t.href} href={t.href} style={{
              position: 'relative', zIndex: 1, flex: 1, height: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
              textDecoration: 'none', color: on ? '#FFFFFF' : MUT, fontWeight: on ? 600 : 400,
              fontFamily: 'Vazirmatn, sans-serif',
            }}>
              <Icon d={t.icon} style={{ transform: on ? `translateY(-1px) scale(${squish && on ? 1.18 : 1.08})` : 'translateY(0) scale(1)' }} />
              <span style={{ fontSize: 10.5, letterSpacing: '-.1px' }}>{t.label}</span>
              {t.href === '/me' && notifCount > 0 && (
                <span dir="ltr" style={{ position: 'absolute', top: 2, right: 'calc(50% - 22px)', minWidth: 16, height: 16, padding: '0 5px', borderRadius: 999, background: GOLD, color: INK, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{notifCount > 9 ? '9+' : notifCount}</span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
