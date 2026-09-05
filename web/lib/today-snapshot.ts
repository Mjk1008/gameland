// Live Day Hub («امروز») — pure derivation over the existing in-memory store.
// No new source of truth: reads app_matches (+ the new match_desk/follows
// tables via lib/match-desk.ts) and derives everything on each request.
// See docs/35-live-day-hub-plan.md and docs/36-live-day-hub-design-brief.md.
import { allEvents, allMatches, matchesForUser, getUserById, getEvent, getSetting, hasAvatar, notifsForUser, type Match } from './store'
import { getDesk, allDesks, followingList, LATE_MS, ABSENT_MS, type MatchDeskRow } from './match-desk'
import { queryUserRank } from './ranking-store'

export function liveEventIds(): string[] {
  return allEvents().filter(e => e.status === 'live').map(e => e.id)
}

export interface HeroOpponent {
  uid: string
  name: string
  tag: string
  hasPhoto: boolean
}

export type HeroState =
  | { kind: 'none' }
  | { kind: 'waiting'; roundLabel: string }
  | { kind: 'ready'; step: 1 | 2; matchId: string; compId: string; roundLabel: string; station?: string; opponent?: HeroOpponent }
  | { kind: 'playing'; matchId: string; compId: string; roundLabel: string; station?: string; opponent?: HeroOpponent; score?: string }
  | { kind: 'advanced'; matchId: string; compId: string; score?: string }
  | { kind: 'eliminated'; matchId: string; compId: string; score?: string; opponent?: HeroOpponent }

function mySide(m: Match, userId: string): 'p1' | 'p2' | undefined {
  if (m.p1UserId === userId) return 'p1'
  if (m.p2UserId === userId) return 'p2'
  return undefined
}

function opponentOf(m: Match, side: 'p1' | 'p2'): HeroOpponent | undefined {
  const oppId = side === 'p1' ? m.p2UserId : m.p1UserId
  if (!oppId) return undefined
  const u = getUserById(oppId)
  if (!u) return undefined
  return { uid: u.id, name: u.name, tag: u.tag, hasPhoto: hasAvatar(u.id) }
}

// Standard single-elim naming by rounds-remaining within the match's own
// bracket/stage/group — this is a display label only, derived from existing
// match rows; it never reads or writes bracket/draw logic.
function roundLabel(m: Match, all: Match[]): string {
  const siblings = all.filter(x => x.compId === m.compId && x.stage === m.stage && x.groupKey === m.groupKey && x.bracket === m.bracket)
  const maxRound = siblings.reduce((mx, x) => Math.max(mx, x.round), m.round)
  const left = maxRound - m.round + 1
  switch (left) {
    case 1: return 'فینال'
    case 2: return 'نیمه‌نهایی'
    case 3: return 'یک‌چهارم نهایی'
    case 4: return 'یک‌هشتم نهایی'
    default: return `دورِ ${m.round}`
  }
}

function deskPlayingReady(desk: MatchDeskRow | undefined): boolean {
  return !!desk && desk.p1Ready && desk.p2Ready
}

export function deriveHeroState(userId: string, liveIds: string[]): HeroState {
  const all = allMatches()
  const mine = matchesForUser(userId).filter(m => liveIds.includes(m.compId) && !m.cancelled)
  if (mine.length === 0) return { kind: 'none' }

  const active = mine.find(m => m.status === 'ready')
  if (active) {
    const side = mySide(active, userId)
    const desk = getDesk(active.id)
    const opponent = side ? opponentOf(active, side) : undefined
    if (deskPlayingReady(desk)) {
      return { kind: 'playing', matchId: active.id, compId: active.compId, roundLabel: roundLabel(active, all), station: desk?.station, opponent, score: active.score }
    }
    const meHere = side === 'p1' ? desk?.p1Here : desk?.p2Here
    const step: 1 | 2 = meHere ? 2 : 1
    return { kind: 'ready', step, matchId: active.id, compId: active.compId, roundLabel: roundLabel(active, all), station: desk?.station, opponent }
  }

  const done = mine.filter(m => m.status === 'done')
    .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt))
  const last = done[0]
  if (last) {
    if (last.winnerUserId === userId) return { kind: 'advanced', matchId: last.id, compId: last.compId, score: last.score }
    const side = mySide(last, userId)
    return { kind: 'eliminated', matchId: last.id, compId: last.compId, score: last.score, opponent: side ? opponentOf(last, side) : undefined }
  }

  const pending = mine.find(m => m.status === 'pending')
  if (pending) return { kind: 'waiting', roundLabel: roundLabel(pending, all) }

  return { kind: 'none' }
}

export interface FeedItem {
  matchId: string
  winnerName: string
  loserName: string
  score?: string
  completedAt: number
}

const FEED_LIMIT = 30

function feedFor(liveIds: string[]): FeedItem[] {
  return allMatches()
    .filter(m => liveIds.includes(m.compId) && m.status === 'done' && !m.cancelled && m.completedAt && m.winnerUserId)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .slice(0, FEED_LIMIT)
    .map(m => {
      const loserId = m.winnerUserId === m.p1UserId ? m.p2UserId : m.p1UserId
      const winner = getUserById(m.winnerUserId!)
      const loser = loserId ? getUserById(loserId) : undefined
      return {
        matchId: m.id,
        winnerName: winner?.name ?? '—',
        loserName: loser?.name ?? '—',
        score: m.score,
        completedAt: m.completedAt!,
      }
    })
}

export interface ProvincePulse {
  province: string
  done: number
  total: number
}

function provincePulseFor(liveIds: string[]): ProvincePulse[] {
  const byProvince = new Map<string, { done: number; total: number }>()
  for (const m of allMatches()) {
    if (!liveIds.includes(m.compId) || m.cancelled) continue
    if (!m.groupKey.startsWith('province:')) continue
    const province = m.groupKey.slice('province:'.length)
    const row = byProvince.get(province) ?? { done: 0, total: 0 }
    row.total++
    if (m.status === 'done') row.done++
    byProvince.set(province, row)
  }
  return [...byProvince.entries()]
    .map(([province, v]) => ({ province, ...v }))
    .sort((a, b) => b.total - a.total)
}

export interface FollowingRow {
  uid: string
  name: string
  tag: string
  hasPhoto: boolean
  hero: HeroState
}

function followingFor(userId: string, liveIds: string[]): FollowingRow[] {
  return followingList(userId)
    .map(uid => getUserById(uid))
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map(u => ({ uid: u.id, name: u.name, tag: u.tag, hasPhoto: hasAvatar(u.id), hero: deriveHeroState(u.id, liveIds) }))
}

export interface AnnouncementBanner {
  title: string
  body: string
  at: number
}

const ANNOUNCEMENT_WINDOW_MS = 3 * 3600_000   // an admin announcement is "of today" for 3h

function latestAnnouncement(userId: string): AnnouncementBanner | undefined {
  const n = notifsForUser(userId).find(x => x.type === 'announcement' && Date.now() - x.createdAt < ANNOUNCEMENT_WINDOW_MS)
  return n ? { title: n.title, body: n.body, at: n.createdAt } : undefined
}

export interface TodaySnapshot {
  live: boolean
  hero: HeroState
  feed: FeedItem[]
  provincePulse: ProvincePulse[]
  following: FollowingRow[]
  announcement?: AnnouncementBanner
}

export interface MatchDetailPlayer {
  uid: string
  name: string
  tag: string
  hasPhoto: boolean
  rank: number | null
}

export interface MatchDetail {
  matchId: string
  compId: string
  disc: string
  roundLabel: string
  station?: string
  venueAddress?: string
  mySide?: 'p1' | 'p2'
  p1?: MatchDetailPlayer
  p2?: MatchDetailPlayer
  desk: { p1Here: boolean; p2Here: boolean; p1Ready: boolean; p2Ready: boolean; refRequestedAt?: number; refHandledAt?: number }
}

export const VENUE_ADDRESS_SETTING_KEY = 'TODAY_HUB_VENUE_ADDRESS'

async function playerBrief(uid?: string): Promise<MatchDetailPlayer | undefined> {
  if (!uid) return undefined
  const u = getUserById(uid)
  if (!u) return undefined
  let rank: number | null = null
  try { rank = (await queryUserRank(uid)).rank } catch { /* ranking unavailable — show without it */ }
  return { uid: u.id, name: u.name, tag: u.tag, hasPhoto: hasAvatar(u.id), rank }
}

// Match-detail sheet data — any Today-hub user may view any live match's
// public face-to-face info (spectating a followee's match), not just its
// two participants; mySide is only set when the viewer is one of them.
export async function matchDetailFor(userId: string, matchId: string): Promise<MatchDetail | null> {
  const liveIds = liveEventIds()
  const m = allMatches().find(x => x.id === matchId && liveIds.includes(x.compId) && !x.cancelled)
  if (!m) return null
  const event = getEvent(m.compId)
  const desk = getDesk(matchId)
  const [p1, p2] = await Promise.all([playerBrief(m.p1UserId), playerBrief(m.p2UserId)])
  return {
    matchId: m.id, compId: m.compId, disc: event?.disc ?? '',
    roundLabel: roundLabel(m, allMatches()), station: desk?.station,
    venueAddress: getSetting(VENUE_ADDRESS_SETTING_KEY) || undefined,
    mySide: mySide(m, userId), p1, p2,
    desk: {
      p1Here: desk?.p1Here ?? false, p2Here: desk?.p2Here ?? false,
      p1Ready: desk?.p1Ready ?? false, p2Ready: desk?.p2Ready ?? false,
      refRequestedAt: desk?.refRequestedAt, refHandledAt: desk?.refHandledAt,
    },
  }
}

export function buildTodaySnapshot(userId: string): TodaySnapshot {
  const liveIds = liveEventIds()
  return {
    live: liveIds.length > 0,
    hero: deriveHeroState(userId, liveIds),
    feed: feedFor(liveIds),
    provincePulse: provincePulseFor(liveIds),
    following: followingFor(userId, liveIds),
    announcement: latestAnnouncement(userId),
  }
}

// ─── Admin ops board («تختهٔ روز») ──────────────────────────────────────────

export interface QueueRow {
  matchId: string
  p1Name: string
  p2Name: string
  station?: string
  sinceMs: number         // how long this match has been in its current bucket
  refRequestedAt?: number
}

export type QueueBucket = 'waiting' | 'playing' | 'late' | 'absent' | 'ref'

export interface StationCard {
  station: string
  status: 'playing' | 'late'
  current?: string   // "p1 — p2"
  next?: string
}

export interface AdminTodaySnapshot {
  stations: StationCard[]
  queue: Record<QueueBucket, QueueRow[]>
  counts: Record<QueueBucket, number>
}

function nameOf(uid?: string): string {
  if (!uid) return '؟'
  return getUserById(uid)?.name ?? '؟'
}

export function buildAdminToday(): AdminTodaySnapshot {
  const liveIds = liveEventIds()
  const active = allMatches().filter(m => liveIds.includes(m.compId) && m.status === 'ready' && !m.cancelled)
  const now = Date.now()

  const queue: Record<QueueBucket, QueueRow[]> = { waiting: [], playing: [], late: [], absent: [], ref: [] }

  for (const m of active) {
    const desk = getDesk(m.id)
    const row: QueueRow = {
      matchId: m.id, p1Name: nameOf(m.p1UserId), p2Name: nameOf(m.p2UserId),
      station: desk?.station, sinceMs: now - (desk?.calledAt ?? m.createdAt),
    }
    if (desk?.refRequestedAt && !desk.refHandledAt) {
      queue.ref.push({ ...row, refRequestedAt: desk.refRequestedAt })
    }
    if (!desk?.station) {
      queue.waiting.push(row)
    } else {
      const waited = now - (desk.calledAt ?? now)
      if (desk.p1Ready && desk.p2Ready) queue.playing.push(row)
      else if (waited >= ABSENT_MS) queue.absent.push(row)
      else if (waited >= LATE_MS) queue.late.push(row)
      else queue.playing.push(row)
    }
  }
  for (const b of Object.keys(queue) as QueueBucket[]) queue[b].sort((a, c) => a.sinceMs - c.sinceMs).reverse()

  const stations: StationCard[] = allDesks()
    .filter(d => d.station && active.some(m => m.id === d.matchId))
    .map(d => {
      const m = active.find(x => x.id === d.matchId)!
      const waited = now - (d.calledAt ?? now)
      return {
        station: d.station!,
        status: (waited >= LATE_MS && !(d.p1Ready && d.p2Ready)) ? 'late' : 'playing',
        current: `${nameOf(m.p1UserId)} — ${nameOf(m.p2UserId)}`,
      } as StationCard
    })
    .sort((a, b) => a.station.localeCompare(b.station))

  const counts: Record<QueueBucket, number> = {
    waiting: queue.waiting.length, playing: queue.playing.length,
    late: queue.late.length, absent: queue.absent.length, ref: queue.ref.length,
  }

  return { stations, queue, counts }
}
