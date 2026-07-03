import Link from 'next/link'
import { allEvents } from '@/lib/store'
import { DISC, avatarBg, statusColor } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export default function AdminEventsPage() {
  const all = allEvents().map(e => ({ id: e.id, title: e.title, disc: e.disc, status: e.status, statusLabel: e.statusLabel, season: e.season, prize: e.prize, teams: e.teams }))

  return (
    <div style={{ padding: '14px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>مسابقات</span>
        <Link href="/admin/events/new" style={{ all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#0b0f14', background: '#22d3ee', padding: '7px 12px', borderRadius: 9 }}>+ ایونت جدید</Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {all.map(c => {
          const d = DISC[c.disc as keyof typeof DISC]
          const sc = statusColor(c.status as any)
          return (
            <Link key={c.id} href={`/admin/events/${c.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', background: '#121821', border: '1px solid #1e293b', borderRadius: 13 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: avatarBg(d.color), border: `1px solid ${d.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 12, color: d.color }}>{d.short}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{c.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 11 }}>
                  <span style={{ color: sc, fontWeight: 700 }}>{c.statusLabel}</span>
                  <span style={{ color: '#475569' }}>·</span>
                  <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', color: '#94a3b8' }}>{c.prize}M · {c.teams} تیم</span>
                </div>
              </div>
              <span style={{ fontSize: 11, color: '#22d3ee' }}>›</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
