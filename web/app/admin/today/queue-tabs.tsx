'use client'
import { useState } from 'react'
import { C } from '@/components/ui'
import type { AdminTodaySnapshot, QueueBucket } from '@/lib/today-snapshot'
import QueueList from './queue-list'

const LABEL: Record<QueueBucket, string> = {
  waiting: 'منتظر', playing: 'درحالِ‌بازی', late: 'دیرکرده', absent: 'غایب', ref: 'درخواستِ‌داور',
}
const ORDER: QueueBucket[] = ['waiting', 'playing', 'late', 'absent', 'ref']

export default function QueueTabs({ data, busy, onCall, onResolveRef }: {
  data: AdminTodaySnapshot
  busy: boolean
  onCall: (matchId: string) => void
  onResolveRef: (matchId: string) => void
}) {
  const [tab, setTab] = useState<QueueBucket>('waiting')
  const urgent = (b: QueueBucket) => b === 'late' || b === 'absent' || b === 'ref'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
        {ORDER.map(b => {
          const on = tab === b
          const count = data.counts[b]
          const hot = urgent(b) && count > 0
          return (
            <button key={b} onClick={() => setTab(b)} style={{
              all: 'unset', cursor: 'pointer', flexShrink: 0, fontSize: 11.5, fontWeight: 700,
              color: on ? C.ink : hot ? C.live : C.tbody,
              background: on ? C.thi : hot ? C.liveSoft : C.sf1,
              border: `1px solid ${on ? C.thi : hot ? C.live : C.line2}`,
              borderRadius: 999, padding: '6px 11px', whiteSpace: 'nowrap',
            }}>
              {LABEL[b]} {count}
            </button>
          )
        })}
      </div>
      <QueueList bucket={tab} rows={data.queue[tab]} busy={busy} onCall={onCall} onResolveRef={onResolveRef} />
    </div>
  )
}
