'use client'
import { C } from '@/components/ui'
import { faDigits } from '@/lib/jalali'

// The one honest "this page is alive right now" signal at the very top —
// `playingNow` is a real count (matches with status==='ready'), not a mood.
// live-section.tsx's own "فیدِ زنده" heading further down is about results
// already in; this bar is about what's happening this second.
export default function LivePulseBar({ live, playingNow }: { live: boolean; playingNow: number }) {
  if (!live) return null

  if (playingNow > 0) {
    return (
      <div className="gl-pulse-sweep" style={{
        position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
        background: C.liveSoft, border: `1px solid ${C.live}55`, borderRadius: 999, padding: '7px 13px',
      }}>
        <span style={{ position: 'relative', zIndex: 1, width: 7, height: 7, borderRadius: '50%', background: C.live, animation: 'todayPulseBarDot 1.4s ease-in-out infinite' }} />
        <span style={{ position: 'relative', zIndex: 1, fontSize: 12.5, fontWeight: 800, color: C.live }}>
          الان <span dir="ltr">{faDigits(playingNow)}</span> بازی در جریانه
        </span>
        <style>{`
          @keyframes todayPulseBarDot { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: .4; transform: scale(.75) } }
          @keyframes todayPulseSweep { from { background-position: 160% 0 } to { background-position: -60% 0 } }
          .gl-pulse-sweep::after {
            content: ''; position: absolute; inset: 0;
            background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.16) 50%, transparent 70%);
            background-size: 220% 100%; animation: todayPulseSweep 2.6s linear infinite;
          }
          @media (prefers-reduced-motion: reduce) { .gl-pulse-sweep::after { animation: none; } }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
      background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 999, padding: '7px 13px',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.tmut }} />
      <span style={{ fontSize: 12.5, fontWeight: 700, color: C.tbody }}>امروز مسابقه در جریانه</span>
    </div>
  )
}
