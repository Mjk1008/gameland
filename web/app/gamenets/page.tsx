import Link from 'next/link'
import { allGamenets } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import { C, DISP, GameBadge, EmptyState } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default function GamenetsPage() {
  const list = allGamenets()

  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: 19, fontWeight: 800, color: C.thi }}>گیم‌نت‌ها</span>
          <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 3 }}>فهرست گیم‌نت‌های سراسر کشور</div>
        </div>
        <Link href="/gamenets/new" style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', minHeight: 44, boxSizing: 'border-box', fontSize: 12.5, fontWeight: 700, color: C.ink, background: C.accent, padding: '0 14px', borderRadius: 11 }}>+ ثبت گیم‌نت</Link>
      </div>

      {list.length === 0 ? (
        <EmptyState text="هنوز گیم‌نتی ثبت نشده — گیم‌نتت رو تو اضافه کن." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(g => (
            <Link key={g.id} href={`/gamenets/${g.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.accentSoft, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="6" width="16" height="11" rx="2"/><path d="M9 17v3M15 17v3M7 20h10"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: C.thi }}>{g.name}</span>
                  {g.verified && <span style={{ fontSize: 11, fontWeight: 700, color: C.win, background: C.winSoft, padding: '2px 6px', borderRadius: 5 }}>✓ تأییدشده</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4, fontSize: 11.5, color: C.tmut }}>
                  <span>{g.city}</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.line2 }} />
                  <span dir="ltr" style={{ fontFamily: DISP }}>{g.stations} ایستگاه</span>
                </div>
                <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                  {g.disciplines.slice(0, 4).map(did => {
                    const d = DISC[did as keyof typeof DISC]
                    if (!d) return null
                    return <GameBadge key={did} disc={did} size={20} />
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
