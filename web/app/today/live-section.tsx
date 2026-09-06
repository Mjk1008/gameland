'use client'
import { useMemo, useState } from 'react'
import { C, DISP } from '@/components/ui'
import type { LiveEventBrief, ProvincePulse, FeedItem } from '@/lib/today-snapshot'
import PulseStrip, { type PulseCard } from './pulse-strip'
import LiveFeed from './live-feed'

type Dim = 'province' | 'disc'

const PinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.3" />
  </svg>
)
const DiscIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="11" rx="5" /><path d="M7 10.5v4M5 12.5h4" /><circle cx="16" cy="10.8" r="1" fill="currentColor" stroke="none" /><circle cx="18.3" cy="13" r="1" fill="currentColor" stroke="none" />
  </svg>
)

// رویداد + استان — two independent tappable dimensions instead of one rigid
// event-chips-then-province drill-down (docs/37 §9.4). Each tab filters the
// feed on its own; both can be active together.
export default function LiveSection({ liveEvents, provincePulse, feed }: {
  liveEvents: LiveEventBrief[]
  provincePulse: ProvincePulse[]
  feed: FeedItem[]
}) {
  const [dim, setDim] = useState<Dim>('province')
  const [compId, setCompId] = useState<string | undefined>(undefined)
  const [province, setProvince] = useState<string | undefined>(undefined)

  const discPulse = useMemo(() => {
    const byComp = new Map<string, { done: number; total: number }>()
    for (const p of provincePulse) {
      const row = byComp.get(p.compId) ?? { done: 0, total: 0 }
      row.done += p.done; row.total += p.total
      byComp.set(p.compId, row)
    }
    return liveEvents
      .map((e): PulseCard => ({ key: e.compId, label: e.title, done: byComp.get(e.compId)?.done ?? 0, total: byComp.get(e.compId)?.total ?? 0 }))
      .filter(c => c.total > 0)
  }, [liveEvents, provincePulse])

  // Two concurrent events can each have their own "تهران" group — merge by
  // name (the filter below is by province name only) instead of rendering
  // two cards with the same key.
  const provinceCards = useMemo(() => {
    const byName = new Map<string, PulseCard>()
    for (const p of provincePulse) {
      const row = byName.get(p.province) ?? { key: p.province, label: p.province, done: 0, total: 0 }
      row.done += p.done; row.total += p.total
      byName.set(p.province, row)
    }
    return [...byName.values()]
  }, [provincePulse])

  if (liveEvents.length === 0) return null

  const feedItems = feed.filter(f => (!compId || f.compId === compId) && (!province || f.province === province))
  const cards = dim === 'province' ? provinceCards : discPulse
  const selectedKey = dim === 'province' ? province : compId
  function selectCard(key: string) {
    if (dim === 'province') setProvince(p => p === key ? undefined : key)
    else setCompId(c => c === key ? undefined : key)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.thi }}>فیدِ زنده</span>
        <span style={{ fontSize: 11, color: C.tmut, fontFamily: DISP, letterSpacing: '.1em', fontWeight: 700 }}>LIVE FEED</span>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {([['province', 'استان‌ها', PinIcon], ['disc', 'رشته‌ها', DiscIcon]] as const).map(([k, label, Icon]) => {
          const on = dim === k
          return (
            <button key={k} type="button" onClick={() => setDim(k)} style={{
              all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '7px 13px', borderRadius: 999,
              color: on ? C.ink : C.tbody, background: on ? C.accent : C.sf1, border: `1px solid ${on ? C.accent : C.line}`,
            }}>
              <Icon />{label}
            </button>
          )
        })}
      </div>

      {cards.length > 0 && <PulseStrip items={cards} selected={selectedKey} onSelect={selectCard} />}

      <LiveFeed feed={feedItems} />
    </div>
  )
}
