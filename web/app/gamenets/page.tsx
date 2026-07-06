import Link from 'next/link'
import { allGamenets } from '@/lib/store'
import { DISC, avatarBg } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export default function GamenetsPage() {
  const list = allGamenets()

  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: 19, fontWeight: 800, color: '#f1f5f9' }}>گیم‌نت‌ها</span>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>فهرست گیم‌نت‌های سراسر کشور</div>
        </div>
        <Link href="/gamenets/new" style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#0b0f14', background: '#22d3ee', padding: '7px 12px', borderRadius: 9 }}>+ ثبت گیم‌نت</Link>
      </div>

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b', fontSize: 13 }}>هنوز گیم‌نتی ثبت نشده — گیم‌نتت رو تو اضافه کن.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(g => (
            <Link key={g.id} href={`/gamenets/${g.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: '#121821', border: '1px solid #1e293b', borderRadius: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #22d3ee22, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="6" width="16" height="11" rx="2"/><path d="M9 17v3M15 17v3M7 20h10"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{g.name}</span>
                  {g.verified && <span style={{ fontSize: 9, fontWeight: 700, color: '#34d399', background: '#34d39922', padding: '2px 6px', borderRadius: 5 }}>✓ تأییدشده</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4, fontSize: 11, color: '#64748b' }}>
                  <span>{g.city}</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#334155' }} />
                  <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{g.stations} ایستگاه</span>
                </div>
                <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                  {g.disciplines.slice(0, 4).map(did => {
                    const d = DISC[did as keyof typeof DISC]
                    if (!d) return null
                    return <span key={did} dir="ltr" style={{ fontSize: 8, fontWeight: 700, color: d.color, background: avatarBg(d.color), padding: '2px 6px', borderRadius: 5 }}>{d.short}</span>
                  })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
