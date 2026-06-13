import Link from 'next/link'
import { allUsers, allEvents } from '@/lib/store'
import { COMPS } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export default function AdminHome() {
  const userCount = allUsers().length
  const events = allEvents()
  const liveComps = COMPS.filter(c => c.status === 'live' || c.status === 'open').length

  return (
    <div style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>داشبورد ادمین</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Stat label="گیمرها"           value={userCount}        color="#22d3ee"/>
        <Stat label="مسابقات فعال"      value={liveComps}        color="#34d399"/>
        <Stat label="ایونت‌های جدید"   value={events.length}    color="#f5c84b"/>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <CTA href="/admin/events/new" label="ساخت ایونت جدید" color="#22d3ee"/>
        <CTA href="/admin/notify"     label="ارسال اعلان به همه" color="#f5c84b"/>
        <CTA href="/admin/gamers"     label="مدیریت گیمرها"  color="#94a3b8"/>
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>مسابقات</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {COMPS.map(c => (
            <Link key={c.id} href={`/admin/events/${c.id}`} style={row}>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0', flex: 1 }}>{c.title}</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>{c.statusLabel}</span>
              <span style={{ fontSize: 11, color: '#22d3ee', marginRight: 6 }}>›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

const row: React.CSSProperties = { all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', background: '#121821', border: '1px solid #1e293b', borderRadius: 11 }

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 13, padding: '13px 0', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22, color }}>{value}</span>
      <span style={{ fontSize: 10, color: '#64748b' }}>{label}</span>
    </div>
  )
}
function CTA({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <Link href={href} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', background: '#121821', border: `1px solid ${color}33`, borderRadius: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{label}</span>
      <span style={{ color, fontSize: 13 }}>›</span>
    </Link>
  )
}
