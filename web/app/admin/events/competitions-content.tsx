import Link from 'next/link'
import { allCompetitions } from '@/lib/store'
import { C, EmptyState } from '@/components/ui'

// Multi-discipline competitions (رویداد) — one tab of the tournaments hub.
export default function CompetitionsContent() {
  const comps = allCompetitions()
  return (
    <div style={{ padding: '0 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 14 }}>
        <Link href="/admin/competitions/new" style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: C.ink, background: C.accent, padding: '8px 13px', borderRadius: 10 }}>+ رویداد چندرشته‌ای</Link>
      </div>

      {comps.length === 0 ? (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}><EmptyState text="هنوز رویدادِ چندرشته‌ای نساختی." /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {comps.map(cp => (
            <Link key={cp.id} href={`/admin/competitions/${cp.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: C.gold, flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: C.thi, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cp.title}</span>
              <span style={{ color: C.tmut, fontSize: 13 }}>›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
