'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { C } from '@/components/ui'
import type { QueueRow } from '@/lib/today-snapshot'

const PAGE_SIZE = 20

function minutesLabel(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60000))
  return min < 1 ? 'چند لحظه' : `${min} دقیقه`
}

export default function QueueList({ resetKey, rows, busy, onCall, showEvent }: {
  // Urgency is read off each row's own bucket, so one list can mix them (the
  // board's «درحالِ‌بازی» section is playing + late + absent together).
  resetKey: string
  rows: QueueRow[]
  busy: boolean
  onCall?: (matchId: string) => void
  showEvent?: boolean
}) {
  // A queue can run into the hundreds on a busy match day — rendering all of
  // it made this the tallest thing on the page (buried the story/announcement
  // panels below a long scroll). Show a page, grow it on demand.
  const [visible, setVisible] = useState(PAGE_SIZE)
  useEffect(() => { setVisible(PAGE_SIZE) }, [resetKey])

  if (rows.length === 0) return <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: '12px 0' }}>خالیه</div>
  const shown = rows.slice(0, visible)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {shown.map(r => {
        const urgent = r.bucket === 'late' || r.bucket === 'absent'
        return (
        <div key={r.matchId} className={r.live ? 'gl-live-pulse' : undefined} style={{ background: C.sf1, border: `1px solid ${r.live ? C.win : urgent ? C.live : C.line}`, borderRadius: 11, padding: '10px 11px', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* The row IS the way into the match: /competitions/…/bracket?match=…
              opens this match's own MatchSheet, so finding a game on the board
              and recording its result is one tap, not a hunt through scopes,
              brackets and round tabs. */}
          <Link href={`/competitions/${r.compId}/bracket?match=${r.matchId}`} style={{ all: 'unset', cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: C.thi, lineHeight: '18px', minWidth: 0 }}>
              {r.live && <span className="gl-live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: C.win, flexShrink: 0 }} />}
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.p1Name} — {r.p2Name}</span>
            </span>
            <span style={{ fontSize: 10.5, color: C.tmut, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {[
                showEvent && r.eventTitle ? r.eventTitle : null,
                r.n != null ? `بازی ${r.n}` : null,
                r.station ? `ایستگاه ${r.station}` : null,
              ].filter(Boolean).join(' · ')}
              {r.sinceMs != null && (
                <>
                  {' · '}
                  <span style={{ color: urgent ? C.live : C.tmut }}>{minutesLabel(r.sinceMs)}</span>
                </>
              )}
            </span>
          </Link>
          {/* «صدا کن» pings both players with their station — it stays on the
              rows that haven't been called yet, and only for staff. */}
          {r.bucket === 'waiting' && onCall && <button disabled={busy} onClick={() => onCall(r.matchId)} style={{ all: 'unset', boxSizing: 'border-box', textAlign: 'center', height: 34, padding: '0 13px', lineHeight: '34px', borderRadius: 9, background: C.accent, color: C.ink, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>صدا کن</button>}
        </div>
        )
      })}
      {rows.length > visible && (
        <button onClick={() => setVisible(v => v + PAGE_SIZE)} style={{
          all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '9px 0', borderRadius: 10,
          background: C.sf2, border: `1px solid ${C.line}`, color: C.tbody, fontWeight: 700, fontSize: 12,
        }}>
          {Math.min(PAGE_SIZE, rows.length - visible)} تای بعدی ({rows.length - visible} مونده)
        </button>
      )}
    </div>
  )
}
