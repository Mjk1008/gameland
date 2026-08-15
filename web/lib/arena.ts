// Play Arena («میدون») — in-memory state + business rules. Persists via persist.play*.
import { persist } from './db/persistence'
import {
  ARENA_REQUEST_TTL_HOURS, ARENA_CONFIRM_WINDOW_HOURS, ARENA_MAX_OPEN_REQUESTS,
  ARENA_MAX_OPEN_PER_DISC, ARENA_REQUEST_COOLDOWN_HOURS, ARENA_FRAUD_RATIO_REQUESTS,
  ARENA_FRAUD_COOLDOWN_HOURS, ARENA_WIN_POINTS_BO1, ARENA_WIN_POINTS_BO3,
  ARENA_MAX_SCORED_WINS_PER_30D, ARENA_NOTE_MAX_LEN,
} from './arena-config'
import { isValidArenaSlot } from './arena-slots'
import { allGamenets, getUserById, type Gamenet } from './store'
import type { Disc } from './mock-data'

export type PlayRequestStatus = 'open' | 'matched' | 'expired' | 'cancelled'
export type PlayMatchStatus = 'pending_confirm' | 'agreed' | 'scheduled' | 'confirmed' | 'lapsed' | 'cancelled'

export interface PlayRequest {
  id: string
  userId: string
  disc: Disc
  bestOf: 1 | 3 | 5
  city: string
  province: string
  note: string
  status: PlayRequestStatus
  expiresAt: number
  createdAt: number
}

export interface PlayMatch {
  id: string
  requestId: string
  requesterId: string
  acceptorId: string
  status: PlayMatchStatus
  requesterConfirmedAt?: number
  acceptorConfirmedAt?: number
  bookInitiatorId?: string
  bookCounterById?: string
  gamenetId?: string
  scheduledAt?: number
  confirmDeadline?: number
  requesterResult?: string
  acceptorResult?: string
  winnerUserId?: string
  confirmedAt?: number
  createdAt: number
}

export type ArenaNotify = { userId: string; title: string; body: string }

const playRequests = new Map<string, PlayRequest>()
const playMatches = new Map<string, PlayMatch>()

function ms(v: unknown): number {
  return v instanceof Date ? v.getTime() : typeof v === 'number' ? v : Date.now()
}

function rid(prefix: string) { return prefix + Math.random().toString(36).slice(2, 10) }

export function hydratePlayRequest(r: {
  id: string; userId: string; disc: string; bestOf: number; city: string; province: string
  note?: string; status: string; expiresAt: unknown; createdAt: unknown
}) {
  playRequests.set(r.id, {
    id: r.id, userId: r.userId, disc: r.disc as Disc, bestOf: r.bestOf as 1 | 3 | 5,
    city: r.city, province: r.province, note: r.note ?? '',
    status: r.status as PlayRequestStatus, expiresAt: ms(r.expiresAt), createdAt: ms(r.createdAt),
  })
}

export function hydratePlayMatch(m: {
  id: string; requestId: string; requesterId: string; acceptorId: string; status: string
  requesterConfirmedAt?: unknown; acceptorConfirmedAt?: unknown
  bookInitiatorId?: string; gamenetId?: string; scheduledAt?: unknown; confirmDeadline?: unknown
  requesterResult?: string; acceptorResult?: string; winnerUserId?: string; confirmedAt?: unknown
  createdAt: unknown
}) {
  playMatches.set(m.id, {
    id: m.id, requestId: m.requestId, requesterId: m.requesterId, acceptorId: m.acceptorId,
    status: m.status as PlayMatchStatus,
    requesterConfirmedAt: m.requesterConfirmedAt != null ? ms(m.requesterConfirmedAt) : undefined,
    acceptorConfirmedAt: m.acceptorConfirmedAt != null ? ms(m.acceptorConfirmedAt) : undefined,
    bookInitiatorId: m.bookInitiatorId ?? undefined,
    gamenetId: m.gamenetId ?? undefined,
    scheduledAt: m.scheduledAt != null ? ms(m.scheduledAt) : undefined,
    confirmDeadline: m.confirmDeadline != null ? ms(m.confirmDeadline) : undefined,
    requesterResult: m.requesterResult ?? undefined,
    acceptorResult: m.acceptorResult ?? undefined,
    winnerUserId: m.winnerUserId ?? undefined,
    confirmedAt: m.confirmedAt != null ? ms(m.confirmedAt) : undefined,
    createdAt: ms(m.createdAt),
  })
}

function persistRequest(r: PlayRequest) {
  persist.playRequest.upsert({
    id: r.id, userId: r.userId, disc: r.disc, bestOf: r.bestOf, city: r.city, province: r.province,
    note: r.note, status: r.status, expiresAt: new Date(r.expiresAt), createdAt: new Date(r.createdAt),
  })
}

function persistMatch(m: PlayMatch) {
  persist.playMatch.upsert({
    id: m.id, requestId: m.requestId, requesterId: m.requesterId, acceptorId: m.acceptorId,
    status: m.status,
    requesterConfirmedAt: m.requesterConfirmedAt ? new Date(m.requesterConfirmedAt) : null,
    acceptorConfirmedAt: m.acceptorConfirmedAt ? new Date(m.acceptorConfirmedAt) : null,
    bookInitiatorId: m.bookInitiatorId ?? null,
    gamenetId: m.gamenetId ?? null,
    scheduledAt: m.scheduledAt ? new Date(m.scheduledAt) : null,
    confirmDeadline: m.confirmDeadline ? new Date(m.confirmDeadline) : null,
    requesterResult: m.requesterResult ?? null,
    acceptorResult: m.acceptorResult ?? null,
    winnerUserId: m.winnerUserId ?? null,
    confirmedAt: m.confirmedAt ? new Date(m.confirmedAt) : null,
    createdAt: new Date(m.createdAt),
  })
}

function openRequestsForUser(uid: string) {
  return [...playRequests.values()].filter(r => r.userId === uid && r.status === 'open')
}

function lastRequestEnd(uid: string, disc: string): number | null {
  const rows = [...playRequests.values()]
    .filter(r => r.userId === uid && r.disc === disc && (r.status === 'expired' || r.status === 'cancelled'))
    .sort((a, b) => b.createdAt - a.createdAt)
  const last = rows[0]
  if (!last) return null
  return last.status === 'expired' ? last.expiresAt : last.createdAt
}

export function arenaFraudRatio(uid: string): number {
  const since = Date.now() - 30 * 86400000
  const created = [...playRequests.values()].filter(r => r.userId === uid && r.createdAt >= since).length
  const confirmed = [...playMatches.values()].filter(m =>
    m.status === 'confirmed' && m.createdAt >= since &&
    (m.requesterId === uid || m.acceptorId === uid)).length
  return created / Math.max(1, confirmed)
}

function throttleActive(uid: string): boolean {
  return arenaFraudRatio(uid) >= ARENA_FRAUD_RATIO_REQUESTS &&
    [...playMatches.values()].filter(m =>
      m.status === 'confirmed' && (m.requesterId === uid || m.acceptorId === uid)).length === 0
}

export function expireStaleRequests() {
  const now = Date.now()
  for (const r of playRequests.values()) {
    if (r.status === 'open' && r.expiresAt <= now) {
      r.status = 'expired'
      persistRequest(r)
    }
  }
}

export function lapseStaleMatches() {
  const now = Date.now()
  for (const m of playMatches.values()) {
    if (m.status !== 'scheduled') continue
    if (!m.confirmDeadline || m.confirmDeadline > now) continue
    if (m.requesterResult && m.acceptorResult && m.requesterResult !== m.acceptorResult) {
      m.status = 'lapsed'
      persistMatch(m)
      continue
    }
    if (!m.requesterResult || !m.acceptorResult) {
      m.status = 'lapsed'
      persistMatch(m)
    }
  }
}

export function countOpenRequestsInCity(city: string, province?: string): number {
  expireStaleRequests()
  return [...playRequests.values()].filter(r =>
    r.status === 'open' && r.city === city && (!province || r.province === province),
  ).length
}

export function listOpenRequests(filters: { city?: string; province?: string; disc?: string }) {
  expireStaleRequests()
  return [...playRequests.values()]
    .filter(r => r.status === 'open')
    .filter(r => !filters.city || r.city === filters.city)
    .filter(r => !filters.province || r.province === filters.province)
    .filter(r => !filters.disc || r.disc === filters.disc)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function getPlayRequest(id: string) { return playRequests.get(id) }
export function getPlayMatch(id: string) { return playMatches.get(id) }

export function matchForRequest(requestId: string) {
  return [...playMatches.values()].find(m => m.requestId === requestId && m.status !== 'cancelled')
}

export function createPlayRequest(uid: string, input: {
  disc: Disc; bestOf: 1 | 3 | 5; city: string; province: string; note?: string
}): { ok: true; request: PlayRequest } | { ok: false; error: string } {
  expireStaleRequests()
  const u = getUserById(uid)
  if (!u) return { ok: false, error: 'کاربر پیدا نشد' }
  if (!u.discs?.includes(input.disc)) return { ok: false, error: 'این رشته تو پروفایلت نیست' }
  if (![1, 3, 5].includes(input.bestOf)) return { ok: false, error: 'Best of نامعتبر' }
  if (!input.city || !input.province) return { ok: false, error: 'شهر و استان الزامی' }

  const open = openRequestsForUser(uid)
  const maxOpen = throttleActive(uid) ? 1 : ARENA_MAX_OPEN_REQUESTS
  if (open.length >= maxOpen) return { ok: false, error: `حداکثر ${maxOpen} درخواست باز داری` }
  if (open.some(r => r.disc === input.disc)) return { ok: false, error: 'برای این رشته درخواست باز داری' }

  const lastEnd = lastRequestEnd(uid, input.disc)
  const cooldownMs = (throttleActive(uid) ? ARENA_FRAUD_COOLDOWN_HOURS : ARENA_REQUEST_COOLDOWN_HOURS) * 3600000
  if (lastEnd && Date.now() - lastEnd < cooldownMs) {
    return { ok: false, error: 'باید کمی صبر کنی قبل از درخواست دوباره' }
  }

  const note = (input.note ?? '').trim().slice(0, ARENA_NOTE_MAX_LEN)
  const now = Date.now()
  const r: PlayRequest = {
    id: rid('pr_'), userId: uid, disc: input.disc, bestOf: input.bestOf,
    city: input.city, province: input.province, note,
    status: 'open', expiresAt: now + ARENA_REQUEST_TTL_HOURS * 3600000, createdAt: now,
  }
  playRequests.set(r.id, r)
  persistRequest(r)
  return { ok: true, request: r }
}

export function cancelPlayRequest(uid: string, requestId: string): { ok: boolean; error?: string } {
  const r = playRequests.get(requestId)
  if (!r || r.userId !== uid) return { ok: false, error: 'درخواست پیدا نشد' }
  if (r.status !== 'open') return { ok: false, error: 'دیگه قابل لغو نیست' }
  r.status = 'cancelled'
  persistRequest(r)
  return { ok: true }
}

export function acceptPlayRequest(acceptorId: string, requestId: string): { ok: true; match: PlayMatch; notify: ArenaNotify[] } | { ok: false; error: string } {
  expireStaleRequests()
  const r = playRequests.get(requestId)
  if (!r || r.status !== 'open') return { ok: false, error: 'درخواست دیگه باز نیست' }
  if (r.userId === acceptorId) return { ok: false, error: 'نمی‌تونی درخواست خودت رو قبول کنی' }
  if (r.expiresAt <= Date.now()) { r.status = 'expired'; persistRequest(r); return { ok: false, error: 'منقضی شده' } }
  if (matchForRequest(requestId)) return { ok: false, error: 'قبلاً قبول شده' }

  const acceptor = getUserById(acceptorId)
  if (!acceptor?.discs?.includes(r.disc)) return { ok: false, error: 'این رشته تو پروفایلت نیست' }

  r.status = 'matched'
  persistRequest(r)

  const now = Date.now()
  const m: PlayMatch = {
    id: rid('pm_'), requestId, requesterId: r.userId, acceptorId,
    status: 'pending_confirm', createdAt: now,
  }
  playMatches.set(m.id, m)
  persistMatch(m)

  const reqUser = getUserById(r.userId)
  return {
    ok: true, match: m,
    notify: [{
      userId: r.userId,
      title: '«میدون» درخواستت قبول شد',
      body: `@${acceptor.tag} درخواست ${r.disc} رو قبول کرد — تأیید بازی رو بزن.`,
    }],
  }
}

export function confirmPair(uid: string, matchId: string): { ok: true; match: PlayMatch; notify: ArenaNotify[] } | { ok: false; error: string } {
  const m = playMatches.get(matchId)
  if (!m || m.status !== 'pending_confirm') return { ok: false, error: 'مسابقه در این مرحله نیست' }
  if (uid !== m.requesterId && uid !== m.acceptorId) return { ok: false, error: 'دسترسی نداری' }

  const now = Date.now()
  if (uid === m.requesterId) m.requesterConfirmedAt = now
  else m.acceptorConfirmedAt = now

  const notify: ArenaNotify[] = []
  if (m.requesterConfirmedAt && m.acceptorConfirmedAt) {
    m.status = 'agreed'
    const other = uid === m.requesterId ? m.acceptorId : m.requesterId
    notify.push({
      userId: other,
      title: '«میدون» هر دو تأیید کردید',
      body: 'حالا ساعت و گیم‌نت رو بوک کنید.',
    })
  } else {
    const other = uid === m.requesterId ? m.acceptorId : m.requesterId
    notify.push({
      userId: other,
      title: '«میدون» طرف مقابل تأیید کرد',
      body: 'تو هم تأیید بازی رو بزن.',
    })
  }
  persistMatch(m)
  return { ok: true, match: m, notify }
}

export function verifiedGamenetsForPicker(city: string, province: string): Gamenet[] {
  return allGamenets()
    .filter(g => g.status === 'verified')
    .sort((a, b) => {
      const score = (g: Gamenet) => (g.city === city ? 0 : g.province === province ? 1 : 2)
      return score(a) - score(b) || b.createdAt - a.createdAt
    })
}

export function bookPlayMatch(uid: string, matchId: string, gamenetId: string, scheduledAt: number): {
  ok: true; match: PlayMatch; scheduled: boolean; notify: ArenaNotify[]
} | { ok: false; error: string } {
  const m = playMatches.get(matchId)
  if (!m || m.status !== 'agreed') return { ok: false, error: 'اول هر دو باید بازی رو تأیید کنید' }
  if (uid !== m.requesterId && uid !== m.acceptorId) return { ok: false, error: 'دسترسی نداری' }
  if (!isValidArenaSlot(scheduledAt)) return { ok: false, error: 'زمان نامعتبر' }

  const gn = allGamenets().find(g => g.id === gamenetId && g.status === 'verified')
  if (!gn) return { ok: false, error: 'گیم‌نت پیدا نشد' }

  const notify: ArenaNotify[] = []

  if (!m.bookInitiatorId) {
    m.bookInitiatorId = uid
    m.gamenetId = gamenetId
    m.scheduledAt = scheduledAt
    persistMatch(m)
    const other = uid === m.requesterId ? m.acceptorId : m.requesterId
    notify.push({
      userId: other,
      title: '«میدون» پیشنهاد بوک',
      body: `${gn.name} · ${new Date(scheduledAt).toLocaleString('fa-IR')} — تأیید کن.`,
    })
    return { ok: true, match: m, scheduled: false, notify }
  }

  if (m.gamenetId === gamenetId && m.scheduledAt === scheduledAt) {
    m.status = 'scheduled'
    m.confirmDeadline = scheduledAt + ARENA_CONFIRM_WINDOW_HOURS * 3600000
    persistMatch(m)
    const other = uid === m.requesterId ? m.acceptorId : m.requesterId
    notify.push({
      userId: other,
      title: '«میدون» بوک شد',
      body: `بازی در ${gn.name} ثبت شد.`,
    })
    notify.push({
      userId: uid,
      title: '«میدون» بوک شد',
      body: `بازی در ${gn.name} ثبت شد.`,
    })
    return { ok: true, match: m, scheduled: true, notify }
  }

  if (m.bookInitiatorId === uid) {
    m.gamenetId = gamenetId
    m.scheduledAt = scheduledAt
    persistMatch(m)
    const other = uid === m.requesterId ? m.acceptorId : m.requesterId
    notify.push({
      userId: other,
      title: '«میدون» پیشنهاد بوک عوض شد',
      body: `${gn.name} · ${new Date(scheduledAt).toLocaleString('fa-IR')} — تأیید کن.`,
    })
    return { ok: true, match: m, scheduled: false, notify }
  }

  if (m.bookCounterById) {
    return { ok: false, error: 'فقط یک بار می‌تونی پیشنهاد دیگه بدی — تأیید کن یا انصراف بده' }
  }

  m.bookCounterById = uid
  m.bookInitiatorId = uid
  m.gamenetId = gamenetId
  m.scheduledAt = scheduledAt
  persistMatch(m)
  const other = uid === m.requesterId ? m.acceptorId : m.requesterId
  notify.push({
    userId: other,
    title: '«میدون» پیشنهاد جدید',
    body: `${gn.name} · ${new Date(scheduledAt).toLocaleString('fa-IR')} — تأیید کن.`,
  })
  return { ok: true, match: m, scheduled: false, notify }
}

export function cancelPlayMatch(uid: string, matchId: string): { ok: boolean; error?: string } {
  const m = playMatches.get(matchId)
  if (!m) return { ok: false, error: 'پیدا نشد' }
  if (uid !== m.requesterId && uid !== m.acceptorId) return { ok: false, error: 'دسترسی نداری' }
  if (m.status === 'scheduled' || m.status === 'confirmed') return { ok: false, error: 'دیگه قابل لغو نیست' }
  m.status = 'cancelled'
  persistMatch(m)
  return { ok: true }
}

export function submitPlayResult(uid: string, matchId: string, winnerId: string): {
  ok: true; match: PlayMatch; pointsAwarded: number; notify: ArenaNotify[]
} | { ok: false; error: string } {
  lapseStaleMatches()
  const m = playMatches.get(matchId)
  if (!m || m.status !== 'scheduled') return { ok: false, error: 'هنوز وقت نتیجه نیست' }
  if (uid !== m.requesterId && uid !== m.acceptorId) return { ok: false, error: 'دسترسی نداری' }
  if (winnerId !== m.requesterId && winnerId !== m.acceptorId) return { ok: false, error: 'برنده نامعتبر' }
  if (process.env.NODE_ENV !== 'development' && Date.now() < (m.scheduledAt ?? 0)) return { ok: false, error: 'هنوز وقت بازی نشده' }

  if (uid === m.requesterId) m.requesterResult = winnerId
  else m.acceptorResult = winnerId

  const notify: ArenaNotify[] = []
  let pointsAwarded = 0

  if (m.requesterResult && m.acceptorResult) {
    if (m.requesterResult === m.acceptorResult) {
      m.status = 'confirmed'
      m.winnerUserId = winnerId
      m.confirmedAt = Date.now()
      try { require('./ranking-store').touchUserRanking(winnerId) } catch { /* noop */ }
      const req = playRequests.get(m.requestId)
      const bo = req?.bestOf ?? 3
      const base = bo === 1 ? ARENA_WIN_POINTS_BO1 : ARENA_WIN_POINTS_BO3
      const winnerPts = challengePointsForMatch(m, winnerId)
      pointsAwarded = winnerPts > 0 ? base : 0
      const loser = winnerId === m.requesterId ? m.acceptorId : m.requesterId
      notify.push({
        userId: winnerId,
        title: '«میدون» برد ثبت شد',
        body: pointsAwarded > 0 ? `+${pointsAwarded} امتیاز میدون` : 'برد ثبت شد (سقف امتیاز پر شده)',
      })
      notify.push({
        userId: loser,
        title: '«میدون» نتیجه ثبت شد',
        body: 'بازی بسته شد.',
      })
    } else {
      m.status = 'lapsed'
      notify.push(
        { userId: m.requesterId, title: '«میدون»', body: 'نتیجه‌ها یکی نبود — بازی بدون امتیاز بسته شد.' },
        { userId: m.acceptorId, title: '«میدون»', body: 'نتیجه‌ها یکی نبود — بازی بدون امتیاز بسته شد.' },
      )
    }
  }

  persistMatch(m)
  return { ok: true, match: m, pointsAwarded, notify }
}

function challengePointsForMatch(m: PlayMatch, winnerId: string): number {
  const since = Date.now() - 30 * 86400000
  const wins = [...playMatches.values()]
    .filter(x => x.status === 'confirmed' && x.winnerUserId === winnerId && (x.confirmedAt ?? x.createdAt) >= since)
    .sort((a, b) => (b.confirmedAt ?? b.createdAt) - (a.confirmedAt ?? b.createdAt))

  const opponents = new Set<string>()
  let count = 0
  for (const w of wins) {
    const opp = w.requesterId === winnerId ? w.acceptorId : w.requesterId
    if (opponents.has(opp)) continue
    opponents.add(opp)
    count++
  }
  const opp = m.requesterId === winnerId ? m.acceptorId : m.requesterId
  if (opponents.has(opp) && !wins.some(w => w.id === m.id)) return 0
  if (count >= ARENA_MAX_SCORED_WINS_PER_30D && !wins.some(w => w.id === m.id)) return 0
  return 1
}

export function challengePointsOf(uid: string): number {
  const since = Date.now() - 30 * 86400000
  const wins = [...playMatches.values()]
    .filter(m => m.status === 'confirmed' && m.winnerUserId === uid && (m.confirmedAt ?? m.createdAt) >= since)
    .sort((a, b) => (b.confirmedAt ?? b.createdAt) - (a.confirmedAt ?? b.createdAt))

  const opponents = new Set<string>()
  let total = 0
  for (const m of wins) {
    const opp = m.requesterId === uid ? m.acceptorId : m.requesterId
    if (opponents.has(opp)) continue
    opponents.add(opp)
    const req = playRequests.get(m.requestId)
    const bo = req?.bestOf ?? 3
    total += bo === 1 ? ARENA_WIN_POINTS_BO1 : ARENA_WIN_POINTS_BO3
    if (opponents.size >= ARENA_MAX_SCORED_WINS_PER_30D) break
  }
  return total
}

export interface MyArenaSummary {
  openRequest?: PlayRequest
  pendingMatches: PlayMatch[]
  scheduledMatches: PlayMatch[]
  history: PlayMatch[]
}

export function myArenaSummary(uid: string): MyArenaSummary {
  expireStaleRequests()
  lapseStaleMatches()
  const openRequest = [...playRequests.values()].find(r => r.userId === uid && r.status === 'open')
  const mine = [...playMatches.values()].filter(m =>
    (m.requesterId === uid || m.acceptorId === uid) && m.status !== 'cancelled')
  const pendingMatches = mine.filter(m => m.status === 'pending_confirm' || m.status === 'agreed')
  const scheduledMatches = mine.filter(m => m.status === 'scheduled')
  const history = mine.filter(m => m.status === 'confirmed' || m.status === 'lapsed')
    .sort((a, b) => b.createdAt - a.createdAt)
  return { openRequest, pendingMatches, scheduledMatches, history }
}

/** Dev seed — bypass open/cooldown limits; fixed IDs with demo_pr_ / demo_pm_ prefix. */
export function seedPlayRequestRaw(r: PlayRequest) {
  playRequests.set(r.id, r)
  persistRequest(r)
}

export function seedPlayMatchRaw(m: PlayMatch) {
  playMatches.set(m.id, m)
  persistMatch(m)
}

export function clearDemoArenaData() {
  for (const id of [...playRequests.keys()]) {
    if (id.startsWith('demo_pr_')) playRequests.delete(id)
  }
  for (const id of [...playMatches.keys()]) {
    if (id.startsWith('demo_pm_')) playMatches.delete(id)
  }
}

/** Dev reseed — wipe all arena rows from memory (DB rows orphaned until reconnect). */
export function clearAllArenaData() {
  playRequests.clear()
  playMatches.clear()
}

export interface ArenaMonthStats {
  periodDays: number
  requestsTotal: number
  requestsOpen: number
  requestsMatched: number
  requestsExpired: number
  requestsCancelled: number
  matchesTotal: number
  matchesConfirmed: number
  matchesLapsed: number
  matchesPending: number
  matchesScheduled: number
  matchesCancelled: number
  ccrPercent: number
  uniqueRequesters: number
  uniqueWithConfirmed: number
  citiesWithOpen: number
}

export function arenaMonthStats(sinceMs = Date.now() - 30 * 86400000): ArenaMonthStats {
  expireStaleRequests()
  lapseStaleMatches()
  const reqs = [...playRequests.values()].filter(r => r.createdAt >= sinceMs)
  const matches = [...playMatches.values()].filter(m => m.createdAt >= sinceMs)
  const openNow = [...playRequests.values()].filter(r => r.status === 'open')
  const confirmed = matches.filter(m => m.status === 'confirmed')
  const confirmedUsers = new Set<string>()
  for (const m of confirmed) {
    confirmedUsers.add(m.requesterId)
    confirmedUsers.add(m.acceptorId)
  }
  const totalCreated = reqs.length
  return {
    periodDays: 30,
    requestsTotal: totalCreated,
    requestsOpen: openNow.length,
    requestsMatched: reqs.filter(r => r.status === 'matched').length,
    requestsExpired: reqs.filter(r => r.status === 'expired').length,
    requestsCancelled: reqs.filter(r => r.status === 'cancelled').length,
    matchesTotal: matches.filter(m => m.status !== 'cancelled').length,
    matchesConfirmed: confirmed.length,
    matchesLapsed: matches.filter(m => m.status === 'lapsed').length,
    matchesPending: matches.filter(m => m.status === 'pending_confirm' || m.status === 'agreed').length,
    matchesScheduled: matches.filter(m => m.status === 'scheduled').length,
    matchesCancelled: matches.filter(m => m.status === 'cancelled').length,
    ccrPercent: totalCreated > 0 ? Math.round((confirmed.length / totalCreated) * 1000) / 10 : 0,
    uniqueRequesters: new Set(reqs.map(r => r.userId)).size,
    uniqueWithConfirmed: confirmedUsers.size,
    citiesWithOpen: new Set(openNow.map(r => `${r.city}|${r.province}`)).size,
  }
}

export function arenaFraudLeaderboard(limit = 30): { uid: string; requests: number; confirmed: number; ratio: number }[] {
  const since = Date.now() - 30 * 86400000
  const byUser = new Map<string, { requests: number; confirmed: number }>()
  for (const r of playRequests.values()) {
    if (r.createdAt < since) continue
    const row = byUser.get(r.userId) ?? { requests: 0, confirmed: 0 }
    row.requests++
    byUser.set(r.userId, row)
  }
  for (const m of playMatches.values()) {
    if (m.status !== 'confirmed' || m.createdAt < since) continue
    for (const uid of [m.requesterId, m.acceptorId]) {
      const row = byUser.get(uid) ?? { requests: 0, confirmed: 0 }
      row.confirmed++
      byUser.set(uid, row)
    }
  }
  return [...byUser.entries()]
    .map(([uid, v]) => ({ uid, ...v, ratio: v.requests / Math.max(1, v.confirmed) }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, limit)
}
