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
      <div className="gl-hero-glow" style={{ borderRadius: 16, background: `linear-gradient(165deg, ${C.liveSoft}, ${C.sf1} 62%)`, border: `1px solid ${C.live}`, padding: 15, display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        <style>{`
          @keyframes todayLivePulse { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: .45; transform: scale(.82) } }
          @keyframes todayHeroGlow { 0%,100% { box-shadow: 0 0 0 0 ${C.live}55 } 50% { box-shadow: 0 0 0 8px ${C.live}00 } }
          .gl-hero-glow { animation: todayHeroGlow 2.2s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) { .gl-hero-glow { animation: none; } }
        `}</style>
      </div>
    )
  }

  if (hero.kind === 'advanced') {
    return (
      <div className="gl-advanced-confetti" style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, background: `linear-gradient(165deg, ${C.gold}33, ${C.sf1} 62%)`, border: `1px solid ${C.gold}`, padding: 15, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ position: 'relative', zIndex: 1, fontSize: 12.5, fontWeight: 800, color: C.gold }}>صعود کردم</span>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'baseline', gap: 10 }}>
          {hero.score && <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 34, color: C.thi, lineHeight: 1 }}>{hero.score}</span>}
          <span style={{ fontSize: 15, fontWeight: 700, color: C.thi }}>بردم — صعود کردم</span>
        </div>
        {/* Fixed particle set (no Math.random — this can render on the
            server, and randomizing there would mismatch on hydration).
            fill-mode:forwards + no `infinite` means it plays once when the
            card first mounts into this state and stays put after — later
            8s polls that keep hero.kind==='advanced' just re-render props,
            they don't remount this node, so it never replays. */}
        <span aria-hidden className="gl-confetti-piece" style={{ insetInlineStart: '8%', background: C.gold, animationDelay: '0s' }} />
        <span aria-hidden className="gl-confetti-piece" style={{ insetInlineStart: '20%', background: C.accent, animationDelay: '.08s' }} />
        <span aria-hidden className="gl-confetti-piece" style={{ insetInlineStart: '32%', background: C.thi, animationDelay: '.03s' }} />
        <span aria-hidden className="gl-confetti-piece" style={{ insetInlineStart: '44%', background: C.win, animationDelay: '.15s' }} />
        <span aria-hidden className="gl-confetti-piece" style={{ insetInlineStart: '56%', background: C.gold, animationDelay: '.05s' }} />
        <span aria-hidden className="gl-confetti-piece" style={{ insetInlineStart: '68%', background: C.accent, animationDelay: '.18s' }} />
        <span aria-hidden className="gl-confetti-piece" style={{ insetInlineStart: '80%', background: C.thi, animationDelay: '.1s' }} />
        <span aria-hidden className="gl-confetti-piece" style={{ insetInlineStart: '92%', background: C.win, animationDelay: '.22s' }} />
        <style>{`
          @keyframes todayConfettiFall {
            0% { opacity: 1; transform: translateY(-16px) rotate(0deg) }
            100% { opacity: 0; transform: translateY(140px) rotate(340deg) }
          }
          .gl-confetti-piece {
            position: absolute; top: 0; width: 6px; height: 10px; border-radius: 1px;
            animation: todayConfettiFall 1.6s ease-in forwards;
          }
          @media (prefers-reduced-motion: reduce) { .gl-advanced-confetti .gl-confetti-piece { display: none; } }
        `}</style>
      </div>
    )
  }

  return null   // unreachable — all three ActiveHero members handled above
}
