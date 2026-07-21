import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { allUsers, allEvents, allPlacements, getUserById, registrationsForUser, activePromos, allCompetitions, type Event } from '@/lib/store'
import { pointsForPlacement } from '@/lib/ranking'
import type { EventTier } from '@/lib/schema'
import { DISC } from '@/lib/mock-data'
import { C, DISP, Num, Label, Wordmark, Button, EmptyState, GAME_POSTER, DISC_DOT } from '@/components/ui'
import PromoSlider from './promo-slider'
import { CompetitionCard, DisciplineCard } from './competitions/cards'
import { EnamadSeal } from '@/components/EnamadSeal'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const signedIn = !!uid

  const gamers = allUsers().filter(u => u.role === 'gamer')
  const events = allEvents()
  const placements = allPlacements()
  const eventMap = new Map(events.map(e => [e.id, e]))

  const pointsAcc = new Map<string, number>()
  for (const g of gamers) pointsAcc.set(g.id, g.bonusPoints ?? 0)   // admin-set base points
  for (const pl of placements) {
    const ev = eventMap.get(pl.compId)
    if (!ev) continue
    pointsAcc.set(pl.userId, (pointsAcc.get(pl.userId) ?? 0) + pointsForPlacement(pl.rank, (ev.tier ?? 'A') as EventTier))
  }

  const ranked = [...gamers]
    .sort((a, b) => (pointsAcc.get(b.id) ?? 0) - (pointsAcc.get(a.id) ?? 0))
    .map((u, i) => ({ rank: i + 1, id: u.id, name: u.name, tag: u.tag, city: u.city, disc: u.primaryDisc, points: pointsAcc.get(u.id) ?? 0 }))

  const champ = ranked[0]
  const top = ranked.slice(0, 3)

  // group into mother competitions (رویداد) + standalone events for the home cards
  const ACTIVE = new Set(['live', 'open', 'soon'])
  const compsAll = allCompetitions()
  const compIds = new Set(compsAll.map(c => c.id))
  const byComp = new Map<string, Event[]>()
  const standalone: Event[] = []
  for (const e of events) {
    if (e.competitionId && compIds.has(e.competitionId)) { const a = byComp.get(e.competitionId) ?? []; a.push(e); byComp.set(e.competitionId, a) }
    else standalone.push(e)
  }
  const activeMothers = compsAll.filter(c => (byComp.get(c.id) ?? []).some(e => ACTIVE.has(e.status))).slice(0, 3)
  const activeStandalone = standalone.filter(e => ACTIVE.has(e.status)).slice(0, 2)
  const homeCount = activeMothers.length + activeStandalone.length
  const motherStatus = (evs: Event[]) => evs.some(e => e.status === 'live') ? 'live' : evs.some(e => e.status === 'open') ? 'open' : 'soon'

  // the signed-in gamer's own overview (rank, points, competitions entered)
  const me = uid ? getUserById(uid) : null
  const myEntry = me ? ranked.find(r => r.id === me.id) : null
  const myRegs = uid ? registrationsForUser(uid).length : 0
  const rankedCount = ranked.length

  // Home slider — admin-managed slides (image + optional link). Fall back to the
  // bundled game posters when the admin hasn't added any yet.
  const promos = activePromos()
  const slides = promos.length
    ? promos.map(p => ({
        src: p.imageData,
        href: p.linkType === 'event' && p.eventId ? `/competitions/${p.eventId}`
            : p.linkType === 'url' && p.url ? p.url
            : undefined,
      }))
    : [GAME_POSTER.efootball, GAME_POSTER.fc26, GAME_POSTER.pes21, GAME_POSTER.ufc6, GAME_POSTER.nba2k26].map(src => ({ src }))

  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Header — compact brand lockup (small logo + name side by side) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
        <Wordmark size={17} />
        <span className="gl-label" style={{ fontSize: 11, color: C.tbody, display: 'inline-flex', alignItems: 'center', gap: 6, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 999, padding: '6px 11px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.win }} />LIVE
        </span>
      </div>

      {/* Promo slider — admin-managed posters, each optionally linking to a competition or URL */}
      <PromoSlider slides={slides} />

      {/* Signed-in gamer's own overview card */}
      {signedIn && me && me.role === 'gamer' && (
        <Link href="/me" style={{ all: 'unset', cursor: 'pointer', display: 'block', position: 'relative', overflow: 'hidden', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 16, padding: '16px 18px' }} className="animate-fade-up">
          <span style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 4, background: C.accent }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 20, color: C.accent }}>{me.tag[0]?.toUpperCase()}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.thi }}>{me.name}</div>
              <div dir="ltr" style={{ fontFamily: DISP, fontSize: 12, color: C.tmut, marginTop: 2, textAlign: 'right' }}>@{me.tag}{me.city ? ` · ${me.city}` : ''}</div>
            </div>
            <span style={{ fontSize: 11.5, color: C.accent, fontWeight: 700 }}>پروفایل ›</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
            <MiniStat label="رتبهٔ ملی" value={myEntry && myEntry.points > 0 ? `#${myEntry.rank}` : '—'} sub={myEntry && myEntry.points > 0 ? `از ${rankedCount}` : 'بدون امتیاز'} color={C.accent} />
            <MiniStat label="امتیاز" value={(myEntry?.points ?? 0).toLocaleString('en-US')} color={C.gold} />
            <MiniStat label="مسابقات من" value={String(myRegs)} color={C.thi} />
          </div>
        </Link>
      )}

      {/* Guest banner */}
      {!signedIn && (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.thi }}>خانهٔ گیمرهای ایران</div>
            <div style={{ fontSize: 13, color: C.tbody, marginTop: 6, lineHeight: 1.8 }}>هر برد، یه پله بالاتر. رتبهٔ واقعی‌ت ثبت می‌شه و می‌مونه.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Button href="/login">ورود</Button>
            <Button href="/signup" kind="secondary">ثبت‌نام</Button>
          </div>
        </div>
      )}

      {/* Champion lower-third hero */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Label>National Ranking</Label>
          <span style={{ flex: 1, height: 1, background: C.line }} />
        </div>
        {champ ? (
          <div style={{ position: 'relative', overflow: 'hidden', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 4, background: C.accent }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: C.goldSoft, border: `1px solid ${C.gold}`, color: C.gold, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}><span className="gl-num">#1</span> صدرنشین</span>
                {champ.disc && <span style={{ width: 8, height: 8, borderRadius: '50%', background: DISC_DOT[champ.disc] ?? C.tmut }} />}
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: C.thi, marginTop: 8 }}>{champ.name}</div>
              <div dir="ltr" style={{ fontFamily: DISP, fontSize: 12, color: C.tmut, marginTop: 2, textAlign: 'right' }}>@{champ.tag} · {champ.city}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Num size={44} color={C.accent}>{champ.points.toLocaleString('en-US')}</Num>
              <div><Label size={10}>Points</Label></div>
            </div>
          </div>
        ) : (
          <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}>
            <EmptyState text="رنکینگ ملی بعد از اولین مسابقه فعال می‌شه" />
          </div>
        )}
      </div>

      {/* Active competitions — promoter cards */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 19, fontWeight: 700, color: C.thi }}>مسابقات فعال</span>
          <Link href="/competitions" style={{ fontSize: 12.5, color: C.accent, textDecoration: 'none' }}>همه ›</Link>
        </div>
        {homeCount === 0 ? (
          <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}><EmptyState text="هنوز مسابقه‌ای برگزار نمی‌شه — به‌زودی اولین‌ها می‌رسن." /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {activeMothers.map(c => {
              const evs = byComp.get(c.id) ?? []
              return (
                <CompetitionCard key={c.id} href={`/competitions/e/${c.id}`} title={c.title}
                  sub={[c.location, c.date].filter(Boolean).join(' · ') || undefined}
                  coverDisc={evs[0]?.disc} discCount={evs.length} prizeSum={evs.reduce((s, e) => s + (e.prize || 0), 0)} status={motherStatus(evs)} />
              )
            })}
            {activeStandalone.map(e => <DisciplineCard key={e.id} ev={e} />)}
          </div>
        )}
      </div>

      {/* Leaderboard peek */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 19, fontWeight: 700, color: C.thi }}>برترین گیمرها</span>
          <Link href="/leaderboard" style={{ fontSize: 12.5, color: C.accent, textDecoration: 'none' }}>رنکینگ کامل ›</Link>
        </div>
        {top.length === 0 ? (
          <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}><EmptyState text="هنوز گیمری ثبت‌نام نکرده — اولین نفر باش." /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {top.map(p => (
              <Link key={p.tag} href={`/players/${p.tag.toLowerCase()}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 13, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 13px' }}>
                <span className="gl-num" style={{ fontWeight: 800, fontSize: 26, color: p.rank === 1 ? C.accent : C.tbody, width: 30, textAlign: 'center' }}>{p.rank}</span>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: C.line, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: C.thi }}>{p.tag[0]?.toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.thi }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: DISC_DOT[p.disc ?? ''] ?? C.tmut }} />
                    <span style={{ fontSize: 11, color: C.tmut }}>{p.disc ? DISC[p.disc as keyof typeof DISC]?.name : p.city}</span>
                  </div>
                </div>
                <Num size={20}>{p.points.toLocaleString('en-US')}</Num>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 4, paddingTop: 14, borderTop: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 12, color: C.tmut }}>
          <Link href="/about" style={{ color: C.tmut, textDecoration: 'none' }}>درباره</Link>
          <span>·</span>
          <Link href="/rules" style={{ color: C.tmut, textDecoration: 'none' }}>قوانین</Link>
        </div>
        <EnamadSeal size={84} />
      </div>
    </div>
  )
}

function MiniStat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: C.ink, border: `1px solid ${C.line}`, borderRadius: 11, padding: '10px 8px', textAlign: 'center' }}>
      <div className="gl-num" style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.tbody, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.tmut, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}
