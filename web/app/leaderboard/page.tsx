import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { allUsers, allEvents, allPlacements, getUserById, hasAvatar, activityPointsOf } from '@/lib/store'
import { playerCard } from '@/lib/player-cards'
import { pointsForPlacement } from '@/lib/ranking'
import type { EventTier } from '@/lib/schema'
import type { Disc } from '@/lib/mock-data'
import LeaderboardClient from './client'

export const dynamic = 'force-dynamic'

const DISC_COLOR: Record<string, string> = {
  fc26: '#38bdf8', pes21: '#34d399', efootball: '#22d3ee', ufc6: '#fb7185', nba2k26: '#f5c84b',
}

export default async function LeaderboardPage() {
  const session = await getServerSession(authOptions)
  const meUid = (session as any)?.uid as string | undefined
  const meTag = meUid ? getUserById(meUid)?.tag : undefined
  const users = allUsers().filter(u => u.role === 'gamer')
  const events = allEvents()
  const placements = allPlacements()

  const eventMap = new Map(events.map(e => [e.id, e]))

  const pointsAcc = new Map<string, number>()
  const eventsAcc = new Map<string, number>()

  // admin-set base points + live activity points (profile/photo/tickets) so
  // every gamer holds a real rank from their first action
  for (const u of users) pointsAcc.set(u.id, (u.bonusPoints ?? 0) + activityPointsOf(u))

  for (const pl of placements) {
    const event = eventMap.get(pl.compId)
    if (!event) continue
    const tier = (event.tier ?? 'A') as EventTier
    const pts = pointsForPlacement(pl.rank, tier)
    pointsAcc.set(pl.userId, (pointsAcc.get(pl.userId) ?? 0) + pts)
    eventsAcc.set(pl.userId, (eventsAcc.get(pl.userId) ?? 0) + 1)
  }

  const ranked = [...users]
    .sort((a, b) => {
      const pa = pointsAcc.get(a.id) ?? 0
      const pb = pointsAcc.get(b.id) ?? 0
      return pb - pa || (eventsAcc.get(b.id) ?? 0) - (eventsAcc.get(a.id) ?? 0)
    })
    .map((u, i) => ({
      rank: i + 1,
      name: u.name,
      tag: u.tag,
      uid: u.id,
      hasAvatar: hasAvatar(u.id),
      card: playerCard(u.tag),
      disc: (u.primaryDisc ?? 'fc26') as Disc,
      points: pointsAcc.get(u.id) ?? 0,
      winrate: 0,
      matches: eventsAcc.get(u.id) ?? 0,
      trend: 0,
      color: DISC_COLOR[u.primaryDisc ?? ''] ?? '#94a3b8',
      city: u.city,
    }))

  // "your rank" — the logged-in gamer's own row, pinned at the top of the page
  const meRow = meUid ? ranked.find(r => r.uid === meUid) ?? null : null

  // city league — same points, aggregated per city (city pride, zero new data)
  const cityAcc = new Map<string, { city: string; gamers: number; points: number }>()
  for (const r of ranked) {
    const city = (r.city || '').trim()
    if (!city) continue
    const c = cityAcc.get(city) ?? { city, gamers: 0, points: 0 }
    c.gamers += 1; c.points += r.points
    cityAcc.set(city, c)
  }
  const cities = Array.from(cityAcc.values()).sort((a, b) => b.points - a.points || b.gamers - a.gamers)

  return <LeaderboardClient initial={ranked} meTag={meTag} me={meRow} cities={cities} />
}
