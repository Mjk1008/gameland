import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DISC, prizeBreakdown } from '@/lib/mock-data'
import { getRegistration, getEvent, placementsForComp, getUserById, matchesForComp, getEventConfig } from '@/lib/store'
import { rulesForDisc } from '@/lib/discipline-rules'
import { C, DISP, Num, StatusChip, BackHeader, Button, GameBadge } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default async function CompetitionPage({ params }: { params: { id: string } }) {
  const c = getEvent(params.id)
  if (!c) return notFound()

  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const reg = uid ? getRegistration(uid, params.id) : undefined

  const allMatches = matchesForComp(params.id)
  const drawn = allMatches.length > 0
  const prelimMatches = allMatches.filter(m => m.stage === 'prelim')
  const finalMatches = allMatches.filter(m => m.stage === 'final')
  const prelimGroups = Array.from(new Set(prelimMatches.map(m => m.groupKey)))
  const finalSize = c.finalSize ?? 128
  const myMatch = uid ? allMatches.find(m => m.p1UserId === uid || m.p2UserId === uid) : undefined
  const myGroupLabel = myMatch && myMatch.stage === 'prelim' ? (myMatch.groupKey.split(':')[1] || myMatch.groupKey) : undefined

  const disc = DISC[c.disc as keyof typeof DISC] ?? { name: c.disc, short: c.disc.slice(0, 4).toUpperCase(), color: C.tmut }
  const customSplit = getEventConfig(params.id).prizeSplit ?? []
  const prizeRows = customSplit.length
    ? customSplit.map((amt, i) => ({ place: (i + 1).toLocaleString('fa-IR'), amount: amt.toLocaleString('fa-IR') + ' ت' }))
    : prizeBreakdown(c.prize).map(b => ({ place: b.place, amount: b.amount }))
  const discRules = rulesForDisc(c.disc)

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

          {/* Bracket — always discoverable; the page itself explains the pre-draw state */}
          <Link href={`/competitions/${c.id}/bracket`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 48, background: C.sf1, border: `1px solid ${drawn ? C.accent : C.line}`, borderRadius: 12, color: drawn ? C.accent : C.tbody, fontWeight: 700, fontSize: 13.5 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v6a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v6M6 21v-6"/><circle cx="6" cy="3" r="1"/><circle cx="6" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg>
            {drawn ? 'جدول و براکت مسابقه ›' : 'جدول مسابقه (بعد از قرعه‌کشی)'}
          </Link>
        </div>

        {/* Prize pool */}
        {(c.prize > 0 || prizeRows.length > 0) && (
          <div style={{ background: C.sf1, border: `1px solid ${C.gold}44`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>جایزهٔ کل</span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}><Num size={30} color={C.gold}>{c.prize}M</Num><span style={{ fontSize: 12, color: C.tbody }}>تومان</span></span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {prizeRows.map(b => (
                <div key={b.place} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span className="gl-num" style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: C.gold, flexShrink: 0 }}>{b.place}</span>
                  <span style={{ flex: 1, fontSize: 12, color: C.tbody }}>مقام {b.place}</span>
                  <Num size={15}>{b.amount}</Num>
                </div>
              ))}
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

        {/* Discipline rules (organizer-defined, per game) */}
        {discRules && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <GameBadge disc={c.disc} size={24} />
              <span style={{ fontSize: 15, fontWeight: 700, color: C.thi }}>قوانین رشته · {discRules.title}</span>
            </div>
            <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: '6px 15px' }}>
              {discRules.rules.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 0', borderBottom: i < discRules.rules.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.accent, marginTop: 8, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: C.tbody, lineHeight: 1.8 }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Structure & the player's path (مقدماتی → فینال) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.thi }}>مراحل مسابقه و مسیرِ تو</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              {
                title: 'مرحلهٔ مقدماتی',
                sub: drawn
                  ? (prelimGroups.length ? `${prelimGroups.length.toLocaleString('fa-IR')} گروهِ شهری · تا ۶ براکت` : 'بدونِ مقدماتی — مستقیم به فینال')
                  : 'گروه‌بندیِ شهری · بعد از قرعه‌کشی',
                mine: myMatch?.stage === 'prelim' ? `تو در گروهِ «${myGroupLabel}»‌ای` : null,
                on: !drawn || prelimGroups.length > 0,
              },
              {
                title: `فینالِ ${finalSize.toLocaleString('fa-IR')} نفره`,
                sub: drawn ? (finalMatches.length ? 'براکتِ نهایی فعاله' : 'بعد از تکمیلِ مقدماتی') : `${finalSize.toLocaleString('fa-IR')} نفرِ برتر`,
                mine: myMatch?.stage === 'final' ? 'به فینال رسیدی 🎉' : null,
                on: true,
              },
            ].map((s, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: 13, minHeight: 56 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
                  <div style={{ width: 15, height: 15, borderRadius: '50%', background: s.mine ? C.accent : C.sf1, border: `2px solid ${s.on ? C.accent : C.line}`, marginTop: 4, flexShrink: 0 }} />
                  {i < arr.length - 1 && <div style={{ flex: 1, width: 2, background: C.line }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 13, minWidth: 0 }}>
                  <div style={{ background: C.sf1, border: `1px solid ${s.mine ? C.accent : C.line}`, borderRadius: 12, padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: s.on ? C.thi : C.tmut }}>{s.title}</span>
                      {s.mine && <span style={{ fontSize: 10.5, fontWeight: 700, color: C.accent, background: C.accentSoft, borderRadius: 999, padding: '3px 9px', flexShrink: 0 }}>{s.mine}</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 4 }}>{s.sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {drawn ? (
            <Link href={`/competitions/${c.id}/bracket`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 48, background: C.accentSoft, border: `1px solid ${C.accent}`, borderRadius: 12, color: C.accent, fontWeight: 700, fontSize: 13.5 }}>
              جدولِ کامل، مسیرِ من و بقیهٔ گیمرها ›
            </Link>
          ) : (
            <div style={{ fontSize: 12, color: C.tbody, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '11px 14px', lineHeight: 1.9 }}>
              بعد از بسته‌شدنِ ثبت‌نام و قرعه‌کشیِ ادمین، جدولِ کامل اینجا باز می‌شه — مسیرِ خودت و همهٔ حریف‌ها رو می‌بینی.
            </div>
          )}
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
