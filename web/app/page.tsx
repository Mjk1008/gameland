import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { allUsers, allEvents, allPlacements, getUserById, registrationsForUser, activePromos, activeNews, allCompetitions, hasAvatar, activityPointsOf, eventsForCompetition, resolveCompetitionCardCover, resolveEventCardCover, type Event } from '@/lib/store'
import { challengePointsOf } from '@/lib/arena'
import { playerCard } from '@/lib/player-cards'
import { pointsForPlacement } from '@/lib/ranking'
import type { EventTier } from '@/lib/schema'
import { DISC } from '@/lib/mock-data'
import { C, DISP, Num, Label, Wordmark, Button, EmptyState, GAME_POSTER, DISC_DOT, GamerAvatar } from '@/components/ui'
import PromoSlider from './promo-slider'
import NewsSlider from './news-slider'
import { CompetitionCard, DisciplineCard } from './competitions/cards'
import { EnamadSeal } from '@/components/EnamadSeal'
import HonorPoster from '@/components/HonorPoster'

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
  // admin-set base + live activity points — same formula as the leaderboard
  for (const g of gamers) pointsAcc.set(g.id, (g.bonusPoints ?? 0) + activityPointsOf(g) + challengePointsOf(g.id))
  for (const pl of placements) {
    const ev = eventMap.get(pl.compId)
    if (!ev) continue
    pointsAcc.set(pl.userId, (pointsAcc.get(pl.userId) ?? 0) + pointsForPlacement(pl.rank, (ev.tier ?? 'A') as EventTier))
  }

  const ranked = [...gamers]
    .sort((a, b) => (pointsAcc.get(b.id) ?? 0) - (pointsAcc.get(a.id) ?? 0))
    .map((u, i) => ({ rank: i + 1, id: u.id, name: u.name, tag: u.tag, city: u.city, disc: u.primaryDisc, points: pointsAcc.get(u.id) ?? 0, hasPhoto: hasAvatar(u.id), card: playerCard(u.tag) }))

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
  // nearest rival — the player one step above (the chase is the excitement)
  const rival = myEntry && myEntry.rank > 1 ? ranked[myEntry.rank - 2] : null
  const myRegs = uid ? registrationsForUser(uid).length : 0
  const rankedCount = ranked.length

  // "today on Gameland" — live pulse derived from existing data (7-day window)
  const weekAgo = Date.now() - 7 * 86400000
  const newGamersWeek = gamers.filter(g => g.createdAt >= weekAgo).length
  const nextDeadline = events
    .filter(e => e.status === 'open' && e.regDeadline && e.regDeadline > Date.now())
    .sort((a, b) => (a.regDeadline ?? 0) - (b.regDeadline ?? 0))[0]
  const deadlineDays = nextDeadline ? Math.max(1, Math.ceil(((nextDeadline.regDeadline ?? 0) - Date.now()) / 86400000)) : null

  // news slides — covers served via /api/news-image (same anti-bloat rule as promos)
  const newsSlides = activeNews().slice(0, 5).map(n => ({
    id: n.id, title: n.title, body: n.body, tags: n.tags, at: n.createdAt,
    cover: n.imageData.startsWith('data:') ? `/api/news-image/${n.id}` : n.imageData,
  }))

  // Home slider — admin-managed slides (image + optional link). Fall back to the
  // bundled game posters when the admin hasn't added any yet.
  // base64 slides are served via /api/promo/[id] (cached) — inlining them made
  // the home HTML ~7MB and the app feel broken on mobile connections
  const promos = activePromos()
  const slides = promos.length
    ? promos.map(p => ({
        src: p.imageData.startsWith('data:') ? `/api/promo/${p.id}` : p.imageData,
        href: p.linkType === 'event' && p.eventId ? `/competitions/${p.eventId}`
            : p.linkType === 'url' && p.url ? p.url
            : undefined,
      }))
    : [GAME_POSTER.efootball, GAME_POSTER.fc26, GAME_POSTER.pes21, GAME_POSTER.ufc6, GAME_POSTER.nba2k26].map(src => ({ src }))

  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Header — compact brand lockup, sticky so the shell stays put while content scrolls */}
      <div style={{ position: 'sticky', top: 'env(safe-area-inset-top, 0px)', zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '-14px -16px 0', padding: '14px 16px 10px', background: 'rgba(20,17,13,.92)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${C.line}` }}>
        <Wordmark size={17} />
        <span className="gl-label" style={{ fontSize: 11, color: C.tbody, display: 'inline-flex', alignItems: 'center', gap: 6, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 999, padding: '6px 11px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.win }} />LIVE
        </span>
      </div>

      {/* Honorary arcade poster — server-rendered null for everyone whose phone
          isn't in HONOR_USER_PHONE, so nobody else even receives the markup */}
      <HonorPoster />

      {/* Promo slider — admin-managed posters, each optionally linking to a competition or URL */}
      <PromoSlider slides={slides} />

      {/* Today on Gameland — live pulse, changes every day so there's always something new */}
      {(newGamersWeek > 0 || deadlineDays) && (
        <div className="gl-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '-6px -16px', padding: '0 16px 2px' }}>
          {deadlineDays && nextDeadline && (
            <Link href={`/competitions/${nextDeadline.id}`} style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7, background: C.goldSoft, border: `1px solid ${C.gold}55`, borderRadius: 999, padding: '7px 13px', fontSize: 11.5, fontWeight: 700, color: C.gold }}>
              ⏳ <span className="gl-num">{deadlineDays}</span> روز تا بستنِ ثبت‌نامِ {DISC[nextDeadline.disc]?.short ?? ''}
            </Link>
          )}
          {newGamersWeek > 0 && (
            <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 999, padding: '7px 13px', fontSize: 11.5, fontWeight: 700, color: C.tbody }}>
              🎮 <span className="gl-num" style={{ color: C.win }}>{newGamersWeek}</span> گیمرِ جدید این هفته
            </span>
          )}
        </div>
      )}

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
          {rival && myEntry && rival.points > myEntry.points && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '9px 12px', fontSize: 11.5, color: C.tbody }}>
              <span style={{ fontSize: 13 }}>🎯</span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <b style={{ color: C.thi }}>{rival.name}</b> فقط <b className="gl-num" style={{ color: C.accent }}>{(rival.points - myEntry.points).toLocaleString('en-US')}</b> امتیاز ازت جلوئه — بزنش!
              </span>
            </div>
          )}
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

      {/* Gameland News — admin-managed slider; tapping a card opens the story modal */}
      {newsSlides.length > 0 && <NewsSlider items={newsSlides} />}
      {newsSlides.length === 0 && me?.role === 'admin' && (
        <Link href="/admin/news" style={{ all: 'unset', cursor: 'pointer', display: 'block', border: `1.5px dashed ${C.line2}`, borderRadius: 14, padding: '16px 15px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>📰 اسلایدرِ خبری اینجا میاد</div>
          <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 4 }}>فقط تو (ادمین) اینو می‌بینی — اولین خبر رو منتشر کن ›</div>
        </Link>
      )}

      {/* Active competitions      {/* Active competitions — promoter cards */}
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
                  coverSrc={resolveCompetitionCardCover(c.id)}
                  coverDisc={eventsForCompetition(c.id)[0]?.disc} discCount={evs.length} prizeSum={evs.reduce((s, e) => s + (e.prize || 0), 0)} status={motherStatus(evs)} />
              )
            })}
            {activeStandalone.map(e => <DisciplineCard key={e.id} ev={e} coverSrc={resolveEventCardCover(e.id, e.disc)} />)}
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
                <span className="gl-num" style={{ fontWeight: 800, fontSize: 20, color: p.rank === 1 ? C.accent : p.rank <= 3 ? C.gold : C.tmut, width: 22, textAlign: 'center' }}>{p.rank}</span>
                <GamerAvatar uid={p.id} tag={p.tag} hasPhoto={p.hasPhoto} card={p.card} size={48} ring={p.rank <= 3 ? C.gold + '88' : undefined} />
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
