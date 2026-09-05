import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, matchesForComp, getUserById, getEventConfig, getTeam, currentTeamMembers, teamForUser, playerName, hasPermission, whenReady } from '@/lib/store'
import { attemptsForComp, entryIndexForComp } from '@/lib/bracket-dto'
import { leftoverPlayers, matchNumberMap, isDrawPublished } from '@/lib/bracket'
import { isCancelledSlot, isRestSlot, restIndex } from '@/lib/bracket-slots'
import { prelimVenueForGroupKey } from '@/lib/prelim-venue'
import { C, BackHeader } from '@/components/ui'
import BracketView, { type MatchDTO, type Player } from './BracketView'

export const dynamic = 'force-dynamic'

export default async function BracketPage({ params }: { params: { id: string } }) {
  // Same hydration race as the admin shell: a request that arrives before
  // startHydration() finishes would find no event and answer 404 for a page
  // that plainly exists. router.refresh() after recording a result is a fresh
  // request, so it can land in that window.
  await whenReady()
  const c = getEvent(params.id)
  if (!c) return notFound()

  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const role = (session as any)?.role
  const isAdmin = role === 'admin' || role === 'organizer'
  // Scoped 'result_entry' grant: sees the real (undrawn-hidden) bracket and
  // gets a result-only MatchSheet — never leftovers, rest-fill or peek.
  const canRecord = !isAdmin && hasPermission(uid ? getUserById(uid) : undefined, 'result_entry')
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

  const allMatches = matchesForComp(c.id)
  const real = (isAdmin || canRecord) ? allMatches : allMatches.filter(m => isDrawPublished(c.id, m.groupKey))
  const drawn = real.length > 0
  const attemptsMap = isTeamEvent ? new Map<string, number>() : attemptsForComp(c.id)
  const entryMap = isTeamEvent ? new Map<string, number>() : entryIndexForComp(c.id)

  const player = (uid?: string, matchId?: string, side?: 1 | 2): Player => {
    if (!uid) return null
    if (isRestSlot(uid)) {
      const n = restIndex(uid)
      return { uid, tag: `rest${n}`, name: `rest${n}`, slotKind: 'rest', restIndex: n }
    }
    if (isCancelledSlot(uid)) {
      return { uid, tag: 'لغو شده', name: 'لغو شده', slotKind: 'cancelled' }
    }
    const u = getUserById(uid)
    if (!u) return null
    return {
      uid: u.id, tag: u.tag, name: playerName(u),
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
    const nums = matchNumberMap(real)
    const dto: MatchDTO[] = real.map(m => ({
      id: m.id, stage: m.stage, groupKey: m.groupKey, bracket: m.bracket, round: m.round, slot: m.slot,
      n: nums.get(m.id),
      p1: isTeamEvent ? teamPlayer(m.p1TeamId) : player(m.p1UserId, m.id, 1),
      p2: isTeamEvent ? teamPlayer(m.p2TeamId) : player(m.p2UserId, m.id, 2),
      winnerUid: isTeamEvent ? m.winnerTeamId : m.winnerUserId, score: m.score, status: m.status, cancelled: m.cancelled,
    }))
    const leftovers = isAdmin && !isTeamEvent
      ? leftoverPlayers(c.id).map(x => {
          const u = getUserById(x.userId)
          return { uid: x.userId, name: u ? playerName(u) : x.userId, tag: u?.tag || x.userId, leftover: x.leftover, groupKey: x.groupKey }
        })
      : []
    return (
      // Admin, desktop only: break out of the 480px mobile shell so there's
      // real room to navigate result entry on a big screen (docs — see
      // .gl-wide-admin in globals.css). No effect on mobile or non-admins.
      <div className={isAdmin ? 'animate-fade-up gl-wide-admin' : 'animate-fade-up'}>
        <div className={isAdmin ? 'gl-wide-admin-inner' : undefined}>
          <BackHeader title={`براکت — ${c.title}`} href={`/competitions/${c.id}`} />
          <div style={{ padding: '14px 16px 28px' }}>
            <BracketView matches={dto} meUid={meUid} isAdmin={isAdmin} canRecord={canRecord} compId={c.id} venueLabels={venueLabels} schedules={cfg.bracketSchedule} leftovers={leftovers} />
          </div>
        </div>
      </div>
    )
  }

  // Not drawn yet — simple preview.
  return (
    <div className={isAdmin ? 'animate-fade-up gl-wide-admin' : 'animate-fade-up'}>
      <div className={isAdmin ? 'gl-wide-admin-inner' : undefined}>
        <BackHeader title={`براکت — ${c.title}`} href={`/competitions/${c.id}`} />
        <div style={{ padding: '14px 16px 28px' }}>
          <div style={{ fontSize: 12.5, color: C.tbody, padding: '12px 14px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12 }}>
            هنوز قرعه‌کشی نشده.
          </div>
        </div>
      </div>
    </div>
  )
}
