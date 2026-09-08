import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { allEvents, allCompetitions, getUserById, registrationsForUser, eventsForCompetition, resolveCompetitionCardCover, resolveEventCardCover, isLeftoverOpen, matchesForComp, type Event } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import { C, EmptyState } from '@/components/ui'
import { DisciplineCard, CompetitionCard } from './cards'
import LeftoverEntryBox from './leftover-entry'

export const dynamic = 'force-dynamic'

// status priority for a mother competition (most-active discipline wins)
function compStatus(evs: Event[]): string {
  if (evs.some(e => e.status === 'live')) return 'live'
  if (evs.some(e => e.status === 'open')) return 'open'
  if (evs.some(e => e.status === 'soon')) return 'soon'
  return 'done'
}

export default async function CompetitionsPage() {
  const comps = allCompetitions()
  const events = allEvents()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const regs = uid && getUserById(uid) ? registrationsForUser(uid) : []
  const regByComp = new Map(regs.map(r => [r.compId, r]))

  const compIds = new Set(comps.map(c => c.id))
  const byComp = new Map<string, Event[]>()
  const standalone: Event[] = []
  for (const e of events) {
    if (e.competitionId && compIds.has(e.competitionId)) {
      const arr = byComp.get(e.competitionId) ?? []
      arr.push(e); byComp.set(e.competitionId, arr)
    } else standalone.push(e)
  }

  const total = comps.length + standalone.length
  const leftoverEvents = events
    .filter(e => isLeftoverOpen(e.id))
    .map(e => ({ id: e.id, disc: e.disc, label: DISC[e.disc as keyof typeof DISC]?.name ?? e.disc }))
  // Same درِ بازماندگان box, second tab: any رشته whose قرعه‌کشی already
  // happened (matchesForComp > 0 — the same drawn-check CLAUDE.md §3 uses
  // everywhere else), so people can jump straight to a bracket they know is
  // live without hunting through every competition card.
  const drawnEvents = events
    .filter(e => matchesForComp(e.id).length > 0)
    .map(e => ({ id: e.id, disc: e.disc, label: DISC[e.disc as keyof typeof DISC]?.name ?? e.disc }))

  return (
    <div className="animate-fade-up" style={{ padding: '16px 16px 28px' }}>
      <div style={{ position: 'sticky', top: 'env(safe-area-inset-top, 0px)', zIndex: 6, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '-16px -16px 16px', padding: '16px 16px 11px', background: 'rgba(20,17,13,.92)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${C.line}` }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: C.thi }}>مسابقات</span>
        <span style={{ fontSize: 12.5, color: C.tmut }}><span className="gl-num">{total}</span> رویداد</span>
      </div>

      <LeftoverEntryBox events={leftoverEvents} bracketEvents={drawnEvents} />

      {total === 0 ? (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}>
          <EmptyState text="هنوز مسابقه‌ای اعلام نشده — به‌زودی سر می‌رسه." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {comps.map(c => {
            const evs = byComp.get(c.id) ?? []
            const prizeSum = evs.reduce((s, e) => s + (e.prize || 0), 0)
            return (
              <CompetitionCard key={c.id} href={`/competitions/e/${c.id}`} title={c.title}
                sub={[c.location, c.date].filter(Boolean).join(' · ') || undefined}
                coverSrc={resolveCompetitionCardCover(c.id)}
                coverDisc={eventsForCompetition(c.id)[0]?.disc} discCount={evs.length} prizeSum={prizeSum} status={compStatus(evs)} />
            )
          })}
          {standalone.map(e => <DisciplineCard key={e.id} ev={e} reg={regByComp.get(e.id)} coverSrc={resolveEventCardCover(e.id, e.disc)} />)}
        </div>
      )}
    </div>
  )
}
