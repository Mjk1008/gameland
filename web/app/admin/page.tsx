import Link from 'next/link'
import { allUsers, allEvents } from '@/lib/store'
import { C, Num, StatusChip, EmptyState, DISC_DOT } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default function AdminHome() {
  const userCount = allUsers().length
  const events = allEvents()
  const liveComps = events.filter(c => c.status === 'live' || c.status === 'open').length

  return (
    <div style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.thi }}>داشبورد</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Stat label="گیمرها" value={userCount} color={C.accent} />
        <Stat label="فعال" value={liveComps} color={C.win} />
        <Stat label="کل ایونت" value={events.length} color={C.gold} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <CTA href="/admin/events/new" label="+ ساخت ایونت جدید" primary />
        <CTA href="/admin/notify" label="ارسال اعلان به همه" />
        <CTA href="/admin/gamers" label="مدیریت گیمرها" />
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.thi, marginBottom: 10 }}>مسابقات</div>
        {events.length === 0 ? (
          <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}><EmptyState text="هنوز ایونتی نساختی." /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.map(c => (
              <Link key={c.id} href={`/admin/events/${c.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: DISC_DOT[c.disc] ?? C.tmut }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: C.thi, flex: 1 }}>{c.title}</span>
                <StatusChip status={c.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <Num size={24} color={color}>{value}</Num>
      <span style={{ fontSize: 10, color: C.tmut }}>{label}</span>
    </div>
  )
}
function CTA({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link href={href} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', background: primary ? C.accentSoft : C.sf1, border: `1px solid ${primary ? C.accent : C.line}`, borderRadius: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: primary ? C.accent : C.thi }}>{label}</span>
      <span style={{ color: primary ? C.accent : C.tmut, fontSize: 13 }}>›</span>
    </Link>
  )
}
