import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, matchesForComp, getUserById, getEventConfig, getTeam, currentTeamMembers, teamForUser, getRegistration } from '@/lib/store'
import { attemptsForComp, entryIndexForComp } from '@/lib/bracket-dto'
import { bracketModeOf, entryCapFor, notStartedBracketsForUser } from '@/lib/bracket'
import { prelimVenueForGroupKey } from '@/lib/prelim-venue'
import { C, BackHeader } from '@/components/ui'
import BracketView, { type MatchDTO, type Player } from './BracketView'
import ReentryBuy from './ReentryBuy'

export const dynamic = 'force-dynamic'

export default async function BracketPage({ params }: { params: { id: string } }) {
  const c = getEvent(params.id)
  if (!c) return notFound()

  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const role = (session as any)?.role
  const isAdmin = role === 'admin' || role === 'organizer'
  const isTeamEvent = getEventConfig(c.id).teamSize === 2
  const cfg = getEventConfig(c.id)
  const venueLabels: Record<string, string> = {}
  if (cfg.prelimVenues) {
    for (const gk of Object.keys(cfg.prelimVenues)) {
      const d = prelimVenueForGroupKey(cfg.prelimVenues, gk)
      if (d) venueLabels[gk] = d.name + (d.address ? ` · ${d.address}` : '')
    }
  }
  // For a team event, "my matches" must compare against my TEAM's id, not my
  // own uid, since p1/p2 on a team match carry team ids — every uid===meUid
  // comparison inside BracketView stays untouched this way (docs/27 §6.2:
  // "pass meSeatId... one prop, client comparison logic untouched").
  const meUid = isTeamEvent
    ? (uid ? teamForUser(uid, c.id)?.id : undefined)
    : uid

  const real = matchesForComp(c.id)
  const drawn = real.length > 0
  const attemptsMap = isTeamEvent ? new Map<string, number>() : attemptsForComp(c.id)
  const entryMap = isTeamEvent ? new Map<string, number>() : entryIndexForComp(c.id)

  const player = (uid?: string, matchId?: string, side?: 1 | 2): Player => {
    if (!uid) return null
    const u = getUserById(uid)
    if (!u) return null
    return {
      uid: u.id, tag: u.tag, name: u.name,
      attempts: attemptsMap.get(u.id),
      entry: matchId && side ? entryMap.get(`${matchId}:${side}`) : undefined,
    }
  }
  // Team side of a match resolves to a synthetic Player: uid = team id (so
  // meUid comparisons work verbatim), name = "@a + @b" (docs/27 §6.2).
  const teamPlayer = (teamId?: string): Player => {
    if (!teamId) return null
    const t = getTeam(teamId)
    if (!t) return null
    const tags = currentTeamMembers(teamId).map(m => getUserById(m.userId)?.tag).filter(Boolean)
    return { uid: t.id, tag: t.name, name: tags.length ? `@${tags.join(' + @')}` : t.name }
  }

  if (drawn) {
    const dto: MatchDTO[] = real.map(m => ({
      id: m.id, stage: m.stage, groupKey: m.groupKey, bracket: m.bracket, round: m.round, slot: m.slot,
      p1: isTeamEvent ? teamPlayer(m.p1TeamId) : player(m.p1UserId, m.id, 1),
      p2: isTeamEvent ? teamPlayer(m.p2TeamId) : player(m.p2UserId, m.id, 2),
      winnerUid: isTeamEvent ? m.winnerTeamId : m.winnerUserId, score: m.score, status: m.status,
    }))
    // re-entry offer (prelims only): viewer has an approved reg, سهم budget left, and a not-started bracket
    let reentryMax = 0
    if (!isTeamEvent && uid && bracketModeOf(c.id) === 'prelims') {
      const myReg = getRegistration(uid, c.id)
      if (myReg?.status === 'approved') {
        reentryMax = Math.max(0, Math.min(entryCapFor(c.id) - myReg.attempts, notStartedBracketsForUser(c.id, uid)))
      }
    }
    return (
      <div className="animate-fade-up">
        <BackHeader title={`براکت — ${c.title}`} href={`/competitions/${c.id}`} />
        <div style={{ padding: '14px 16px 28px' }}>
          {reentryMax > 0 && <ReentryBuy compId={c.id} max={reentryMax} />}
          <BracketView matches={dto} meUid={meUid} isAdmin={isAdmin} compId={c.id} venueLabels={venueLabels} schedules={cfg.bracketSchedule} />
        </div>
      </div>
    )
  }

  // Not drawn yet — simple preview.
  return (
    <div className="animate-fade-up">
      <BackHeader title={`براکت — ${c.title}`} href={`/competitions/${c.id}`} />
      <div style={{ padding: '14px 16px 28px' }}>
        <div style={{ fontSize: 12.5, color: C.tbody, padding: '12px 14px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12 }}>
          هنوز قرعه‌کشی نشده.
        </div>
      </div>
    </div>
  )
}
