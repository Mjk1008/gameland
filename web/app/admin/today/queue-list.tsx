'use client'
import { C } from '@/components/ui'
import type { QueueBucket, QueueRow } from '@/lib/today-snapshot'

function minutesLabel(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60000))
  return min < 1 ? 'چند لحظه' : `${min} دقیقه`
}

export default function QueueList({ bucket, rows, busy, onCall, onResolveRef }: {
  bucket: QueueBucket
  rows: QueueRow[]
  busy: boolean
  onCall: (matchId: string) => void
  onResolveRef: (matchId: string) => void
}) {
  if (rows.length === 0) return <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: '12px 0' }}>خالیه</div>
  const urgent = bucket === 'late' || bucket === 'absent' || bucket === 'ref'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map(r => (
        <div key={r.matchId} style={{ background: C.sf1, border: `1px solid ${urgent ? (bucket === 'ref' ? `${C.gold}88` : C.live) : C.line}`, borderRadius: 11, padding: '10px 11px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.thi, lineHeight: '18px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.p1Name} — {r.p2Name}</span>
            <span style={{ fontSize: 10.5, color: C.tmut }}>
              {r.station ? `ایستگاه ${r.station} · ` : ''}
              <span style={{ color: bucket === 'ref' ? C.gold : (urgent ? C.live : C.tmut) }}>{bucket === 'ref' ? 'درخواستِ داور' : minutesLabel(r.sinceMs)}</span>
            </span>
          </div>
          {bucket === 'ref'
            ? <button disabled={busy} onClick={() => onResolveRef(r.matchId)} style={{ all: 'unset', boxSizing: 'border-box', textAlign: 'center', height: 34, padding: '0 13px', lineHeight: '34px', borderRadius: 9, background: C.goldSoft, border: `1px solid ${C.gold}`, color: C.gold, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>رسیدگی</button>
            : bucket === 'waiting' && <button disabled={busy} onClick={() => onCall(r.matchId)} style={{ all: 'unset', boxSizing: 'border-box', textAlign: 'center', height: 34, padding: '0 13px', lineHeight: '34px', borderRadius: 9, background: C.accent, color: C.ink, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>صدا کن</button>}
        </div>
      ))}
    </div>
  )
}
