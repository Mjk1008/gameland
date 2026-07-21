import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { allEvents, getUserById, registrationsForUser } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import { C, Num, StatusChip, EmptyState, GAME_POSTER, DISC_DOT } from '@/components/ui'

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
            const poster = GAME_POSTER[c.disc as keyof typeof GAME_POSTER]
            const discColor = DISC_DOT[c.disc] ?? C.accent
            return (
              <Link key={c.id} href={`/competitions/${c.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'block', borderRadius: 18, overflow: 'hidden', transform: 'translateZ(0)', border: `1px solid ${rs ? rs.c + '66' : 'rgba(246,239,228,.10)'}`, boxShadow: `0 10px 34px -18px rgba(0,0,0,.8)` }}>
                {/* full discipline poster — shown uncropped (it is a complete landscape design) */}
                {poster
                  ? <img src={poster} alt="" style={{ display: 'block', width: '100%', height: 'auto' }} />
                  : <div style={{ height: 6, background: discColor }} />}

                {/* info body */}
                <div style={{ background: 'linear-gradient(160deg, rgba(56,48,38,.92), rgba(24,20,15,.96))', padding: '13px 15px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: discColor }}>{d.name}</span>
                        {c.date && <span style={{ fontSize: 10.5, color: C.tmut }}>· {c.date}</span>}
                      </div>
                    </div>
                    <StatusChip status={c.status} />
                  </div>

                  {rs && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: rs.s, border: `1px solid ${rs.c}55`, borderRadius: 8, padding: '5px 10px', marginTop: 11 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: rs.c }} />
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: rs.c }}>{rs.label}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'stretch', marginTop: 12, background: 'rgba(20,17,13,.45)', border: `1px solid rgba(246,239,228,.07)`, borderRadius: 12, overflow: 'hidden' }}>
                    {c.prize > 0 && (
                      <div style={{ flex: 1, padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderInlineEnd: `1px solid rgba(246,239,228,.07)` }}>
                        <Num size={16} color={C.gold}>{c.prize}M</Num>
                        <span style={{ fontSize: 10, color: C.tmut }}>تومان جایزه</span>
                      </div>
                    )}
                    <div style={{ flex: 1, padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderInlineEnd: `1px solid rgba(246,239,228,.07)` }}>
                      <Num size={16}>{cap || c.teams}</Num>
                      <span style={{ fontSize: 10, color: C.tmut }}>ظرفیت</span>
                    </div>
                    <div style={{ flex: 1.4, padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.tbody, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{c.format || '—'}</span>
                      <span style={{ fontSize: 10, color: C.tmut }}>فرمت</span>
                    </div>
                  </div>

                  {cap > 0 && !reg && c.status === 'open' && (
                    <div style={{ marginTop: 11 }}>
                      <div style={{ height: 5, borderRadius: 999, background: 'rgba(20,17,13,.6)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round(filled * 100)}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.accentStrong})`, borderRadius: 999 }} />
                      </div>
                      <div style={{ fontSize: 10.5, color: C.accent, fontWeight: 700, marginTop: 7 }}>برای ثبت‌نام بزن ›</div>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
