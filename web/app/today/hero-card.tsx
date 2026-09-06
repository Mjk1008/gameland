import { C, DISP, GamerAvatar } from '@/components/ui'
import type { HeroState } from '@/lib/today-snapshot'

// Read-only, informational only — no check-in CTA (docs/37 §10.1: player
// check-in removed entirely, "به درد نمی‌خوره"). Each state is just a
// status card; the «مسیرِ من» button lives beside this in client.tsx.
// Only ever called for these three (client.tsx's §10.1 visibility table
// keeps 'none' and 'eliminated' out — eliminated gets «مسیرِ من» alone,
// with no "next match" card since there isn't one).
type ActiveHero = Extract<HeroState, { kind: 'waiting' | 'playing' | 'advanced' }>

export default function HeroCard({ hero }: { hero: ActiveHero }) {
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

  if (hero.kind === 'playing') {
    return (
      <div style={{ borderRadius: 16, background: `linear-gradient(165deg, ${C.liveSoft}, ${C.sf1} 62%)`, border: `1px solid ${C.live}`, padding: 15, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, color: C.live }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.live, animation: 'todayLivePulse 1.4s ease-in-out infinite' }} />بازیِ فعلیت
          </span>
          <span style={{ fontSize: 11.5, color: C.tbody }}>{hero.roundLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          {hero.score && <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 30, color: C.thi, lineHeight: 1 }}>{hero.score}</span>}
          {hero.opponent && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.tbody }}>
              <GamerAvatar uid={hero.opponent.uid} tag={hero.opponent.tag} hasPhoto={hero.opponent.hasPhoto} size={28} />
              مقابلِ {hero.opponent.name}{hero.station ? ` · ایستگاه ${hero.station}` : ''}
            </span>
          )}
        </div>
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
      </div>
    )
  }

  return null   // unreachable — all three ActiveHero members handled above
}
