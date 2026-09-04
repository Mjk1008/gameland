import { DISC } from './mock-data'
import { rulesForDisc } from './discipline-rules'
import { prelimVenueForGroupKey } from './prelim-venue'
import {
  allEvents, allMatches, allUsers, currentTeamMembers, findNextMatch,
  followeesOf, getCompetition, getEventConfig, getMatch, getMatchDesk,
  getTeam, getUserById, hasAvatar, matchesForComp, matchesForUser,
  playerName, qualifyKey, type Event, type Match, type MatchDesk, type User,
} from './store'
import type { CenterMatch, CenterPlayer, CenterSnapshot } from './match-center-types'

export type { CenterMatch, CenterPlayer, CenterSnapshot }

const LATE_MS = 15 * 60_000
const ABSENT_MS = 8 * 60_000

export function roundLabel(playersInRound: number): string {
  switch (playersInRound) {
    case 2: return 'فینال'
    case 4: return 'نیمه‌نهایی'
    case 8: return 'یک‌چهارم'
    case 16: return 'یک‌هشتم'
    case 32: return 'مرحلهٔ ۳۲'
    case 64: return 'مرحلهٔ ۶۴'
    case 128: return 'مرحلهٔ ۱۲۸'
    default: return `${playersInRound} نفره`
  }
}

export function matchSide(m: Match, uid: string): 1 | 2 | 0 {
  if (m.p1UserId === uid) return 1
  if (m.p2UserId === uid) return 2
  if (m.p1TeamId && currentTeamMembers(m.p1TeamId).some(x => x.userId === uid)) return 1
  if (m.p2TeamId && currentTeamMembers(m.p2TeamId).some(x => x.userId === uid)) return 2
  return 0
}

function groupLabel(m: Match): string {
  if (m.stage === 'final') return 'فینال'
  return m.groupKey.split(':')[1] || m.groupKey || '—'
}

function roundNameFor(m: Match, bracket: Match[]): string {
  const maxR = Math.max(...bracket.map(x => x.round), m.round)
  const players = 2 ** (maxR - m.round + 1)
  return roundLabel(players)
}

function gamesAhead(m: Match, bracket: Match[]): number {
  return bracket.filter(x =>
    x.id !== m.id && !x.cancelled && x.status !== 'done' &&
    (x.round < m.round || (x.round === m.round && x.slot < m.slot)),
  ).length
}

function rankMap(): Map<string, number> {
  const gamers = allUsers()
    .filter(u => u.role === 'gamer' && !u.deletedAt && (u.rankingPoints ?? 0) > 0)
    .sort((a, b) =>
      (b.rankingPoints ?? 0) - (a.rankingPoints ?? 0) ||
      (b.rankingEvents ?? 0) - (a.rankingEvents ?? 0) ||
      a.tag.localeCompare(b.tag),
    )
  const map = new Map<string, number>()
  gamers.forEach((u, i) => map.set(u.id, i + 1))
  return map
}

function sidePlayer(uid: string | undefined, desk: MatchDesk, side: 1 | 2, ranks: Map<string, number>): CenterPlayer | undefined {
  if (!uid) return undefined
  const u = getUserById(uid)
  if (!u) return undefined
  return {
    uid: u.id, tag: u.tag, name: playerName(u), city: u.city,
    hasPhoto: hasAvatar(u.id), rank: ranks.get(u.id) ?? null,
    here: side === 1 ? desk.p1Here : desk.p2Here,
    ready: side === 1 ? desk.p1Ready : desk.p2Ready,
  }
}

function teamCaptain(teamId?: string): User | undefined {
  if (!teamId) return undefined
  const t = getTeam(teamId)
  return t ? getUserById(t.captainId) : undefined
}

function matchNums(compId: string): Map<string, number> {
  const list = matchesForComp(compId).slice().sort((a, b) =>
    (a.stage === b.stage ? 0 : a.stage === 'prelim' ? -1 : 1) ||
    a.groupKey.localeCompare(b.groupKey) || a.bracket - b.bracket || a.round - b.round || a.slot - b.slot,
  )
  const map = new Map<string, number>()
  list.forEach((m, i) => map.set(m.id, i + 1))
  return map
}

export function displayMatchNum(matchId: string): number {
  const m = getMatch(matchId)
  if (!m) return 0
  return matchNums(m.compId).get(matchId) ?? 0
}

function toCenter(m: Match, ev: Event, ranks: Map<string, number>, nums: Map<string, number>): CenterMatch {
  const cfg = getEventConfig(m.compId)
  const desk = getMatchDesk(m.id)
  const bracket = matchesForComp(m.compId).filter(x => x.stage === m.stage && x.groupKey === m.groupKey && x.bracket === m.bracket)
  const parent = ev.competitionId ? getCompetition(ev.competitionId) : undefined
  const venue = m.stage === 'prelim' ? prelimVenueForGroupKey(cfg.prelimVenues, m.groupKey) : null
  const sched = cfg.bracketSchedule?.[qualifyKey(m.groupKey, m.bracket)]
  const q = cfg.qualify[qualifyKey(m.groupKey, m.bracket)]
  const maxR = Math.max(...bracket.map(x => x.round), m.round)
  const qualify = m.stage === 'final'
    ? (m.round === maxR ? 'فینال' : 'برد → مرحلهٔ بعد')
    : q ? `صعود این براکت: ${q} نفر` : 'برد → مرحلهٔ بعد'
  const nxt = findNextMatch(m)
  const path = m.status === 'done'
    ? (m.winnerUserId ? 'صعود' : 'حذف')
    : nxt ? 'برد → مرحلهٔ بعد' : qualify
  const p1uid = m.p1UserId ?? teamCaptain(m.p1TeamId)?.id
  const p2uid = m.p2UserId ?? teamCaptain(m.p2TeamId)?.id
  const playing = !!desk.calledAt && m.status === 'ready' && !m.cancelled && (desk.p1Ready && desk.p2Ready)
  const venueName = venue?.name || (m.stage === 'final' ? parent?.location : undefined) || parent?.location || undefined
  const scheduleLabel = [sched?.date, sched?.time].filter(Boolean).join(' · ') || undefined
  const p1 = sidePlayer(p1uid, desk, 1, ranks)
  const p2 = sidePlayer(p2uid, desk, 2, ranks)
  if (p1 && m.p1TeamId) {
    const t = getTeam(m.p1TeamId)
    if (t) p1.name = t.name
  }
  if (p2 && m.p2TeamId) {
    const t = getTeam(m.p2TeamId)
    if (t) p2.name = t.name
  }
  return {
    id: m.id,
    num: nums.get(m.id) ?? 0,
    eventId: ev.id,
    eventTitle: ev.title,
    disc: ev.disc,
    format: ev.format || (cfg.teamSize === 2 ? '۲ به ۲' : DISC[ev.disc as keyof typeof DISC]?.name || ev.disc),
    stageLabel: m.stage === 'final' ? 'فینال' : 'مقدماتی',
    roundLabel: roundNameFor(m, bracket),
    groupLabel: groupLabel(m),
    venueName,
    venueAddress: venue?.address,
    mapUrl: venue?.mapUrl,
    scheduleLabel,
    station: desk.station,
    calledAt: desk.calledAt,
    status: m.status,
    cancelled: m.cancelled,
    gamesAhead: gamesAhead(m, bracket),
    qualify,
    path,
    p1, p2,
    winnerUid: m.winnerUserId,
    score: m.score,
    playing,
    refAt: desk.refAt,
  }
}

function activeEvents(): Event[] {
  return allEvents().filter(e => e.status === 'live' || e.status === 'open' || matchesForComp(e.id).length > 0)
}

export function buildCenterSnapshot(meUid?: string, role?: string): CenterSnapshot {
  const ranks = rankMap()
  const numCache = new Map<string, Map<string, number>>()
  const numsFor = (compId: string) => {
    let n = numCache.get(compId)
    if (!n) { n = matchNums(compId); numCache.set(compId, n) }
    return n
  }
  const evBy = new Map(allEvents().map(e => [e.id, e]))
  const now = Date.now()
  const all = allMatches().filter(m => {
    const e = evBy.get(m.compId)
    return e && (e.status === 'live' || e.status === 'open' || m.status !== 'done' || now - m.createdAt < 7 * 86400000)
  })

  const asCenter = (m: Match) => {
    const ev = evBy.get(m.compId)
    if (!ev) return null
    return toCenter(m, ev, ranks, numsFor(m.compId))
  }

  const liveSrc = all.filter(m => m.status === 'ready' && !m.cancelled)
  const live = liveSrc.map(asCenter).filter(Boolean) as CenterMatch[]
  live.sort((a, b) => (b.calledAt ?? 0) - (a.calledAt ?? 0) || a.gamesAhead - b.gamesAhead)

  const recent = all
    .filter(m => m.status === 'done')
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 24)
    .map(asCenter)
    .filter(Boolean) as CenterMatch[]

  const mineSrc = meUid ? matchesForUser(meUid) : []
  const mine = mineSrc.map(asCenter).filter(Boolean) as CenterMatch[]
  const next = mine.find(m => m.status !== 'done' && !m.cancelled)

  const provMap = new Map<string, { key: string; label: string; live: number; done: number }>()
  for (const m of all) {
    if (m.stage !== 'prelim' || !m.groupKey) continue
    const label = m.groupKey.split(':')[1] || m.groupKey
    const cur = provMap.get(m.groupKey) ?? { key: m.groupKey, label, live: 0, done: 0 }
    if (m.status === 'ready' && !m.cancelled) cur.live++
    if (m.status === 'done') cur.done++
    provMap.set(m.groupKey, cur)
  }
  const provinces = Array.from(provMap.values()).sort((a, b) => b.live - a.live || b.done - a.done)

  const followed = meUid ? followeesOf(meUid) : []
  const followSet = new Set(followed)
  const playerMap = new Map<string, { uid: string; tag: string; name: string; city: string; hasPhoto: boolean; nextLabel: string; followed: boolean }>()
  for (const row of live) {
    for (const p of [row.p1, row.p2]) {
      if (!p || playerMap.has(p.uid)) continue
      playerMap.set(p.uid, {
        uid: p.uid, tag: p.tag, name: p.name, city: p.city, hasPhoto: p.hasPhoto,
        nextLabel: `${row.eventTitle} · ${row.roundLabel}`,
        followed: followSet.has(p.uid),
      })
    }
  }
  const players = Array.from(playerMap.values()).sort((a, b) => Number(b.followed) - Number(a.followed) || a.name.localeCompare(b.name, 'fa'))

  const events = activeEvents()
    .filter(e => matchesForComp(e.id).length > 0)
    .map(e => ({ id: e.id, title: e.title, disc: e.disc }))

  const rules: Record<string, string[]> = {}
  for (const e of events) {
    const r = rulesForDisc(e.disc)
    if (r) rules[e.disc] = r.rules
  }

  const isAdmin = role === 'admin' || role === 'organizer'
  let desk: CenterSnapshot['desk']
  if (isAdmin) {
    const waiting = live.filter(m => !m.calledAt)
    const playing = live.filter(m => m.playing || (!!m.calledAt && !m.playing))
    const late = live.filter(m => m.calledAt && now - m.calledAt > LATE_MS && !m.playing)
    const refs = live.filter(m => m.refAt).concat(recent.filter(m => m.refAt)).slice(0, 20)
    const absent = live.filter(m => {
      if (!m.calledAt || now - m.calledAt < ABSENT_MS) return false
      const a = m.p1?.here, b = m.p2?.here
      return (a && !b) || (b && !a)
    })
    const byStation = new Map<number, CenterMatch[]>()
    for (const m of live) {
      if (!m.station) continue
      const arr = byStation.get(m.station) ?? []
      arr.push(m)
      byStation.set(m.station, arr)
    }
    const stations = Array.from(byStation.entries()).sort((a, b) => a[0] - b[0]).map(([n, ms]) => {
      const current = ms.find(x => x.playing) ?? ms.find(x => x.calledAt)
      const nextM = ms.find(x => x.id !== current?.id)
      return {
        n,
        current: current ? `${current.p1?.name ?? '—'} × ${current.p2?.name ?? '—'}` : undefined,
        next: nextM ? `${nextM.p1?.name ?? '—'} × ${nextM.p2?.name ?? '—'}` : undefined,
        status: current?.playing ? 'در حال برگزاری' : current?.calledAt ? 'فراخوان' : 'آزاد',
      }
    })
    desk = { waiting, playing, late, refs, absent, stations }
  }

  return {
    isAdmin, meUid,
    defaultTab: next ? 'mine' : 'live',
    next, mine, live: live.slice(0, 40), recent,
    provinces, players: players.slice(0, 60), events, followed, rules, desk,
  }
}

export function callCopy(num: number, station: number): string {
  return `لطفاً برای بازی شماره ${num} روی دستگاه ${station} حاضر شوید.`
}
