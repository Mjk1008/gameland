import { notFound } from 'next/navigation'
import { getUserByTag, allEvents, placementsForUser, allUsers, allPlacements } from '@/lib/store'
import { pointsForPlacement } from '@/lib/ranking'
import type { EventTier } from '@/lib/schema'
import { DISC } from '@/lib/mock-data'
import { C, DISP, Num, BackHeader, EmptyState, DISC_DOT } from '@/components/ui'

export const dynamic = 'force-dynamic'

const TIER_LABEL: Record<string, string> = { S: 'ماژور', A: 'گیم‌لند', B: 'آل‌استار', C: 'محلی' }

export default function PlayerPage({ params }: { params: { id: string } }) {
  const u = getUserByTag(params.id)
  if (!u || u.role === 'admin') return notFound()

  const disc = u.primaryDisc ? DISC[u.primaryDisc as keyof typeof DISC] : null

  const gamers = allUsers().filter(x => x.role === 'gamer')
  const events = allEvents()
  const eventMap = new Map(events.map(e => [e.id, e]))
  const pointsAcc = new Map<string, number>()
  for (const pl of allPlacements()) {
    const ev = eventMap.get(pl.compId)
    if (!ev) continue
    pointsAcc.set(pl.userId, (pointsAcc.get(pl.userId) ?? 0) + pointsForPlacement(pl.rank, (ev.tier ?? 'A') as EventTier))
  }
  const sorted = [...gamers].sort((a, b) => (pointsAcc.get(b.id) ?? 0) - (pointsAcc.get(a.id) ?? 0))
  const rank = sorted.findIndex(x => x.id === u.id) + 1
  const myPlacements = placementsForUser(u.id)
  const points = pointsAcc.get(u.id) ?? 0
  const top3 = rank >= 1 && rank <= 3

  return (
    <div className="animate-fade-up">
      <BackHeader title="پروفایل گیمر" href="/players" />

      <div style={{ padding: '20px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 84, height: 84, borderRadius: 22, background: C.line, border: `1px solid ${C.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 38, color: top3 ? C.gold : C.accent }}>{u.tag[0]?.toUpperCase()}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.thi }}>{u.name}</div>
            <div dir="ltr" style={{ fontFamily: DISP, fontSize: 12, color: C.tmut, marginTop: 3 }}>@{u.tag} · {u.city}</div>
          </div>
          {disc && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: C.thi, background: C.sf2, border: `1px solid ${C.line}`, padding: '6px 13px', borderRadius: 999 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: DISC_DOT[u.primaryDisc!] ?? C.tmut }} />{disc.name}
            </span>
          )}
        </div>

        {/* Rank lower-third */}
        <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.sf1, border: `1px solid ${top3 ? C.gold + '55' : C.line}`, borderRadius: 14, padding: '16px 18px' }}>
          <span style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 4, background: top3 ? C.gold : C.accent }} />
          <div>
            <div style={{ fontSize: 12, color: C.tbody }}>رتبهٔ ملی</div>
            <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>از میان {gamers.length} گیمر</div>
          </div>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span className="gl-num" style={{ fontSize: 18, fontWeight: 800, color: top3 ? C.gold : C.accent }}>#</span>
            <Num size={46} color={top3 ? C.gold : C.accent}>{rank || '—'}</Num>
          </span>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { val: points.toLocaleString('en-US'), label: 'امتیاز', color: C.accent },
            { val: myPlacements.length.toString(), label: 'مسابقه', color: C.thi },
            { val: myPlacements.filter(p => p.rank === 1).length.toString(), label: 'قهرمانی', color: C.gold },
          ].map((s, i) => (
            <div key={i} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
              <Num size={22} color={s.color}>{s.val}</Num>
              <span style={{ fontSize: 10, color: C.tmut }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Hall of Fame */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.thi }}>صفحهٔ افتخارات</span>
          {myPlacements.length === 0 ? (
            <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}>
              <EmptyState text="هنوز توی مسابقه‌ای شرکت نکرده." />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {myPlacements.sort((a, b) => a.rank - b.rank).map((pl, i) => {
                const ev = eventMap.get(pl.compId)
                const col = pl.rank <= 3 ? C.gold : C.tbody
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, border: `1px solid ${col}`, background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Num size={18} color={col}>{pl.rank}</Num>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: C.thi }}>{ev?.title ?? pl.compId}</div>
                      <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>مقام {pl.rank}{ev ? ` · ${TIER_LABEL[ev.tier] ?? ev.tier}` : ''}{ev?.season ? ` · ${ev.season}` : ''}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
