'use client'
import { useEffect, useState } from 'react'
import { C } from '@/components/ui'
import type { QueueBucket, QueueRow } from '@/lib/today-snapshot'

const PAGE_SIZE = 20

function minutesLabel(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60000))
  return min < 1 ? 'چند لحظه' : `${min} دقیقه`
}

export default function QueueList({ bucket, rows, busy, onCall }: {
  bucket: QueueBucket
  rows: QueueRow[]
  busy: boolean
  onCall: (matchId: string) => void
}) {
  // A queue can run into the hundreds on a busy match day — rendering all of
  // it made this the tallest thing on the page (buried the story/announcement
  // panels below a long scroll). Show a page, grow it on demand.
  const [visible, setVisible] = useState(PAGE_SIZE)
  useEffect(() => { setVisible(PAGE_SIZE) }, [bucket])

  if (rows.length === 0) return <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: '12px 0' }}>خالیه</div>
  const urgent = bucket === 'late' || bucket === 'absent'
  const shown = rows.slice(0, visible)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {shown.map(r => (
        <div key={r.matchId} style={{ background: C.sf1, border: `1px solid ${urgent ? C.live : C.line}`, borderRadius: 11, padding: '10px 11px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.thi, lineHeight: '18px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.p1Name} — {r.p2Name}</span>
            <span style={{ fontSize: 10.5, color: C.tmut }}>
              {r.station ? `ایستگاه ${r.station} · ` : ''}
              <span style={{ color: urgent ? C.live : C.tmut }}>{minutesLabel(r.sinceMs)}</span>
            </span>
          </div>
          {bucket === 'waiting' && <button disabled={busy} onClick={() => onCall(r.matchId)} style={{ all: 'unset', boxSizing: 'border-box', textAlign: 'center', height: 34, padding: '0 13px', lineHeight: '34px', borderRadius: 9, background: C.accent, color: C.ink, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>صدا کن</button>}
        </div>
      ))}
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
