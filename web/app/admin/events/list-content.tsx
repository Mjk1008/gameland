import Link from 'next/link'
import { allEvents, getCompetition } from '@/lib/store'
import { C, StatusChip, EmptyState, GameBadge } from '@/components/ui'

// Discipline-events list — one tab of the tournaments hub (see ../page.tsx).
export default function EventsListContent() {
  const all = allEvents()
  return (
    <div style={{ padding: '0 16px 28px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginBottom: 14 }}>
        <Link href="/admin/events/new" style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: C.ink, background: C.accent, padding: '8px 13px', borderRadius: 10 }}>+ مسابقهٔ مستقل</Link>
      </div>

      {all.length === 0 ? (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}><EmptyState text="هنوز مسابقه‌ای نساختی." /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {all.map(c => {
            const parent = c.competitionId ? getCompetition(c.competitionId) : undefined
            return (
              <Link key={c.id} href={`/admin/events/${c.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', background: C.sf1, border: `1px solid ${parent ? C.accent + '33' : C.line}`, borderRadius: 13 }}>
                <GameBadge disc={c.disc} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{c.title}</div>
                  <div className="gl-num" style={{ fontSize: 11, color: C.tmut, marginTop: 3 }}>
                    {parent ? parent.title : 'مستقل'} · {c.prize}M · {c.maxPlayers ?? c.teams} نفر
                  </div>
                </div>
                <StatusChip status={c.status} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
