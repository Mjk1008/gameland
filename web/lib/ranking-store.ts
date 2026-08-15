/**
 * Scalable national ranking — stored in Postgres, read via indexed SQL.
 * Points are derived from the same rules as activityPointsOf + placements + arena;
 * recomputed incrementally on mutation (touchUserRanking) not on every page view.
 */
import { sql } from 'drizzle-orm'
import { db } from './db/client'
import {
  allUsers, getUserById, activityPointsOf, hasAvatar,
  allEvents, allPlacements,
} from './store'
import { challengePointsOf } from './arena'
import { playerCard } from './player-cards'
import { pointsForPlacement } from './ranking'
import type { EventTier } from './schema'
import type { Disc } from './mock-data'
import { persist } from './db/persistence'

const DISC_COLOR: Record<string, string> = {
  fc26: '#38bdf8', pes21: '#34d399', efootball: '#22d3ee', ufc6: '#fb7185', nba2k26: '#f5c84b',
}

export interface NationalRankRow {
  rank: number
  name: string
  tag: string
  uid: string
  hasAvatar: boolean
  card: string | null
  disc: Disc
  points: number
  winrate: number
  matches: number
  trend: number
  color: string
  city: string
}

export interface CityRankRow { city: string; gamers: number; points: number }

export interface LeaderboardQuery {
  limit?: number
  offset?: number
  disc?: string
  q?: string
}

/** Same formula used everywhere — single user, in-memory inputs. */
export function computeRankingTotals(userId: string): { points: number; events: number } {
  const u = getUserById(userId)
  if (!u || u.role !== 'gamer') return { points: 0, events: 0 }
  let points = (u.bonusPoints ?? 0) + activityPointsOf(u) + challengePointsOf(userId)
  let events = 0
  const eventMap = new Map(allEvents().map(e => [e.id, e]))
  for (const pl of allPlacements()) {
    if (pl.userId !== userId) continue
    const event = eventMap.get(pl.compId)
    if (!event) continue
    points += pointsForPlacement(pl.rank, (event.tier ?? 'A') as EventTier)
    events += 1
  }
  return { points, events }
}

/** Incremental write — call after any mutation that affects a user's score. */
export function touchUserRanking(userId: string) {
  const u = getUserById(userId)
  if (!u || u.role !== 'gamer') return
  const { points, events } = computeRankingTotals(userId)
  u.rankingPoints = points
  u.rankingEvents = events
  persist.user.setRanking(userId, points, events)
}

/** Full rebuild after hydration — keeps DB columns aligned with memory. */
export async function rebuildAllRankingsAsync() {
  const gamers = allUsers().filter(u => u.role === 'gamer' && !u.deletedAt)
  const batch: { id: string; points: number; events: number }[] = []
  for (const u of gamers) {
    const { points, events } = computeRankingTotals(u.id)
    u.rankingPoints = points
    u.rankingEvents = events
    batch.push({ id: u.id, points, events })
  }
  await persist.user.batchSetRanking(batch)
}

function rowFromDb(r: {
  id: string; name: string; tag: string; city: string; primary_disc: string | null
  ranking_points: number; ranking_events: number; has_avatar: boolean
}, rank: number): NationalRankRow {
  const disc = (r.primary_disc ?? 'fc26') as Disc
  return {
    rank,
    name: r.name,
    tag: r.tag,
    uid: r.id,
    hasAvatar: r.has_avatar || hasAvatar(r.id),
    card: playerCard(r.tag),
    disc,
    points: r.ranking_points,
    winrate: 0,
    matches: r.ranking_events,
    trend: 0,
    color: DISC_COLOR[disc] ?? '#94a3b8',
    city: r.city,
  }
}

function gamerWhere(disc?: string, q?: string) {
  const parts = [`u.role = 'gamer'`, `u.deleted_at IS NULL`]
  if (disc && disc !== 'all') {
    const d = disc.replace(/'/g, "''")
    parts.push(`u.primary_disc = '${d}'`)
  }
  if (q?.trim()) {
    const n = q.trim().replace(/'/g, "''").toLowerCase()
    parts.push(`(LOWER(u.name) LIKE '%${n}%' OR LOWER(u.tag) LIKE '%${n}%' OR u.city LIKE '%${q.trim().replace(/'/g, "''")}%')`)
  }
  return parts.join(' AND ')
}

export async function queryGamerCount(): Promise<number> {
  const d = db()
  if (!d) return allUsers().filter(u => u.role === 'gamer' && !u.deletedAt).length
  const res = await d.execute(sql.raw(`SELECT COUNT(*)::int AS n FROM app_users WHERE role = 'gamer' AND deleted_at IS NULL`))
  return Number((res as any)[0]?.n ?? 0)
}

/** Indexed SQL read — O(log n + limit), scales to millions. */
export async function queryLeaderboard(opts: LeaderboardQuery = {}): Promise<{ rows: NationalRankRow[]; total: number }> {
  const d = db()
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50))
  const offset = Math.max(0, opts.offset ?? 0)
  const where = gamerWhere(opts.disc, opts.q)

  if (!d) {
    const all = fallbackRanking()
    let list = all
    if (opts.disc && opts.disc !== 'all') list = list.filter(r => r.disc === opts.disc)
    if (opts.q?.trim()) {
      const n = opts.q.trim().toLowerCase()
      list = list.filter(r => r.name.toLowerCase().includes(n) || r.tag.toLowerCase().includes(n) || r.city.includes(opts.q!.trim()))
    }
    return { rows: list.slice(offset, offset + limit), total: list.length }
  }

  const countRes = await d.execute(sql.raw(`
    SELECT COUNT(*)::int AS n FROM app_users u WHERE ${where}
  `))
  const total = Number((countRes as any)[0]?.n ?? 0)

  const res = await d.execute(sql.raw(`
    SELECT u.id, u.name, u.tag, u.city, u.primary_disc,
           u.ranking_points, u.ranking_events,
           EXISTS (SELECT 1 FROM app_avatars a WHERE a.user_id = u.id) AS has_avatar
    FROM app_users u
    WHERE ${where}
    ORDER BY u.ranking_points DESC, u.ranking_events DESC, u.tag ASC
    LIMIT ${limit} OFFSET ${offset}
  `))

  const rows = ((res as any) as Array<Record<string, unknown>>).map((r, i) =>
    rowFromDb({
      id: String(r.id),
      name: String(r.name),
      tag: String(r.tag),
      city: String(r.city ?? ''),
      primary_disc: r.primary_disc ? String(r.primary_disc) : null,
      ranking_points: Number(r.ranking_points ?? 0),
      ranking_events: Number(r.ranking_events ?? 0),
      has_avatar: !!r.has_avatar,
    }, offset + i + 1),
  )

  return { rows, total }
}

export async function queryUserRank(uid: string): Promise<{ rank: number | null; points: number; total: number }> {
  const d = db()
  if (!d) {
    const all = fallbackRanking()
    const row = all.find(r => r.uid === uid)
    return { rank: row && row.points > 0 ? row.rank : null, points: row?.points ?? 0, total: all.length }
  }

  const res = await d.execute(sql.raw(`
    SELECT u.ranking_points,
           (SELECT COUNT(*)::int FROM app_users g WHERE g.role = 'gamer' AND g.deleted_at IS NULL) AS total,
           (SELECT COUNT(*)::int + 1 FROM app_users g
            WHERE g.role = 'gamer' AND g.deleted_at IS NULL
              AND (g.ranking_points > u.ranking_points
                OR (g.ranking_points = u.ranking_points AND g.ranking_events > u.ranking_events)
                OR (g.ranking_points = u.ranking_points AND g.ranking_events = u.ranking_events AND g.tag < u.tag))
           ) AS rank
    FROM app_users u
    WHERE u.id = '${uid.replace(/'/g, "''")}' AND u.role = 'gamer' AND u.deleted_at IS NULL
  `))
  const row = (res as any)[0]
  if (!row) return { rank: null, points: 0, total: 0 }
  const points = Number(row.ranking_points ?? 0)
  const total = Number(row.total ?? 0)
  const rank = points > 0 ? Number(row.rank ?? 0) : null
  return { rank, points, total }
}

export async function queryTopGamers(n: number): Promise<NationalRankRow[]> {
  const { rows } = await queryLeaderboard({ limit: n, offset: 0 })
  return rows
}

export async function queryCityRanking(): Promise<CityRankRow[]> {
  const d = db()
  if (!d) return fallbackCityRanking()

  const res = await d.execute(sql.raw(`
    SELECT TRIM(city) AS city,
           COUNT(*)::int AS gamers,
           SUM(ranking_points)::int AS points
    FROM app_users
    WHERE role = 'gamer' AND deleted_at IS NULL AND TRIM(city) <> ''
    GROUP BY TRIM(city)
    ORDER BY points DESC, gamers DESC
  `))
  return ((res as any) as Array<{ city: string; gamers: number; points: number }>).map(r => ({
    city: r.city,
    gamers: Number(r.gamers),
    points: Number(r.points),
  }))
}

export async function queryLeaderboardRow(uid: string): Promise<NationalRankRow | null> {
  const { rank, points } = await queryUserRank(uid)
  if (!points) return null
  const u = getUserById(uid)
  if (!u) return null
  const disc = (u.primaryDisc ?? 'fc26') as Disc
  return {
    rank: rank ?? 0,
    name: u.name,
    tag: u.tag,
    uid,
    hasAvatar: hasAvatar(uid),
    card: playerCard(u.tag),
    disc,
    points,
    winrate: 0,
    matches: u.rankingEvents ?? 0,
    trend: 0,
    color: DISC_COLOR[disc] ?? '#94a3b8',
    city: u.city,
  }
}

function fallbackRanking(): NationalRankRow[] {
  return allUsers()
    .filter(u => u.role === 'gamer' && !u.deletedAt)
    .map(u => {
      const { points, events } = computeRankingTotals(u.id)
      return { u, points, events }
    })
    .sort((a, b) => b.points - a.points || b.events - a.events || a.u.tag.localeCompare(b.u.tag))
    .map(({ u, points, events }, i) => {
      const disc = (u.primaryDisc ?? 'fc26') as Disc
      return {
        rank: i + 1,
        name: u.name,
        tag: u.tag,
        uid: u.id,
        hasAvatar: hasAvatar(u.id),
        card: playerCard(u.tag),
        disc,
        points,
        winrate: 0,
        matches: events,
        trend: 0,
        color: DISC_COLOR[disc] ?? '#94a3b8',
        city: u.city,
      }
    })
}

function fallbackCityRanking(): CityRankRow[] {
  const acc = new Map<string, CityRankRow>()
  for (const r of fallbackRanking()) {
    const city = (r.city || '').trim()
    if (!city) continue
    const c = acc.get(city) ?? { city, gamers: 0, points: 0 }
    c.gamers += 1
    c.points += r.points
    acc.set(city, c)
  }
  return Array.from(acc.values()).sort((a, b) => b.points - a.points || b.gamers - a.gamers)
}

// Legacy sync helpers — avoid loading full leaderboard into RAM.
export function nationalRanking(): NationalRankRow[] {
  return fallbackRanking()
}

export function nationalRankForUser(uid: string) {
  const rows = fallbackRanking()
  const row = rows.find(r => r.uid === uid) ?? null
  return { rank: row && row.points > 0 ? row.rank : null, points: row?.points ?? 0, row }
}

export function nationalCityRanking(rows?: NationalRankRow[]): CityRankRow[] {
  const src = rows ?? fallbackRanking()
  const acc = new Map<string, CityRankRow>()
  for (const r of src) {
    const city = (r.city || '').trim()
    if (!city) continue
    const c = acc.get(city) ?? { city, gamers: 0, points: 0 }
    c.gamers += 1
    c.points += r.points
    acc.set(city, c)
  }
  return Array.from(acc.values()).sort((a, b) => b.points - a.points || b.gamers - a.gamers)
}

export function invalidateNationalRanking() { /* ranking_points in DB is source of truth */ }
