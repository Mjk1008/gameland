// Gameland "Broadcast" UI kit — shared primitives + tokens.
// Source of truth: docs/23-design-direction.md + design handoff.
import React from 'react'
import Link from 'next/link'

// ── tokens ──
export const C = {
  ink: '#14110D', sf1: '#1E1A14', sf2: '#262019', line: '#322A1F', line2: '#40362A',
  accent: '#FF6A1A', accentStrong: '#E85D0A', accentSoft: 'rgba(255,106,26,.14)',
  gold: '#F5A623', goldSoft: 'rgba(245,166,35,.12)',
  thi: '#F6EFE4', tbody: '#A89A88', tmut: '#6E6252',
  win: '#3FBE86', winSoft: 'rgba(63,190,134,.14)',
  live: '#FF5A4E', liveSoft: 'rgba(255,90,78,.14)',
  info: '#C6A6FF', infoSoft: 'rgba(198,166,255,.14)',
}
export const DISP = "'Saira Condensed','Rajdhani',sans-serif"
export const LATIN = "'Inter',-apple-system,sans-serif"

export const DISC_DOT: Record<string, string> = {
  fc26: '#4AA3FF', pes21: '#3FBE86', efootball: '#FF6A1A', ufc6: '#FF5A4E', nba2k26: '#F5A623',
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

// ── wordmark + ascending-bars monogram ──
export function Wordmark({ size = 22, tagline = false }: { size?: number; tagline?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <div style={{ width: size * 1.7, height: size * 1.7, borderRadius: 11, background: C.sf1, border: `1px solid ${C.line2}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3, padding: `${size * 0.42}px ${size * 0.38}px` }}>
        <span style={{ width: 4, height: size * 0.32, background: C.tmut, borderRadius: 1 }} />
        <span style={{ width: 4, height: size * 0.56, background: C.tbody, borderRadius: 1 }} />
        <span style={{ width: 4, height: size * 0.88, background: C.accent, borderRadius: 1 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: size, letterSpacing: '.14em', color: C.thi, lineHeight: 1 }}>GAMELAND</span>
        {tagline && <span style={{ fontSize: 11.5, color: C.tmut }}>خانهٔ گیمرهای ایران</span>}
      </div>
    </div>
  )
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
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: C.thi, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 8, padding: '6px 11px' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: DISC_DOT[disc] ?? C.tmut }} />{name}
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
    <div style={{ position: 'sticky', top: 0, zIndex: 6, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(20,17,13,.92)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${C.line}` }}>
      <Link href={href} style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 11, background: C.sf1, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.tbody }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
      </Link>
      <span style={{ fontSize: 15, fontWeight: 700, color: C.thi }}>{title}</span>
    </div>
  )
}
