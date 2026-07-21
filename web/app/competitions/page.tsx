import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { allEvents, allCompetitions, getUserById, registrationsForUser, type Event } from '@/lib/store'
import { C, EmptyState } from '@/components/ui'
import { DisciplineCard, CompetitionCard } from './cards'

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

  return (
    <div className="animate-fade-up" style={{ padding: '16px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: C.thi }}>مسابقات</span>
        <span style={{ fontSize: 12.5, color: C.tmut }}><span className="gl-num">{total}</span> رویداد</span>
      </div>

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
                coverDisc={evs[0]?.disc} discCount={evs.length} prizeSum={prizeSum} status={compStatus(evs)} />
            )
          })}
          {standalone.map(e => <DisciplineCard key={e.id} ev={e} reg={regByComp.get(e.id)} />)}
        </div>
      )}
    </div>
  )
}
