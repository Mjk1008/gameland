// Live Day Hub («امروز») — per-match check-in/operational state + follow
// graph. In-memory state + business rules, persisted via persist.matchDesk /
// persist.follow (see lib/db/persistence.ts). Mirrors lib/arena.ts's shape:
// store.ts delegates hydration here via a lazy require() to avoid a load
// cycle (this module imports from store.ts at the top level).
import { persist } from './db/persistence'

export type DeskSide = 'p1' | 'p2'

export interface MatchDeskRow {
  matchId: string
  station?: string
  p1Here: boolean
  p2Here: boolean
  p1Ready: boolean
  p2Ready: boolean
  calledAt?: number
  refRequestedBy?: string
  refRequestedAt?: number
  refHandledAt?: number
}

// Admin queue-tab thresholds — "دیرکرده" past 10 minutes waiting, "غایب" past 20.
export const LATE_MS = 10 * 60_000
export const ABSENT_MS = 20 * 60_000

const desks = new Map<string, MatchDeskRow>()
const following = new Map<string, Set<string>>()   // followerId -> Set<followeeId>

function ms(v: unknown): number | undefined {
  if (v == null) return undefined
  return v instanceof Date ? v.getTime() : typeof v === 'number' ? v : Date.parse(String(v))
}

function emptyDesk(matchId: string): MatchDeskRow {
  return { matchId, p1Here: false, p2Here: false, p1Ready: false, p2Ready: false }
}

function persistDesk(row: MatchDeskRow) {
  persist.matchDesk.upsert({
    matchId: row.matchId, station: row.station,
    p1Here: row.p1Here, p2Here: row.p2Here, p1Ready: row.p1Ready, p2Ready: row.p2Ready,
    calledAt: row.calledAt, refRequestedBy: row.refRequestedBy,
    refRequestedAt: row.refRequestedAt, refHandledAt: row.refHandledAt,
  })
}

export function hydrateMatchDesk(row: {
  matchId: string; station?: string | null
  p1Here: boolean; p2Here: boolean; p1Ready: boolean; p2Ready: boolean
  calledAt?: unknown; refRequestedBy?: string | null; refRequestedAt?: unknown; refHandledAt?: unknown
}) {
  desks.set(row.matchId, {
    matchId: row.matchId, station: row.station ?? undefined,
    p1Here: row.p1Here, p2Here: row.p2Here, p1Ready: row.p1Ready, p2Ready: row.p2Ready,
    calledAt: ms(row.calledAt), refRequestedBy: row.refRequestedBy ?? undefined,
    refRequestedAt: ms(row.refRequestedAt), refHandledAt: ms(row.refHandledAt),
  })
}

export function hydrateFollow(row: { followerId: string; followeeId: string }) {
  const set = following.get(row.followerId) ?? new Set<string>()
  set.add(row.followeeId)
  following.set(row.followerId, set)
}

export function getDesk(matchId: string): MatchDeskRow | undefined {
  return desks.get(matchId)
}

export function allDesks(): MatchDeskRow[] {
  return [...desks.values()]
}

function withDesk(matchId: string, mutate: (row: MatchDeskRow) => void): MatchDeskRow {
  const row = desks.get(matchId) ?? emptyDesk(matchId)
  mutate(row)
  desks.set(matchId, row)
  persistDesk(row)
  return row
}

/** «حاضرم» — player marks themselves physically at the station. */
export function checkIn(matchId: string, side: DeskSide): MatchDeskRow {
  return withDesk(matchId, row => { if (side === 'p1') row.p1Here = true; else row.p2Here = true })
}

/** «آماده‌ام» — player confirms ready to start (second check-in step). */
export function markReady(matchId: string, side: DeskSide): MatchDeskRow {
  return withDesk(matchId, row => { if (side === 'p1') row.p1Ready = true; else row.p2Ready = true })
}

/** «درخواستِ داور» — only the first open request sticks until an admin resolves it. */
export function requestRef(matchId: string, uid: string): MatchDeskRow {
  return withDesk(matchId, row => {
    if (row.refRequestedAt && !row.refHandledAt) return   // already pending
    row.refRequestedBy = uid
    row.refRequestedAt = Date.now()
    row.refHandledAt = undefined
  })
}

/** Admin «رسیدگی» — clears the pending ref-request from the queue. */
export function resolveRef(matchId: string): MatchDeskRow {
  return withDesk(matchId, row => { row.refHandledAt = Date.now() })
}

/** Admin «صدا کن» — assigns/reassigns a station and stamps the call time. */
export function callToStation(matchId: string, station: string): MatchDeskRow {
  return withDesk(matchId, row => { row.station = station; row.calledAt = Date.now() })
}

export function follow(followerId: string, followeeId: string): void {
  if (followerId === followeeId) return
  const set = following.get(followerId) ?? new Set<string>()
  if (set.has(followeeId)) return
  set.add(followeeId)
  following.set(followerId, set)
  persist.follow.insert(followerId, followeeId)
}

export function unfollow(followerId: string, followeeId: string): void {
  const set = following.get(followerId)
  if (!set?.has(followeeId)) return
  set.delete(followeeId)
  persist.follow.delete(followerId, followeeId)
}

export function isFollowing(followerId: string, followeeId: string): boolean {
  return following.get(followerId)?.has(followeeId) ?? false
}

export function followingList(userId: string): string[] {
  return [...(following.get(userId) ?? [])]
}
