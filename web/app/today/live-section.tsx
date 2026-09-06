'use client'
import { useState } from 'react'
import { C, DISP } from '@/components/ui'
import type { LiveEventBrief, ProvincePulse, FeedItem } from '@/lib/today-snapshot'
import ProvincePulseStrip from './province-pulse'
import LiveFeed from './live-feed'

// رویداد ← استان ← فید — a single interactive drill-down replacing the three
// disconnected widgets that used to sit here (docs/37 §9.4). If there's only
// one live event, the event-chip row is skipped entirely.
export default function LiveSection({ liveEvents, provincePulse, feed }: {
  liveEvents: LiveEventBrief[]
  provincePulse: ProvincePulse[]
  feed: FeedItem[]
}) {
  const [compId, setCompId] = useState<string | undefined>(liveEvents.length === 1 ? liveEvents[0].compId : undefined)
  const [province, setProvince] = useState<string | undefined>(undefined)

  if (liveEvents.length === 0) return null

  const pulseItems = compId ? provincePulse.filter(p => p.compId === compId) : provincePulse
  const feedItems = feed.filter(f => (!compId || f.compId === compId) && (!province || f.province === province))

  function selectEvent(id: string | undefined) {
    setCompId(id)
    setProvince(undefined)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.thi }}>فیدِ زنده</span>
        <span style={{ fontSize: 11, color: C.tmut, fontFamily: DISP, letterSpacing: '.1em', fontWeight: 700 }}>LIVE FEED</span>
      </div>

      {liveEvents.length > 1 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', direction: 'ltr' }}>
          {liveEvents.map(e => {
            const on = compId === e.compId
            return (
              <button key={e.compId} type="button" onClick={() => selectEvent(on ? undefined : e.compId)}
                style={{
                  all: 'unset', cursor: 'pointer', flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '7px 12px', borderRadius: 999, direction: 'rtl',
                  color: on ? C.ink : C.tbody, background: on ? C.accent : C.sf1, border: `1px solid ${on ? C.accent : C.line}`,
                }}>
                {e.title}
              </button>
            )
          })}
        </div>
      )}

      {pulseItems.length > 0 && (
        <ProvincePulseStrip items={pulseItems} selected={province} onSelect={setProvince} />
      )}

      <LiveFeed feed={feedItems} />
    </div>
  )
}
