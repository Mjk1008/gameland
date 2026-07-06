import Link from 'next/link'
import { allGamenets, getUserById } from '@/lib/store'
import VerifyBtn from './verify-btn'

export const dynamic = 'force-dynamic'

export default function GamenetsAdmin() {
  const list = allGamenets()
  return (
    <div style={{ padding: '14px 16px 28px' }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9', marginBottom: 12 }}>گیم‌نت‌ها</div>

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b', fontSize: 13 }}>هنوز گیم‌نتی ثبت نشده</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(g => {
            const owner = getUserById(g.ownerId)
            return (
              <div key={g.id} style={{ padding: '11px 13px', background: '#121821', border: '1px solid #1e293b', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{g.name}</span>
                  <VerifyBtn id={g.id} verified={g.verified}/>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{g.city} · {g.stations} ایستگاه</div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>ثبت‌کننده: {owner?.name ?? 'ناشناس'} ({owner?.tag ?? '?'})</div>
                <Link href={`/gamenets/${g.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'block', marginTop: 6, fontSize: 11, color: '#22d3ee' }}>دیدن صفحهٔ عمومی ›</Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
