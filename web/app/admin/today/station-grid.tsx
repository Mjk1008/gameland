'use client'
import Link from 'next/link'
import { C, DISP } from '@/components/ui'
import type { StationCard } from '@/lib/today-snapshot'

export default function StationGrid({ stations, showEvent }: { stations: StationCard[]; showEvent?: boolean }) {
  if (stations.length === 0) {
    return <div style={{ fontSize: 12.5, color: C.tmut, textAlign: 'center', padding: '14px 0' }}>هنوز هیچ ایستگاهی صدا نشده</div>
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {stations.map(s => {
        const color = s.live ? C.win : s.status === 'late' ? C.gold : C.live
        return (
          // Same one-tap route into the match as the queue rows — a station
          // card is often what an admin is looking at when a game finishes.
          <Link
            key={s.station}
            href={`/competitions/${s.compId}/bracket?match=${s.matchId}`}
            className={s.live ? 'gl-live-pulse' : undefined}
            // Not `all: 'unset'` — that would win over .gl-live-pulse's animation.
            style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer', background: C.sf1, border: `1px solid ${color}`, borderRadius: 11, padding: 10, display: 'flex', gap: 10, alignItems: 'flex-start', boxSizing: 'border-box' }}
          >
            <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 32, color: C.thi, lineHeight: 1 }}>{s.station}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, paddingTop: 2, minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color }}>
                {s.live && <span className="gl-live-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: C.win, flexShrink: 0 }} />}
                {s.status === 'late' ? 'دیرکرده' : 'درحالِ‌اجرا'}
              </span>
              <span style={{ fontSize: 11, color: C.thi, lineHeight: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.current}</span>
              <span style={{ fontSize: 10, color: C.tmut, lineHeight: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {showEvent ? s.eventTitle : ''}{showEvent && s.n != null ? ' · ' : ''}{s.n != null ? `بازی ${s.n}` : ''}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
