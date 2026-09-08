'use client'
import { useMemo, useState } from 'react'
import { C, DISP } from '@/components/ui'
import CollapsibleCard from '@/components/collapsible-card'
import { usePolling } from '@/components/use-polling'
import type { AdminTodaySnapshot, QueueBucket, QueueRow } from '@/lib/today-snapshot'
import StationGrid from './station-grid'
import QueueList from './queue-list'
import GroupAnnounceForm from './group-announce-form'
import StoryPanel from './story-panel'
import AnnouncementPanel from './announcement-panel'

export default function TodayAdminClient({ initial, staff, isAdminRole }: {
  initial: AdminTodaySnapshot
  // admin | organizer — may call a match to a station and send اعلانِ گروهی.
  staff: boolean
  // role==='admin' — the only role /api/admin/stories and
  // /api/admin/today-announcements accept.
  isAdminRole: boolean
}) {
  // Tighter interval than the player page — an admin running the floor needs
  // the freshest possible view of the queue/stations.
  const { data: polled, refresh } = usePolling<AdminTodaySnapshot>('/api/admin/today', { activeMs: 5000, initial })
  const raw = polled ?? initial
  const [busy, setBusy] = useState(false)
  // A match day runs several disciplines at once and the buckets mix them all,
  // so "which match, right now" means scanning. One chip narrows the whole
  // board — stations included — to a single رشته.
  const [comp, setComp] = useState<string | null>(null)

  const events = useMemo(() => {
    const seen = new Map<string, string>()
    for (const b of Object.keys(raw.queue) as QueueBucket[]) {
      for (const r of raw.queue[b]) if (!seen.has(r.compId)) seen.set(r.compId, r.eventTitle)
    }
    for (const s of raw.stations) if (!seen.has(s.compId)) seen.set(s.compId, s.eventTitle)
    return [...seen.entries()].map(([compId, title]) => ({ compId, title }))
  }, [raw])

  // A filter on a disappearing رشته must not strand the admin on an empty board.
  const active = comp && events.some(e => e.compId === comp) ? comp : null

  const data = useMemo<AdminTodaySnapshot>(() => {
    if (!active) return raw
    const keep = (r: QueueRow) => r.compId === active
    const queue = {
      waiting: raw.queue.waiting.filter(keep),
      playing: raw.queue.playing.filter(keep),
      late: raw.queue.late.filter(keep),
      absent: raw.queue.absent.filter(keep),
    }
    return {
      stations: raw.stations.filter(s => s.compId === active),
      queue,
      counts: { waiting: queue.waiting.length, playing: queue.playing.length, late: queue.late.length, absent: queue.absent.length },
    }
  }, [raw, active])

  async function call(matchId: string) {
    const station = prompt('شماره‌ی ایستگاه؟')?.trim()
    if (!station) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/today/call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId, station }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      await refresh()
    } catch (e: any) { alert(e.message) } finally { setBusy(false) }
  }

  const lateCount = data.counts.late + data.counts.absent
  const queueBadge = `${data.counts.waiting} منتظر`
  // Everything already called to a station (playing/late/absent), live-marked
  // matches first — the board's answer to "what's on right now".
  const underway = useMemo(
    () => [...data.queue.playing, ...data.queue.late, ...data.queue.absent]
      .sort((a, b) => Number(b.live) - Number(a.live) || b.sinceMs - a.sinceMs),
    [data],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.thi }}>تختهٔ روز</span>
          <span style={{ fontSize: 11, color: C.tmut }}>{data.stations.length} ایستگاه · {data.counts.playing + data.counts.late + data.counts.absent} بازیِ فعال</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {lateCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: C.live, background: C.liveSoft, borderRadius: 8, padding: '5px 9px' }}>{lateCount} دیرکرده</span>}
        </div>
      </div>

      <div style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {events.length > 1 && (
          <div className="gl-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
            <button onClick={() => setComp(null)} style={filterChip(!active)}>همه</button>
            {events.map(e => (
              <button key={e.compId} onClick={() => setComp(e.compId)} style={filterChip(active === e.compId)}>{e.title}</button>
            ))}
          </div>
        )}

        {/* "Which match is being played right now" was the one question this
            board couldn't answer at a glance: it opened on the «منتظر» tab —
            games that have NOT started — and the ones under way were a tab
            away. They lead now; the not-yet-called queue is folded below. */}
        {underway.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 11, color: C.tmut, fontFamily: DISP, letterSpacing: '.12em', fontWeight: 700 }}>LIVE · درحالِ‌بازی</span>
            <QueueList resetKey={`live:${active ?? ''}`} rows={underway} busy={busy} showEvent={!active} />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 11, color: C.tmut, fontFamily: DISP, letterSpacing: '.12em', fontWeight: 700 }}>STATIONS · ایستگاه‌ها</span>
          <StationGrid stations={data.stations} showEvent={!active} />
        </div>

        {/* The waiting queue and the three composers below are the parts of
            this board that don't get used on a match day. Folded away with
            their counts on the header — nothing lost, just no longer the
            tallest thing on the page. */}
        <CollapsibleCard title="صف" badge={queueBadge}>
          <div style={{ paddingTop: 14 }}>
            <QueueList resetKey={`waiting:${active ?? ''}`} rows={data.queue.waiting} busy={busy} onCall={staff ? call : undefined} showEvent={!active} />
          </div>
        </CollapsibleCard>

        {isAdminRole && <CollapsibleCard title="استوری"><div style={{ paddingTop: 14 }}><StoryPanel bare /></div></CollapsibleCard>}
        {isAdminRole && <CollapsibleCard title="تابلوِ اعلان"><div style={{ paddingTop: 14 }}><AnnouncementPanel bare /></div></CollapsibleCard>}
        {staff && <CollapsibleCard title="اعلانِ گروهی"><div style={{ paddingTop: 14 }}><GroupAnnounceForm bare /></div></CollapsibleCard>}
      </div>
    </div>
  )
}

const filterChip = (on: boolean): React.CSSProperties => ({
  all: 'unset', cursor: 'pointer', flexShrink: 0, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
  color: on ? C.ink : C.tbody, background: on ? C.accent : C.sf1,
  border: `1px solid ${on ? C.accent : C.line2}`, borderRadius: 999, padding: '6px 11px',
})
