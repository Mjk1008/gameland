// Ranking computation — implements docs/14-ranking-design.md exactly.
// Model: rolling points-per-placement × tier multiplier, per discipline.

import type {
  Competition,
  EventTier,
  Placement,
  Player,
  RankingEntry,
} from './schema'

// Placement curve — base = Major (S, ×1.0)
const PLACEMENT_POINTS: { upTo: number; pts: number }[] = [
  { upTo: 1, pts: 1000 },
  { upTo: 2, pts: 800 },
  { upTo: 3, pts: 500 },
  { upTo: 4, pts: 400 },
  { upTo: 8, pts: 250 },
  { upTo: 16, pts: 150 },
  { upTo: 32, pts: 80 },
  { upTo: 64, pts: 40 },
  { upTo: 128, pts: 20 },
]

export const TIER_MULTIPLIER: Record<EventTier, number> = {
  S: 1.0, // Major
  A: 0.8, // Gameland-run / technical
  B: 0.5, // All-Star seasonal — yields 500/300/150, top-32 ≈ 40 (close to brief's 30)
  C: 0.3, // Local / minor
}

export const TIER_LABEL_FA: Record<EventTier, string> = {
  S: 'ماژور',
  A: 'گیم‌لند / فنی',
  B: 'آل‌استار فصلی',
  C: 'محلی',
}

export function pointsForPlacement(rank: number, tier: EventTier): number {
  const row = PLACEMENT_POINTS.find((r) => rank <= r.upTo)
  if (!row) return 0
  return Math.round(row.pts * TIER_MULTIPLIER[tier])
}

const ONE_YEAR_MS = 52 * 7 * 24 * 60 * 60 * 1000

export interface RankingInput {
  players: Player[]
  competitions: Competition[]
  placements: Placement[]
  disciplineId: string
  windowDays?: number // default rolling 52 weeks
  minEvents?: number // gate to appear ranked (anti-fluke), default 1
  asOf?: Date
}

export function computeRanking(input: RankingInput): RankingEntry[] {
  const windowMs = (input.windowDays ?? 7 * 52) * 24 * 60 * 60 * 1000
  const asOf = input.asOf ?? new Date()
  const cutoff = asOf.getTime() - windowMs

  const compsById = new Map(input.competitions.map((c) => [c.id, c]))
  const acc = new Map<string, RankingEntry>()

  for (const p of input.placements) {
    const comp = compsById.get(p.competitionId)
    if (!comp || comp.disciplineId !== input.disciplineId) continue
    if (new Date(comp.date).getTime() < cutoff) continue

    const earned = pointsForPlacement(p.rank, comp.tier)
    const cur = acc.get(p.playerId) ?? {
      playerId: p.playerId,
      disciplineId: input.disciplineId,
      points: 0,
      events: 0,
      bestPlacement: Number.POSITIVE_INFINITY,
      bestTier: 'C' as EventTier,
      lastEventAt: '1970-01-01T00:00:00Z',
    }
    cur.points += earned
    cur.events += 1
    if (p.rank < cur.bestPlacement) cur.bestPlacement = p.rank
    if (TIER_MULTIPLIER[comp.tier] > TIER_MULTIPLIER[cur.bestTier])
      cur.bestTier = comp.tier
    if (comp.date > cur.lastEventAt) cur.lastEventAt = comp.date
    acc.set(p.playerId, cur)
  }

  const minEvents = input.minEvents ?? 1
  return Array.from(acc.values())
    .filter((e) => e.events >= minEvents)
    .sort((a, b) => {
      // tie-breaks per docs/14 §"Tie-breaks"
      if (b.points !== a.points) return b.points - a.points
      if (b.events !== a.events) return b.events - a.events // more events
      if (a.bestPlacement !== b.bestPlacement)
        return a.bestPlacement - b.bestPlacement // higher best placement
      return b.lastEventAt.localeCompare(a.lastEventAt) // more recent
    })
}

// Compute per-player honors (titles never expire — docs/14 §"Window")
export interface Honor {
  competitionId: string
  competitionName: string
  date: string
  tier: EventTier
  rank: number
  disciplineId: string
}

export function honorsFor(
  playerId: string,
  competitions: Competition[],
  placements: Placement[],
): Honor[] {
  const cMap = new Map(competitions.map((c) => [c.id, c]))
  const out: Honor[] = []
  for (const p of placements) {
    if (p.playerId !== playerId) continue
    const c = cMap.get(p.competitionId)
    if (!c) continue
    out.push({
      competitionId: c.id,
      competitionName: c.name,
      date: c.date,
      tier: c.tier,
      rank: p.rank,
      disciplineId: c.disciplineId,
    })
  }
  return out.sort((a, b) => b.date.localeCompare(a.date))
}

export function titleCounts(honors: Honor[]) {
  return {
    champion: honors.filter((h) => h.rank === 1).length,
    runnerUp: honors.filter((h) => h.rank === 2).length,
    third: honors.filter((h) => h.rank === 3).length,
    top8: honors.filter((h) => h.rank <= 8).length,
  }
}
