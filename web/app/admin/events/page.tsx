import Link from 'next/link'
import { allEvents } from '@/lib/store'
import { C, Num, StatusChip, EmptyState, DISC_DOT } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default function AdminEventsPage() {
  const all = allEvents()
  return (
    <div style={{ padding: '16px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: C.thi }}>مسابقات</span>
        <Link href="/admin/events/new" style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: C.ink, background: C.accent, padding: '8px 13px', borderRadius: 10 }}>+ ایونت جدید</Link>
      </div>

      {all.length === 0 ? (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}><EmptyState text="هنوز ایونتی نساختی." /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {all.map(c => (
            <Link key={c.id} href={`/admin/events/${c.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: DISC_DOT[c.disc] ?? C.tmut, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{c.title}</div>
                <div className="gl-num" style={{ fontSize: 11, color: C.tmut, marginTop: 3 }}>{c.prize}M · {c.maxPlayers ?? c.teams} نفر</div>
              </div>
              <StatusChip status={c.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
