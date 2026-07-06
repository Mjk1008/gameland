import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DISC, prizeBreakdown, roadmapStages } from '@/lib/mock-data'
import { getRegistration, getEvent, placementsForComp, getUserById } from '@/lib/store'
import { C, DISP, Num, StatusChip, BackHeader, Button, GameBadge } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default async function CompetitionPage({ params }: { params: { id: string } }) {
  const c = getEvent(params.id)
  if (!c) return notFound()

  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const reg = uid ? getRegistration(uid, params.id) : undefined

  const disc = DISC[c.disc as keyof typeof DISC] ?? { name: c.disc, short: c.disc.slice(0, 4).toUpperCase(), color: C.tmut }
  const breakdown = prizeBreakdown(c.prize)
  const roadmap = roadmapStages(c.status)

  const compPlacements = placementsForComp(params.id)
    .sort((a, b) => a.rank - b.rank).slice(0, 4)
    .map(pl => { const u = getUserById(pl.userId); return u ? { rank: pl.rank, name: u.name, tag: u.tag, city: u.city } : null })
    .filter(Boolean) as { rank: number; name: string; tag: string; city: string }[]

  return (
    <div className="animate-fade-up">
      <BackHeader title="جزئیات مسابقه" href="/competitions" />

      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <GameBadge disc={c.disc} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.thi }}>{c.title}</div>
              <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 3 }}>{disc.name}{c.season ? ` · ${c.season}` : ''}</div>
            </div>
            <StatusChip status={c.status} />
          </div>
          {c.date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 15px' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.tmut} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
              <span style={{ fontSize: 13, color: C.tbody }}>{c.date}</span>
            </div>
          )}
          {c.status !== 'done' && (
            reg
              ? <Button href={`/competitions/${c.id}/me`} kind="prestige">مسیر من ({reg.attempts} بلیط) ›</Button>
              : <Button href={uid ? `/competitions/${c.id}/register` : `/login?callbackUrl=/competitions/${c.id}/register`}>{uid ? 'ثبت‌نام در این مسابقه' : 'برای ثبت‌نام وارد شو'}</Button>
          )}
        </div>

        {/* Prize pool */}
        {c.prize > 0 && (
          <div style={{ background: C.sf1, border: `1px solid ${C.gold}44`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>جایزهٔ کل</span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}><Num size={30} color={C.gold}>{c.prize}M</Num><span style={{ fontSize: 12, color: C.tbody }}>تومان</span></span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {breakdown.map(b => (
                <div key={b.place} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span className="gl-num" style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: C.gold, flexShrink: 0 }}>{b.place}</span>
                  <span style={{ flex: 1, fontSize: 12, color: C.tbody }}>مقام {b.place}</span>
                  <Num size={15}>{b.amount}</Num>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: '10px 12px', background: C.ink, borderRadius: 10, fontSize: 11, color: C.tmut }}>
              تأمین جایزه توسط حامیان · ثبت‌نام رایگان است
            </div>
          </div>
        )}

        {/* Format / capacity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14 }}>
            <span style={{ fontSize: 11, color: C.tmut }}>فرمت</span>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.thi, marginTop: 4 }}>{c.format || '—'}</div>
          </div>
          <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14 }}>
            <span style={{ fontSize: 11, color: C.tmut }}>ظرفیت</span>
            <div style={{ marginTop: 4 }}><Num size={16}>{c.maxPlayers ?? c.teams}</Num> <span style={{ fontSize: 12, color: C.tbody }}>نفر</span></div>
          </div>
        </div>

        {/* Roadmap */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.thi }}>مسیر بازیکن</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {roadmap.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 13, minHeight: 50 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: C.sf1, border: `2px solid ${C.accent}`, marginTop: 4 }} />
                  {i < roadmap.length - 1 && <div style={{ flex: 1, width: 2, background: C.line }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '11px 14px' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.thi }}>{r.stage}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.tmut }}>{r.label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Final results */}
        {compPlacements.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.thi }}>نتایج نهایی</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {compPlacements.map(p => (
                <Link key={p.rank} href={`/players/${p.tag.toLowerCase()}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '10px 13px' }}>
                  <Num size={20} color={p.rank <= 3 ? C.gold : C.tbody}>{p.rank}</Num>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: C.line, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: C.thi }}>{p.tag[0]?.toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.thi }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.tmut }}>{p.city}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
