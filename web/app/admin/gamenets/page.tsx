import Link from 'next/link'
import { allGamenets, getUserById } from '@/lib/store'
import { C, Card } from '@/components/ui'
import VerifyBtn from './verify-btn'

export const dynamic = 'force-dynamic'

export default function GamenetsAdmin() {
  const list = allGamenets()
  return (
    <div style={{ padding: '14px 16px 28px' }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: C.thi, marginBottom: 12 }}>گیم‌نت‌ها</div>

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: C.tmut, fontSize: 13 }}>هنوز گیم‌نتی ثبت نشده</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(g => {
            const owner = getUserById(g.ownerId)
            return (
              <Card key={g.id} style={{ padding: '11px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{g.name}</span>
                  <VerifyBtn id={g.id} verified={g.verified}/>
                </div>
                <div style={{ fontSize: 12, color: C.tbody }}>{g.city} · {g.stations} ایستگاه</div>
                <div style={{ fontSize: 11, color: C.tbody, marginTop: 4 }}>ثبت‌کننده: {owner?.name ?? 'ناشناس'} ({owner?.tag ?? '?'})</div>
                <Link href={`/gamenets/${g.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'block', marginTop: 6, fontSize: 12, color: C.accent }}>دیدن صفحهٔ عمومی ›</Link>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
