'use client'
import Link from 'next/link'
import { C, DISP, Button, GamerAvatar } from '@/components/ui'
import type { HeroState } from '@/lib/today-snapshot'

// The 6 states from docs/36's brief, reconciled with the mockup's drawn
// frames — each state has exactly one CTA (or none), never two competing
// buttons. Tapping the card (where relevant) opens the match-detail sheet.
export default function HeroCard({ hero, onOpenMatch, onAction, busy }: {
  hero: HeroState
  onOpenMatch: (matchId: string) => void
  onAction: (matchId: string, action: 'here' | 'ready' | 'ref') => void
  busy: boolean
}) {
  if (hero.kind === 'none') {
    return (
      <div style={{ borderRadius: 16, background: C.sf1, border: `1px solid ${C.line}`, padding: 15, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, background: C.sf2, border: `1px solid ${C.line}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.tmut} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l2.5 2.5" /></svg>
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: C.thi }}>بازیِ فعالی نداری</span>
          <span style={{ fontSize: 12, color: C.tmut }}>فیدِ زنده و نبضِ استان‌ها پایین‌تره</span>
        </div>
      </div>
    )
  }

  if (hero.kind === 'waiting') {
    return (
      <div style={{ borderRadius: 16, background: C.sf1, border: `1px solid ${C.line}`, padding: 15, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: C.tmut }}>منتظرم</span>
          <span style={{ fontSize: 11.5, color: C.tmut }}>{hero.roundLabel}</span>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.thi }}>حریفت هنوز مشخص نشده</span>
      </div>
    )
  }

  if (hero.kind === 'ready') {
    return (
      <div style={{ borderRadius: 16, background: `linear-gradient(165deg, ${C.goldSoft}, ${C.sf1} 60%)`, border: `1px solid ${C.gold}`, padding: 15, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: C.gold }}>آماده‌ام — پله‌ی {hero.step} از ۲</span>
          <span style={{ fontSize: 11.5, color: C.tbody }}>{hero.roundLabel}</span>
        </div>
        <span onClick={() => onOpenMatch(hero.matchId)} style={{ fontSize: 15, fontWeight: 700, color: C.thi, cursor: 'pointer' }}>نوبتت نزدیکه — حریفت حاضر شده</span>
        {hero.opponent && (
          <div onClick={() => onOpenMatch(hero.matchId)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <GamerAvatar uid={hero.opponent.uid} tag={hero.opponent.tag} hasPhoto={hero.opponent.hasPhoto} size={40} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: C.thi }}>{hero.opponent.name}</span>
              <span dir="ltr" style={{ fontSize: 10.5, color: C.tmut, fontFamily: DISP, letterSpacing: '.08em' }}>@{hero.opponent.tag}{hero.station ? ` · ایستگاه ${hero.station}` : ''}</span>
            </div>
          </div>
        )}
        <Button kind="prestige" disabled={busy} onClick={() => onAction(hero.matchId, hero.step === 1 ? 'here' : 'ready')}>
          {hero.step === 1 ? 'حاضرم' : 'آماده‌ام'}
        </Button>
      </div>
    )
  }

  if (hero.kind === 'playing') {
    return (
      <div style={{ borderRadius: 16, background: `linear-gradient(165deg, ${C.liveSoft}, ${C.sf1} 62%)`, border: `1px solid ${C.live}`, padding: 15, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, color: C.live }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.live, animation: 'todayLivePulse 1.4s ease-in-out infinite' }} />درحالِ بازی
          </span>
          <span style={{ fontSize: 11.5, color: C.tbody }}>{hero.roundLabel}</span>
        </div>
        <div onClick={() => onOpenMatch(hero.matchId)} style={{ display: 'flex', alignItems: 'baseline', gap: 10, cursor: 'pointer' }}>
          {hero.score && <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 30, color: C.thi, lineHeight: 1 }}>{hero.score}</span>}
          {hero.opponent && <span style={{ fontSize: 13, color: C.tbody }}>مقابلِ {hero.opponent.name}{hero.station ? ` · ایستگاه ${hero.station}` : ''}</span>}
        </div>
        <Button kind="secondary" disabled={busy} onClick={() => onAction(hero.matchId, 'ref')}>درخواستِ داور</Button>
        <style>{'@keyframes todayLivePulse { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: .45; transform: scale(.82) } }'}</style>
      </div>
    )
  }

  if (hero.kind === 'advanced') {
    return (
      <div style={{ borderRadius: 16, background: `linear-gradient(165deg, ${C.gold}33, ${C.sf1} 62%)`, border: `1px solid ${C.gold}`, padding: 15, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: C.gold }}>صعود کردم</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          {hero.score && <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 34, color: C.thi, lineHeight: 1 }}>{hero.score}</span>}
          <span style={{ fontSize: 15, fontWeight: 700, color: C.thi }}>بردم — صعود کردم</span>
        </div>
        <Link href={`/competitions/${hero.compId}/bracket`} style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: C.accent }}>دیدنِ براکتِ کامل ›</Link>
      </div>
    )
  }

  // eliminated
  return (
    <div style={{ borderRadius: 16, background: C.sf1, border: `1px solid ${C.line2}`, padding: 15, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 12.5, fontWeight: 800, color: C.tbody }}>باختم · حذف شدم</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        {hero.score && <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 34, color: C.tbody, lineHeight: 1 }}>{hero.score}</span>}
        {hero.opponent && <span style={{ fontSize: 15, fontWeight: 700, color: C.thi }}>بازی به {hero.opponent.name} رسید</span>}
      </div>
      <Button href={`/competitions/${hero.compId}/bracket`} kind="secondary">دیدنِ براکتِ کامل</Button>
    </div>
  )
}
