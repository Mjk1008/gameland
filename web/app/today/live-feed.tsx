'use client'
import { C, DISP } from '@/components/ui'
import { timeAgoFa } from '@/lib/arena-ui'
import type { FeedItem } from '@/lib/today-snapshot'

export default function LiveFeed({ feed }: { feed: FeedItem[] }) {
  if (feed.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.thi }}>فیدِ زنده</span>
        <span style={{ fontSize: 11, color: C.tmut, fontFamily: DISP, letterSpacing: '.1em', fontWeight: 700 }}>LIVE FEED</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {feed.map((f, i) => (
          <div key={f.matchId} style={{
            display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0',
            borderBottom: i < feed.length - 1 ? `1px solid ${C.sf2}` : 'none',
            animation: 'todayFeedIn .3s ease-out',
          }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: C.sf2, border: `1px solid ${C.line2}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISP, fontWeight: 700, fontSize: 14, color: C.thi, flexShrink: 0 }}>
              {f.winnerName[0]?.toUpperCase()}
            </span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 13, color: C.thi, lineHeight: '19px' }}>
                <b style={{ fontWeight: 700 }}>{f.winnerName}</b> بردِ <b style={{ fontWeight: 700 }}>{f.loserName}</b> رو{f.score ? ` ${f.score}` : ''}
              </span>
              <span style={{ fontSize: 11, color: C.tmut }}>{timeAgoFa(f.completedAt)}</span>
            </div>
          </div>
        ))}
      </div>
      <style>{'@keyframes todayFeedIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }'}</style>
    </div>
  )
}
