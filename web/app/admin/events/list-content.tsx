import Link from 'next/link'
import { allEvents, getCompetition, allMatches } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import { C, EmptyState } from '@/components/ui'
import EventsList, { type EventRow } from './events-list'

// Discipline-events list — one tab of the tournaments hub (see ../page.tsx).
export default function EventsListContent() {
  const all = allEvents()   // already newest-first
  // One pass over the match table instead of matchesForComp() per event —
  // that filters+sorts the whole array each call, so the old shape would have
  // been O(events × matches) just to decide whether to show a bracket link.
  const drawnIds = new Set<string>()
  for (const m of allMatches()) drawnIds.add(m.compId)

  const rows: EventRow[] = all.map(c => {
    const parent = c.competitionId ? getCompetition(c.competitionId) : undefined
    return {
      id: c.id,
      title: c.title,
      disc: c.disc,
      discName: DISC[c.disc as keyof typeof DISC]?.name ?? c.disc,
      status: c.status,
      parentTitle: parent?.title,
      prize: c.prize,
      seats: c.maxPlayers ?? c.teams,
      drawn: drawnIds.has(c.id),
    }
  })

  return (
    <div style={{ padding: '0 16px 28px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginBottom: 14 }}>
        <Link href="/admin/events/new" style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: C.ink, background: C.accent, padding: '8px 13px', borderRadius: 10 }}>+ مسابقهٔ مستقل</Link>
      </div>

      {rows.length === 0 ? (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}><EmptyState text="هنوز مسابقه‌ای نساختی." /></div>
      ) : (
        <EventsList rows={rows} />
      )}
    </div>
  )
}
