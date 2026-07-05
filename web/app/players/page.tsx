import Link from 'next/link'
import { allUsers } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import { C, DISP, EmptyState, DISC_DOT } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default function PlayersPage() {
  const players = allUsers().filter(u => u.role === 'gamer').map(u => ({
    id: u.id, name: u.name, tag: u.tag, city: u.city, disc: u.primaryDisc,
  }))

  return (
    <div className="animate-fade-up" style={{ padding: '16px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: C.thi }}>گیمرها</span>
        <span style={{ fontSize: 12.5, color: C.tmut }}><span className="gl-num">{players.length}</span> گیمر</span>
      </div>

      {players.length === 0 ? (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}>
          <EmptyState text="هنوز گیمری ثبت‌نام نکرده." />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          {players.map(p => {
            const d = p.disc ? DISC[p.disc as keyof typeof DISC] : null
            return (
              <Link key={p.id} href={`/players/${p.tag.toLowerCase()}`} style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: '18px 12px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 15, background: C.line, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: C.thi }}>{p.tag[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.thi }}>{p.name}</div>
                  <div dir="ltr" style={{ fontFamily: DISP, fontSize: 12, color: C.tmut, marginTop: 2 }}>@{p.tag}</div>
                </div>
                {d && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.thi, background: C.sf2, border: `1px solid ${C.line}`, padding: '4px 10px', borderRadius: 999 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: DISC_DOT[p.disc!] ?? C.tmut }} />{d.name}
                  </span>
                )}
                <div style={{ fontSize: 11, color: C.tmut }}>{p.city}</div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
