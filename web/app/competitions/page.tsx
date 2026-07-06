import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { allEvents, getUserById, registrationsForUser } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import { C, Num, Label, StatusChip, EmptyState, GameBadge } from '@/components/ui'

export const dynamic = 'force-dynamic'

// registration state → how the card announces it
const REG_STATE: Record<string, { label: string; c: string; s: string }> = {
  approved: { label: 'ثبت‌نامت تاییده', c: C.win, s: C.winSoft },
  pending:  { label: 'در انتظار تایید', c: C.gold, s: C.goldSoft },
  rejected: { label: 'ثبت‌نام رد شد', c: C.live, s: C.liveSoft },
}

export default async function CompetitionsPage() {
  const events = allEvents()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const regs = uid && getUserById(uid) ? registrationsForUser(uid) : []
  const regByComp = new Map(regs.map(r => [r.compId, r]))

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
            const reg = regByComp.get(c.id)
            const rs = reg ? REG_STATE[reg.status] : null
            return (
              <Link key={c.id} href={`/competitions/${c.id}`} style={{ all: 'unset', cursor: 'pointer', position: 'relative', display: 'block', background: C.sf1, border: `1px solid ${rs ? rs.c + '55' : C.line}`, borderRadius: 14, padding: 15, overflow: 'hidden' }}>
                {/* accent stripe when the viewer is in this competition */}
                {rs && <span style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 4, background: rs.c }} />}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <GameBadge disc={c.disc} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <Label size={9.5}>{d.name}</Label>
                      {c.date && <span style={{ fontSize: 10.5, color: C.tmut }}>· {c.date}</span>}
                    </div>
                  </div>
                  <StatusChip status={c.status} />
                </div>

                {/* registration state — the thing the user could never see before */}
                {rs && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: rs.s, border: `1px solid ${rs.c}55`, borderRadius: 8, padding: '5px 10px', marginBottom: 11 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: rs.c }} />
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: rs.c }}>{rs.label}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'stretch', background: C.ink, border: `1px solid ${C.line}`, borderRadius: 11, overflow: 'hidden' }}>
                  {c.prize > 0 && (
                    <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderLeft: `1px solid ${C.line}` }}>
                      <Num size={17} color={C.gold}>{c.prize}M</Num>
                      <span style={{ fontSize: 9.5, color: C.tmut }}>تومان جایزه</span>
                    </div>
                  )}
                  <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderLeft: `1px solid ${C.line}` }}>
                    <Num size={17}>{cap || c.teams}</Num>
                    <span style={{ fontSize: 9.5, color: C.tmut }}>ظرفیت</span>
                  </div>
                  <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: C.tbody, textAlign: 'center' }}>{c.format || '—'}</span>
                    <span style={{ fontSize: 9.5, color: C.tmut }}>فرمت</span>
                  </div>
                </div>

                {cap > 0 && !reg && c.status === 'open' && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 5, borderRadius: 999, background: C.ink, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round(filled * 100)}%`, background: C.accent, borderRadius: 999 }} />
                    </div>
                    <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, marginTop: 7 }}>برای ثبت‌نام بزن ›</div>
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
