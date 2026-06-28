import { allUsers, allEvents, allPlacements } from '@/lib/store'
import { pointsForPlacement } from '@/lib/ranking'
import type { EventTier } from '@/lib/schema'
import type { Disc } from '@/lib/mock-data'
import LeaderboardClient from './client'

export const dynamic = 'force-dynamic'

const DISC_COLOR: Record<string, string> = {
  valorant: '#fb7185', cs2: '#fbbf24', pubgm: '#34d399', fc: '#38bdf8',
}

export default function LeaderboardPage() {
  const users = allUsers().filter(u => u.role === 'gamer')
  const events = allEvents()
  const placements = allPlacements()

  const eventMap = new Map(events.map(e => [e.id, e]))

  const pointsAcc = new Map<string, number>()
  const eventsAcc = new Map<string, number>()

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
      disc: (u.primaryDisc ?? 'valorant') as Disc,
      points: pointsAcc.get(u.id) ?? 0,
      winrate: 0,
      matches: eventsAcc.get(u.id) ?? 0,
      trend: 0,
      color: DISC_COLOR[u.primaryDisc ?? ''] ?? '#94a3b8',
      city: u.city,
    }))

  return <LeaderboardClient initial={ranked} />
}
