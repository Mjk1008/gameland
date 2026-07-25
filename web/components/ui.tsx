// Gameland "Broadcast" UI kit — shared primitives + tokens.
// Source of truth: docs/23-design-direction.md + design handoff.
import React from 'react'
import Link from 'next/link'

// ── tokens ──
export const C = {
  ink: '#14110D', sf1: '#1E1A14', sf2: '#262019', line: '#322A1F', line2: '#40362A',
  accent: '#A855F7', accentStrong: '#9333EA', accentSoft: 'rgba(168,85,247,.14)',
  gold: '#F5A623', goldSoft: 'rgba(245,166,35,.12)',
  thi: '#F6EFE4', tbody: '#A89A88', tmut: '#6E6252',
  win: '#3FBE86', winSoft: 'rgba(63,190,134,.14)',
  live: '#FF5A4E', liveSoft: 'rgba(255,90,78,.14)',
  info: '#C6A6FF', infoSoft: 'rgba(198,166,255,.14)',
}
export const DISP = "'Saira Condensed','Rajdhani',sans-serif"
export const LATIN = "'Inter',-apple-system,sans-serif"

export const DISC_DOT: Record<string, string> = {
  fc26: '#22C55E', pes21: '#3B82F6', efootball: '#06B6D4', ufc6: '#EF4444', nba2k26: '#F97316',
}
const GAME_MARK: Record<string, string> = {
  fc26: 'FC', pes21: 'PES', efootball: 'eF', ufc6: 'UFC', nba2k26: '2K',
}
// real game marks/covers bundled in /public/games
export const GAME_LOGO: Record<string, string> = {
  fc26: '/games/fc26-logo.png', pes21: '/games/pes21-logo.png', efootball: '/games/efootball-logo.png',
  ufc6: '/games/ufc6-logo.png', nba2k26: '/games/nba2k26-logo.png',
}
export const GAME_COVER: Record<string, string> = {
  fc26: '/games/fc26-cover.jpg', pes21: '/games/pes21-cover.jpg', efootball: '/games/efootball-cover.jpg',
  ufc6: '/games/ufc6-cover.jpg', nba2k26: '/games/nba2k26-cover.jpg',
}
export const GAME_POSTER: Record<string, string> = {
  fc26: '/games/fc26-poster.png', pes21: '/games/pes21-poster.png', efootball: '/games/efootball-poster.png',
  ufc6: '/games/ufc6-poster.png', nba2k26: '/games/nba2k26-poster.png',
}
// 16:9 subject-framed banner crops (from the box-arts) — for discipline cards.
export const GAME_BANNER: Record<string, string> = {
  fc26: '/games/fc26-banner.jpg', pes21: '/games/pes21-banner.jpg', efootball: '/games/efootball-banner.jpg',
  ufc6: '/games/ufc6-banner.jpg', nba2k26: '/games/nba2k26-banner.jpg',
}

// Game logo tile — the real game logo on a clean light tile (so dark logos
// stay visible on the dark app). Falls back to a colored monogram if unknown.
export function GameBadge({ disc, size = 30 }: { disc: string; size?: number }) {
  const logo = GAME_LOGO[disc]
  const r = Math.round(size * 0.26)
  if (logo) {
    return (
      <span aria-hidden style={{
        width: size, height: size, borderRadius: r, flexShrink: 0, background: '#fff',
        border: `1px solid ${C.line}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        <img src={logo} alt="" style={{ width: '82%', height: '82%', objectFit: 'contain' }} />
      </span>
    )
  }
  const color = DISC_DOT[disc] ?? '#6E6252'
  const mark = GAME_MARK[disc] ?? '?'
  return (
    <span aria-hidden style={{
      width: size, height: size, borderRadius: r, flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(150deg, ${color}, ${color}bb)`,
    }}>
      <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: mark.length >= 3 ? size * 0.32 : size * 0.42, lineHeight: 1, color: '#0B0A08' }}>{mark}</span>
    </span>
  )
}

// status → {color, soft, label}
const STATUS: Record<string, { c: string; s: string; label: string }> = {
  open: { c: C.win, s: C.winSoft, label: 'ثبت‌نام باز' },
  live: { c: C.live, s: C.liveSoft, label: 'زنده' },
  soon: { c: C.gold, s: C.goldSoft, label: 'به‌زودی' },
  done: { c: C.info, s: C.infoSoft, label: 'پایان‌یافته' },
}

// ── numeral (broadcast, tabular, LTR) ──
export function Num({ children, size = 22, color = C.thi, weight = 800 }: { children: React.ReactNode; size?: number; color?: string; weight?: number }) {
  return <span className="gl-num" style={{ fontWeight: weight, fontSize: size, lineHeight: 1, color }}>{children}</span>
}

// ── uppercase Latin label ──
export function Label({ children, color = C.tmut, size = 11 }: { children: React.ReactNode; color?: string; size?: number }) {
  return <span className="gl-label" style={{ fontSize: size, color }}>{children}</span>
}

// ── wordmark = real logo mark + GAMELAND ──
// stacked=true → big logo centered above the name (brand lockup, e.g. home hero).
export function Wordmark({ size = 22, tagline = false, stacked = false }: { size?: number; tagline?: boolean; stacked?: boolean }) {
  if (stacked) {
    const mark = Math.round(size * 4)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <img src="/logo.png" alt="گیم‌لند" width={mark} height={mark} style={{ display: 'block', objectFit: 'contain' }} />
        <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: size, letterSpacing: '.16em', color: C.thi, lineHeight: 1 }}>GAMELAND</span>
        {tagline && <span style={{ fontSize: 11.5, color: C.tmut }}>خانهٔ گیمرهای ایران</span>}
      </div>
    )
  }
  const mark = Math.round(size * 2)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <img src="/logo.png" alt="گیم‌لند" width={mark} height={mark} style={{ display: 'block', objectFit: 'contain', flexShrink: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: size, letterSpacing: '.14em', color: C.thi, lineHeight: 1 }}>GAMELAND</span>
        {tagline && <span style={{ fontSize: 11.5, color: C.tmut }}>خانهٔ گیمرهای ایران</span>}
      </div>
    </div>
  )
}

// ── gamer avatar badge — uploaded photo, else ranking-card face, else initial ──
export function GamerAvatar({ uid, tag, hasPhoto, card, size = 44, ring }: {
  uid: string; tag: string; hasPhoto?: boolean; card?: string | null; size?: number; ring?: string
}) {
  const radius = Math.round(size * 0.28)
  return (
    <span style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', background: C.line, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${ring ?? C.line2}` }}>
      {hasPhoto
        ? <img src={`/api/avatar/${uid}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : card
        ? <img src={card} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 18%' }} />
        : <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: size * 0.42, color: ring ?? C.thi }}>{tag[0]?.toUpperCase()}</span>}
    </span>
  )
}

// ── logo mark only (square) ──
export function LogoMark({ size = 40 }: { size?: number }) {
  return <img src="/logo.png" alt="گیم‌لند" width={size} height={size} style={{ display: 'block', objectFit: 'contain' }} />
}

// ── card ──
export function Card({ children, style, onClick, href }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void; href?: string }) {
  const s: React.CSSProperties = { background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 15, ...style }
  if (href) return <Link href={href} style={{ all: 'unset', cursor: 'pointer', display: 'block', ...s }}>{children}</Link>
  return <div style={s} onClick={onClick}>{children}</div>
}

// ── buttons ──
type BtnKind = 'primary' | 'secondary' | 'prestige'
const BTN: Record<BtnKind, React.CSSProperties> = {
  primary:   { background: C.accent, color: C.ink, fontWeight: 700, border: 'none' },
  secondary: { background: 'transparent', color: C.thi, fontWeight: 600, border: `1px solid ${C.line2}` },
  prestige:  { background: C.goldSoft, color: C.gold, fontWeight: 700, border: `1px solid ${C.gold}` },
}
export function Button({ children, kind = 'primary', href, onClick, type, disabled, style }: {
  children: React.ReactNode; kind?: BtnKind; href?: string; onClick?: () => void
  type?: 'button' | 'submit'; disabled?: boolean; style?: React.CSSProperties
}) {
  const s: React.CSSProperties = {
    all: 'unset', boxSizing: 'border-box', textAlign: 'center', width: '100%', height: 44, lineHeight: '44px',
    borderRadius: 11, fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
    fontFamily: 'var(--font-fa)', ...BTN[kind], ...style,
  }
  if (href && !disabled) return <Link href={href} style={{ ...s, display: 'block' }}>{children}</Link>
  return <button type={type ?? 'button'} onClick={onClick} disabled={disabled} style={s}>{children}</button>
}

// ── glassmorphism surface — translucent + blur, for cards/panels over imagery.
// Pairs with the warm-dark Broadcast palette; a subtle top sheen sells the glass.
export const glass: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(56,48,38,.55), rgba(30,26,20,.62))',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(246,239,228,.10)',
  boxShadow: '0 8px 30px -14px rgba(0,0,0,.7), inset 0 1px 0 rgba(246,239,228,.06)',
}

// ── shared form input style (16px → never triggers iOS focus-zoom; 46px touch) ──
export const inp: React.CSSProperties = {
  background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11,
  padding: '12px 14px', minHeight: 46, color: C.thi, fontSize: 16,
  outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-fa)',
}

// ── labelled field wrapper (visible label above the control) ──
export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12.5, color: C.tmut, fontWeight: 600 }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11.5, color: C.tmut }}>{hint}</span>}
    </label>
  )
}

// ── status chip ──
export function StatusChip({ status }: { status: string }) {
  const m = STATUS[status] ?? STATUS.soon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: m.c, background: m.s, borderRadius: 999, padding: '6px 12px' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.c }} />{m.label}
    </span>
  )
}

// ── discipline chip + dot ──
export function DiscChip({ disc, name }: { disc: string; name: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: C.thi, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 9, padding: '5px 10px 5px 6px' }}>
      <GameBadge disc={disc} size={22} />{name}
    </span>
  )
}

// ── section header (numbered/eyebrow optional) ──
export function SectionTitle({ children, en }: { children: React.ReactNode; en?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 19, fontWeight: 700, color: C.thi }}>{children}</span>
      {en && <Label>{en}</Label>}
    </div>
  )
}

// ── empty state (ascending-bars motif) ──
export function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '32px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 40 }}>
        <span style={{ width: 8, height: 14, background: C.line, borderRadius: 2 }} />
        <span style={{ width: 8, height: 22, background: C.line2, borderRadius: 2 }} />
        <span style={{ width: 8, height: 32, background: C.tmut, borderRadius: 2 }} />
        <span style={{ width: 8, height: 40, background: C.accent, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 13, color: C.tbody, textAlign: 'center' }}>{text}</span>
    </div>
  )
}

// ── sticky back header for sub-screens ──
export function BackHeader({ title, href }: { title: string; href: string }) {
  return (
    <div style={{ position: 'sticky', top: 'env(safe-area-inset-top, 0px)', zIndex: 6, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(20,17,13,.92)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${C.line}` }}>
      <Link href={href} style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 11, background: C.sf1, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.tbody }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
      </Link>
      <span style={{ fontSize: 15, fontWeight: 700, color: C.thi }}>{title}</span>
    </div>
  )
}
