'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { C } from '@/components/ui'
import { isArenaEnabled } from '@/lib/arena-enabled'
import { isTodayHubEnabled } from '@/lib/today-hub-enabled'

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
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
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

// Dark-theme translation of components/ui.tsx's `glass` token, tuned for a
// nav that floats over arbitrary (sometimes bright) scrolling content rather
// than a card over fixed imagery — higher alpha + saturate() so it stays
// legible and doesn't look washed out. Deliberately NOT the shared `glass`
// export: that one is tuned for cards over imagery, not a floating bar.
const glassNav: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(58,50,39,.66), rgba(24,20,15,.80))',
  backdropFilter: 'blur(20px) saturate(140%)',
  WebkitBackdropFilter: 'blur(20px) saturate(140%)',
  border: '1px solid rgba(246,239,228,.12)',
  boxShadow: '0 12px 34px -12px rgba(0,0,0,.78), 0 2px 10px -4px rgba(0,0,0,.55), inset 0 1px 0 rgba(246,239,228,.08)',
}

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

  const active = (href: string) => (href === '/' ? path === '/' : path?.startsWith(href))
  const activeIndex = tabs.findIndex(t => active(t.href))

  // ─── sliding active-tab indicator — one shared node, measured against the
  // real DOM so it works for any tab count (4-6, toggled by feature flags)
  // and is correct under RTL by construction (physical left + translateX,
  // never mirrored by `direction` — see docs note in the PR). ────────────
  const pillRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null)
  const [skipTransition, setSkipTransition] = useState(true)

  const measure = useCallback(() => {
    const pill = pillRef.current
    const el = activeIndex >= 0 ? tabRefs.current[activeIndex] : null
    if (!pill || !el) { setInd(null); return }
    const p = pill.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const INSET = 4   // indicator sits 4px in from each edge of the tab
    setInd({ x: r.left - p.left + INSET, w: Math.max(0, r.width - INSET * 2) })
  }, [activeIndex])

  useEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (pillRef.current) ro.observe(pillRef.current)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, tabs.length, status])

  // First placement lands instantly (no slide-in from the edge); every
  // placement after that animates.
  useEffect(() => {
    if (!ind || !skipTransition) return
    const id = requestAnimationFrame(() => setSkipTransition(false))
    return () => cancelAnimationFrame(id)
  }, [ind, skipTransition])

  if (path?.startsWith('/login') || path?.startsWith('/signup') || path?.startsWith('/welcome') || path?.startsWith('/admin') || path?.startsWith('/assistant')) return null

  return (
    <nav style={{
      position: 'fixed', bottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', left: 0, right: 0,
      maxWidth: 480, margin: '0 auto', paddingInline: 12, boxSizing: 'border-box',
      zIndex: 40, pointerEvents: 'none',
    }}>
      <div ref={pillRef} className="glnav-pill" style={{
        pointerEvents: 'auto', position: 'relative', height: 62, borderRadius: 999,
        display: 'flex', alignItems: 'stretch', paddingInline: 6, overflow: 'visible',
        ...glassNav,
      }}>
        <span
          aria-hidden
          className={`glnav-ind${skipTransition ? ' is-init' : ''}`}
          style={ind
            ? { transform: `translateX(${ind.x}px)`, width: ind.w, opacity: 1 }
            : { transform: 'translateX(0px)', width: 0, opacity: 0 }}
        />
        {tabs.map((t, i) => {
          const on = active(t.href)
          return (
            <Link key={t.href} href={t.href} ref={el => { tabRefs.current[i] = el }} aria-current={on ? 'page' : undefined}
              className="glnav-tab"
              style={{
                flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative', zIndex: 1,
                textDecoration: 'none', color: on ? C.thi : C.tbody, transition: 'color .18s ease',
              }}>
              <span className="glnav-icon" style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon d={t.icon} />
                {t.href === '/me' && notifCount > 0 && (
                  <span dir="ltr" style={{
                    position: 'absolute', top: -4, insetInlineEnd: -7, minWidth: 15, height: 15, padding: '0 4px',
                    borderRadius: 999, background: C.gold, color: C.ink, fontSize: 8.5, fontWeight: 800, lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1.5px solid rgba(24,20,15,.92)', boxSizing: 'content-box',
                  }}>{notifCount > 9 ? '9+' : notifCount}</span>
                )}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: 'Vazirmatn, sans-serif', lineHeight: 1.35, whiteSpace: 'nowrap' }}>{t.label}</span>
            </Link>
          )
        })}
      </div>
      <style jsx global>{`
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .glnav-pill { background: rgba(24,20,15,.96); }
        }
        .glnav-ind {
          position: absolute; left: 0; top: 6; height: calc(100% - 12px);
          border-radius: 18px; background: linear-gradient(180deg, rgba(168,85,247,.30), rgba(168,85,247,.16));
          border: 1px solid rgba(168,85,247,.36); box-shadow: 0 0 20px -6px rgba(168,85,247,.55), inset 0 1px 0 rgba(246,239,228,.06);
          z-index: 0; pointer-events: none; will-change: transform, width;
          transition: transform 340ms cubic-bezier(.32,.72,0,1), width 340ms cubic-bezier(.32,.72,0,1), opacity 180ms ease;
        }
        .glnav-ind.is-init { transition: none; }
        .glnav-icon { transition: transform .12s ease; }
        .glnav-tab:active .glnav-icon { transform: scale(.92); }
        @media (prefers-reduced-motion: reduce) {
          .glnav-ind { transition: opacity 120ms ease; }
          .glnav-icon, .glnav-tab { transition: none; }
        }
      `}</style>
    </nav>
  )
}
