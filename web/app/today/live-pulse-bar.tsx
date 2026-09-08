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
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
        background: C.liveSoft, border: `1px solid ${C.live}55`, borderRadius: 999, padding: '7px 13px',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.live, animation: 'todayPulseBarDot 1.4s ease-in-out infinite' }} />
        <span style={{ fontSize: 12.5, fontWeight: 800, color: C.live }}>
          الان <span dir="ltr">{faDigits(playingNow)}</span> بازی در جریانه
        </span>
        <style>{'@keyframes todayPulseBarDot { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: .4; transform: scale(.75) } }'}</style>
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
