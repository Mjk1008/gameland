import Link from 'next/link'
import { allEvents } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import { C, Num, Label, StatusChip, EmptyState, DISC_DOT } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default function CompetitionsPage() {
  const events = allEvents()

  return (
    <div className="animate-fade-up" style={{ padding: '16px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: C.thi }}>مسابقات</span>
        <span style={{ fontSize: 12.5, color: C.tmut }}><span className="gl-num">{events.length}</span> مسابقه</span>
      </div>

      {events.length === 0 ? (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}>
          <EmptyState text="هنوز مسابقه‌ای اعلام نشده — به‌زودی سر می‌رسه." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {events.map(c => {
            const d = DISC[c.disc as keyof typeof DISC] ?? { name: c.disc, short: c.disc.slice(0, 4).toUpperCase(), color: C.tmut }
            const cap = c.maxPlayers ?? c.teams
            const filled = cap ? Math.min(1, (c.teams || 0) / cap) : 0
            return (
              <Link key={c.id} href={`/competitions/${c.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'block', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 15 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: DISC_DOT[c.disc] ?? C.tmut }} />
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: C.thi }}>{c.title}</span>
                  <StatusChip status={c.status} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Label size={10}>{d.name}</Label>
                  {c.season && <span style={{ fontSize: 11, color: C.tmut }}>· {c.season}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'stretch', background: C.ink, border: `1px solid ${C.line}`, borderRadius: 11, overflow: 'hidden' }}>
                  {c.prize > 0 && (
                    <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderLeft: `1px solid ${C.line}` }}>
                      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3 }}><Num size={17} color={C.gold}>{c.prize}M</Num></span>
                      <span style={{ fontSize: 9.5, color: C.tmut }}>تومان جایزه</span>
                    </div>
                  )}
                  <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderLeft: `1px solid ${C.line}` }}>
                    <Num size={17}>{cap || c.teams}</Num>
                    <span style={{ fontSize: 9.5, color: C.tmut }}>ظرفیت</span>
                  </div>
                  <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.tbody, textAlign: 'center' }}>{c.format || '—'}</span>
                    <span style={{ fontSize: 9.5, color: C.tmut }}>فرمت</span>
                  </div>
                </div>
                {cap > 0 && (
                  <div style={{ height: 5, borderRadius: 999, background: C.ink, overflow: 'hidden', marginTop: 10 }}>
                    <div style={{ height: '100%', width: `${Math.round(filled * 100)}%`, background: C.accent, borderRadius: 999 }} />
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
