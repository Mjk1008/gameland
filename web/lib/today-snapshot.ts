// Live Day Hub («امروز») — pure derivation over the existing in-memory store.
// No new source of truth: reads app_matches (+ the new match_desk/follows
// tables via lib/match-desk.ts) and derives everything on each request.
// See docs/35-live-day-hub-plan.md and docs/36-live-day-hub-design-brief.md.
import { allEvents, allMatches, matchesForUser, getUserById, hasAvatar, type Match } from './store'
import { getDesk, followingList, type MatchDeskRow } from './match-desk'

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
  | { kind: 'ready'; step: 1 | 2; matchId: string; roundLabel: string; station?: string; opponent?: HeroOpponent }
  | { kind: 'playing'; matchId: string; roundLabel: string; station?: string; opponent?: HeroOpponent; score?: string }
  | { kind: 'advanced'; matchId: string; score?: string }
  | { kind: 'eliminated'; matchId: string; score?: string; opponent?: HeroOpponent }

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
      return { kind: 'playing', matchId: active.id, roundLabel: roundLabel(active, all), station: desk?.station, opponent, score: active.score }
    }
    const meHere = side === 'p1' ? desk?.p1Here : desk?.p2Here
    const step: 1 | 2 = meHere ? 2 : 1
    return { kind: 'ready', step, matchId: active.id, roundLabel: roundLabel(active, all), station: desk?.station, opponent }
  }

  const done = mine.filter(m => m.status === 'done')
    .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt))
  const last = done[0]
  if (last) {
    if (last.winnerUserId === userId) return { kind: 'advanced', matchId: last.id, score: last.score }
    const side = mySide(last, userId)
    return { kind: 'eliminated', matchId: last.id, score: last.score, opponent: side ? opponentOf(last, side) : undefined }
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

export interface TodaySnapshot {
  live: boolean
  hero: HeroState
  feed: FeedItem[]
  provincePulse: ProvincePulse[]
  following: FollowingRow[]
}

export function buildTodaySnapshot(userId: string): TodaySnapshot {
  const liveIds = liveEventIds()
  return {
    live: liveIds.length > 0,
    hero: deriveHeroState(userId, liveIds),
    feed: feedFor(liveIds),
    provincePulse: provincePulseFor(liveIds),
    following: followingFor(userId, liveIds),
  }
}
