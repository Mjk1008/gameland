// Team (2v2) tournament engine — a deliberate twin of bracket.ts, not a
// generalization of it. bracket.ts is frozen for the solo path (docs/27 §1.2):
// a bug here can never touch a 1v1 event, since the two engines share only
// pure/opaque helpers (rng, shuffle, seedFrom, distributeSeats, DEFAULT_QUALIFY)
// plus structural match lookups (matchesForComp, findNextMatch, clear*) that
// were already participant-agnostic before this file existed.
//
// Every team function below mirrors its solo counterpart in bracket.ts almost
// line-for-line, with team fields (p1TeamId/p2TeamId/winnerTeamId) in place of
// user fields. Keep it that way on future edits — do not converge the two
// engines into one until 2v2 has run a real competition (docs/27 §11 risk #4).

import {
  Match, GroupMode, Team,
  clearMatchesForComp, clearMatchesByStage, clearMatchesForGroup, pushMatch, saveMatch, matchesForComp, getMatch,
  findNextMatch, prelimGroupKeys, currentTeamMembers, getUserById, seatableTeamsForComp,
  getEventConfig, setEventConfig, qualifyKey, pushNotif, getEvent,
  getRegistration, settledAttempts,
} from './store'
import { rng, shuffle, seedFrom, distributeSeats, distributeIntoBrackets, distributeSeatsToCount, spreadSeats, randomSeats, seedBracketSlots, countsOf, DEFAULT_QUALIFY, getFinalPool, entryCapFor } from './bracket'
import { drawProvinceOf, provincesInDrawGroup, resolveProvince } from './iran-geo'

// Team's group key: captain's city/province (surfaced at team-creation time),
// same `${mode}:${value}` format as the solo groupKeyOf — so prelimGroupKeys(),
// BracketView's scope list, and the city-grouped display all need zero changes
// to handle a team event (docs/27 §4.2, founder call §12 Q1).
export function teamGroupKeyOf(team: Team, mode: GroupMode): string {
  const captain = getUserById(team.captainId)
  if (mode === 'province') return `province:${drawProvinceOf(resolveProvince(captain?.province, captain?.city))}`
  return `city:${captain?.city || 'نامشخص'}`
}

function feedTeamWinner(m: Match) {
  const next = findNextMatch(m)
  if (!next) return
  if (m.slot % 2 === 0) next.p1TeamId = m.winnerTeamId
  else                  next.p2TeamId = m.winnerTeamId
  if (next.p1TeamId && next.p2TeamId) next.status = 'ready'
  saveMatch(next)
}

// `preordered` = seats is already positioned (spreadSeats / randomSeats) —
// don't reshuffle, treat '' entries as intentional byes at their exact index.
// Same contract as bracket.ts's buildTree(preordered). Non-preordered callers
// (the one-shot prelim draw) use seedBracketSlots so rests spread the same
// way as solo — not piled at the end of the tree.
function buildTeamTree(compId: string, stage: 'prelim' | 'final', groupKey: string, bracketIdx: number, seats: string[], seed: number, preordered = false) {
  const padded = preordered ? seats.slice() : seedBracketSlots(seats.filter(Boolean), seed)
  let size = padded.length
  if (size === 0) return
  size = Math.max(2, size)

  for (let i = 0; i < size / 2; i++) {
    const p1 = padded[i * 2], p2 = padded[i * 2 + 1]
    pushMatch({
      id: 'm_' + Math.random().toString(36).slice(2, 10),
      compId, stage, groupKey, bracket: bracketIdx, round: 1, slot: i,
      p1TeamId: p1 || undefined, p2TeamId: p2 || undefined,
      // See the identical comment in bracket.ts's buildTree — byes are
      // resolved by resolveTeamByes() right below, never pre-resolved here.
      status: (p1 && p2) ? 'ready' : 'pending',
      createdAt: Date.now(),
    })
  }
  let round = 2, count = size / 4
  while (count >= 1) {
    for (let i = 0; i < count; i++) {
      pushMatch({
        id: 'm_' + Math.random().toString(36).slice(2, 10),
        compId, stage, groupKey, bracket: bracketIdx, round, slot: i,
        status: 'pending', createdAt: Date.now(),
      })
    }
    count = Math.floor(count / 2); round++
  }
  resolveTeamByes(compId, stage, groupKey, bracketIdx)
}

function resolveTeamByes(compId: string, stage: 'prelim' | 'final', groupKey: string, bracketIdx: number) {
  const mine = () => matchesForComp(compId).filter(m => m.stage === stage && m.groupKey === groupKey && m.bracket === bracketIdx)
  const byRS = (round: number, slot: number) => mine().find(m => m.round === round && m.slot === slot)
  let changed = true, guard = 0
  while (changed && guard++ < 1000) {
    changed = false
    for (const m of mine().sort((a, b) => a.round - b.round || a.slot - b.slot)) {
      if (m.status === 'done') continue
      const n = (m.p1TeamId ? 1 : 0) + (m.p2TeamId ? 1 : 0)
      if (n === 2) { if (m.status !== 'ready') { m.status = 'ready'; saveMatch(m); changed = true } continue }
      let feedersDone = true
      if (m.round > 1) {
        const f1 = byRS(m.round - 1, m.slot * 2), f2 = byRS(m.round - 1, m.slot * 2 + 1)
        feedersDone = !!f1 && !!f2 && f1.status === 'done' && f2.status === 'done'
      }
      if (!feedersDone) continue
      if (n === 1) { m.winnerTeamId = m.p1TeamId || m.p2TeamId; m.status = 'done'; saveMatch(m); feedTeamWinner(m); changed = true }
      else { m.status = 'done'; saveMatch(m); changed = true }
    }
  }
}

// Only seatable teams draw — both members 'accepted' AND both hold an
// 'approved' Registration (docs/27 §3.3). The caller (draw route) is
// responsible for passing only seatable teams; this function trusts its input
// the same way generatePrelims trusts the registrations list it's given.
export interface TeamDrawInput { compId: string; teams: Team[]; groupMode?: GroupMode }
export async function generateTeamPrelims({ compId, teams, groupMode }: TeamDrawInput): Promise<{ groups: number; brackets: number; matches: number }> {
  const mode: GroupMode = groupMode ?? getEventConfig(compId).groupMode ?? 'city'
  await clearMatchesForComp(compId)

  const groups = new Map<string, { userId: string; attempts: number }[]>()
  for (const t of teams) {
    // Seat by what the captain has actually SETTLED, not the team's raw
    // attempts — an unpaid top-up bumps t.attempts immediately (createTeam
    // mirrors it in unconditionally) but shouldn't buy the team extra seats
    // before an admin ever approves the payment. Same rule the solo draw
    // already applies via settledAttempts() in bracket.ts generatePrelims.
    const capReg = getRegistration(t.captainId, compId)
    const k = capReg ? settledAttempts(capReg) : 0
    if (k < 1) continue
    const gk = teamGroupKeyOf(t, mode)
    if (!groups.has(gk)) groups.set(gk, [])
    groups.get(gk)!.push({ userId: t.id, attempts: k })   // distributeSeats is opaque on the id field — a team id works verbatim
  }

  const qualify: Record<string, number> = {}
  let bracketCount = 0
  for (const [gk, seats] of groups) {
    const dist = distributeSeats(seats, seedFrom(compId + gk))
    dist.forEach((ids, idx) => {
      if (ids.length === 0) return
      const bIdx = idx + 1
      buildTeamTree(compId, 'prelim', gk, bIdx, ids, seedFrom(compId + gk + bIdx))
      qualify[qualifyKey(gk, bIdx)] = DEFAULT_QUALIFY
      bracketCount++
    })
  }
  const unpublished: Record<string, boolean> = { ...(getEventConfig(compId).publishedGroups ?? {}) }
  for (const gk of groups.keys()) unpublished[gk] = false
  setEventConfig(compId, { groupMode: mode, qualify, publishedGroups: unpublished })
  return { groups: groups.size, brackets: bracketCount, matches: matchesForComp(compId).length }
}

// Twin of generateDirectBracket — one tree, no grouping. A team's k سهم
// become min(k, entryCap) spread seats (own copies meet only late), same as
// treating the team as one account.
export async function generateTeamDirectBracket(
  { compId, teams }: { compId: string; teams: Team[] },
): Promise<{ seats: number; players: number; matches: number }> {
  await clearMatchesForComp(compId)
  const cap = entryCapFor(compId)
  const entries = teams
    .map(t => {
      const capReg = getRegistration(t.captainId, compId)
      const k = capReg ? settledAttempts(capReg) : 0
      return { userId: t.id, count: Math.min(Math.max(0, k), cap) }
    })
    .filter(e => e.count > 0)
  const seats = spreadSeats(entries, seedFrom(compId + 'direct'))
  if (seats.filter(Boolean).length >= 2) {
    buildTeamTree(compId, 'final', '', 0, seats, seedFrom(compId + 'direct-tree'), true)
  }
  setEventConfig(compId, {
    bracketMode: 'direct',
    publishedGroups: { ...(getEventConfig(compId).publishedGroups ?? {}), final: false },
  })
  return {
    seats: seats.filter(Boolean).length,
    players: entries.length,
    matches: matchesForComp(compId).length,
  }
}

export interface TeamProvinceDrawInput {
  compId: string
  destProvince: string
  sourceProvince: string
  nBrackets: number
  bracketSize: number
}

// Team twin of bracket.ts's generateProvincePrelims — draw ONE province's
// teams at a time, admin-chosen bracket count/size, other provinces' brackets
// stay put. Same seatable-teams-only rule as generateTeamPrelims above.
export async function generateTeamProvincePrelims(input: TeamProvinceDrawInput): Promise<{
  province: string; source: string; groups: number; brackets: number; seats: number; matches: number; teamIds: string[]
}> {
  const dest = drawProvinceOf((input.destProvince || '').trim() || 'نامشخص')
  const src = (input.sourceProvince || '').trim() || dest
  const N = Math.floor(input.nBrackets)
  const size = Math.floor(input.bracketSize)
  if (N < 1 || N > 16) throw new Error('BRACKET_COUNT')
  if (size < 2 || (size & (size - 1)) !== 0 || size > 128) throw new Error('BRACKET_SIZE')

  const gk = `province:${dest}`
  await clearMatchesForGroup(input.compId, 'prelim', gk)
  if (matchesForComp(input.compId).some(m => m.stage === 'final')) {
    await clearMatchesByStage(input.compId, 'final')
  }

  const seated = new Set<string>()
  for (const m of matchesForComp(input.compId)) {
    if (m.stage !== 'prelim') continue
    if (m.p1TeamId) seated.add(m.p1TeamId)
    if (m.p2TeamId) seated.add(m.p2TeamId)
  }

  const allowed = new Set(src === dest ? provincesInDrawGroup(dest) : [src])
  const teamSeats: { userId: string; attempts: number }[] = []
  for (const t of seatableTeamsForComp(input.compId)) {
    if (seated.has(t.id)) continue
    const captain = getUserById(t.captainId)
    if (!allowed.has(resolveProvince(captain?.province, captain?.city))) continue
    const capReg = getRegistration(t.captainId, input.compId)
    const k = capReg ? settledAttempts(capReg) : 0
    if (k < 1) continue
    teamSeats.push({ userId: t.id, attempts: k })   // distributeIntoBrackets is opaque on the id field — a team id works verbatim
  }

  const tickets = teamSeats.reduce((s, p) => s + p.attempts, 0)
  if (tickets === 0) throw new Error('NO_TICKETS')
  if (N > tickets) throw new Error('TOO_MANY_BRACKETS')
  if (tickets > N * size) throw new Error('CAPACITY')

  const dist = distributeIntoBrackets(teamSeats, N, seedFrom(input.compId + gk + 'into'))
  const cfg = getEventConfig(input.compId)
  const qualify = { ...cfg.qualify }
  for (const k of Object.keys(qualify)) if (k.startsWith(gk + '#')) delete qualify[k]

  let bracketCount = 0
  let seatCount = 0
  dist.forEach((seats, idx) => {
    if (seats.length === 0) return
    const bIdx = idx + 1
    const ordered = spreadSeats(countsOf(seats), seedFrom(input.compId + gk + bIdx + 'spread'), size)
    buildTeamTree(input.compId, 'prelim', gk, bIdx, ordered, seedFrom(input.compId + gk + bIdx), true)
    qualify[qualifyKey(gk, bIdx)] = DEFAULT_QUALIFY
    bracketCount++
    seatCount += seats.length
  })

  setEventConfig(input.compId, {
    groupMode: 'province', qualify,
    publishedGroups: { ...(getEventConfig(input.compId).publishedGroups ?? {}), [gk]: false },
  })
  return {
    province: dest,
    source: src,
    groups: 1,
    brackets: bracketCount,
    seats: seatCount,
    matches: matchesForComp(input.compId).filter(m => m.groupKey === gk).length,
    teamIds: [...new Set(dist.flat())],
  }
}

/** Round-1 prelim seats already held by this team (any group/bracket). */
export function seatCountInTeamPrelims(compId: string, teamId: string): number {
  let c = 0
  for (const m of matchesForComp(compId)) {
    if (m.stage !== 'prelim' || m.round !== 1) continue
    if (m.p1TeamId === teamId) c++
    if (m.p2TeamId === teamId) c++
  }
  return c
}

// Twin of generatePrelimBatch — add prelim brackets for a subset of teams
// (the ترکیبی / leftover pool) without wiping other groups.
export async function generateTeamPrelimBatch(input: {
  compId: string
  groupKey: string
  bracketCount: number
  capacityPerBracket: number
  players: { userId: string; attempts: number }[]
}): Promise<{ brackets: number; matches: number; bracketFrom: number; bracketTo: number }> {
  const { compId, groupKey, capacityPerBracket } = input
  const bracketCount = Math.min(6, Math.max(1, Math.floor(input.bracketCount)))
  const cap = Math.min(2048, Math.max(2, Math.floor(capacityPerBracket)))
  const players = input.players
    .filter(p => p.userId && p.attempts > 0)
    .map(p => {
      const seated = seatCountInTeamPrelims(compId, p.userId)
      const remaining = p.attempts - seated
      return remaining > 0 ? { userId: p.userId, attempts: remaining } : null
    })
    .filter((p): p is { userId: string; attempts: number } => p != null)
  if (players.length === 0) throw new Error('NO_PLAYERS')

  const existing = matchesForComp(compId).filter(m => m.stage === 'prelim' && m.groupKey === groupKey)
  const maxIdx = existing.length ? Math.max(...existing.map(m => m.bracket)) : 0
  const startIdx = maxIdx + 1

  const dist = distributeSeatsToCount(players, bracketCount, seedFrom(compId + groupKey + startIdx), cap)
  const cfg = getEventConfig(compId)
  const qualify = { ...cfg.qualify }
  let built = 0

  for (let i = 0; i < bracketCount; i++) {
    const { seats, preordered } = dist[i] ?? { seats: [], preordered: false }
    const seatCount = seats.filter(Boolean).length
    if (seatCount === 0) continue
    if (seatCount > cap) throw new Error(`CAPACITY_EXCEEDED:${seatCount}:${cap}`)
    const bIdx = startIdx + built
    buildTeamTree(compId, 'prelim', groupKey, bIdx, seats, seedFrom(compId + groupKey + bIdx), preordered)
    qualify[qualifyKey(groupKey, bIdx)] = qualify[qualifyKey(groupKey, bIdx)] ?? DEFAULT_QUALIFY
    built++
  }
  if (built === 0) throw new Error('NO_PLAYERS')

  const patch: Parameters<typeof setEventConfig>[1] = { qualify }
  if (groupKey.startsWith('province:')) patch.groupMode = 'province'
  else if (groupKey.startsWith('city:')) patch.groupMode = 'city'
  if (maxIdx === 0) patch.publishedGroups = { ...(cfg.publishedGroups ?? {}), [groupKey]: false }
  setEventConfig(compId, patch)
  return {
    brackets: built,
    matches: matchesForComp(compId).length,
    bracketFrom: startIdx,
    bracketTo: startIdx + built - 1,
  }
}

export function setTeamMatchWinner(matchId: string, winnerTeamId: string, score?: string): Match {
  const m = getMatch(matchId)
  if (!m) throw new Error('MATCH_NOT_FOUND')
  if (m.status === 'done') throw new Error('MATCH_ALREADY_DONE')
  if (winnerTeamId !== m.p1TeamId && winnerTeamId !== m.p2TeamId) throw new Error('INVALID_WINNER')
  m.winnerTeamId = winnerTeamId
  m.score = score
  m.status = 'done'
  saveMatch(m)
  feedTeamWinner(m)
  resolveTeamByes(m.compId, m.stage, m.groupKey, m.bracket)
  if (m.stage === 'prelim' && !findNextMatch(m)) {
    // Fan out to both members — the plan's only real behavioral diff from
    // setMatchWinner (docs/27 §4.2). Reuses the existing 'advance' notif type,
    // already in SMS_TRIGGERS, no schema change needed.
    for (const mem of currentTeamMembers(winnerTeamId)) {
      pushNotif(mem.userId, 'advance', 'قهرمان براکت مقدماتی', 'تیمت به مرحلهٔ بعد صعود کرد — منتظر مونتاژ فینال باش.')
    }
  }
  return m
}

export function rankTeamBracket(compId: string, stage: 'prelim' | 'final', groupKey: string, bracket: number): string[] {
  const ms = matchesForComp(compId).filter(m => m.stage === stage && m.groupKey === groupKey && m.bracket === bracket)
  if (ms.length === 0) return []
  const maxRound = Math.max(...ms.map(m => m.round))
  const champion = ms.find(m => m.round === maxRound)?.winnerTeamId
  const elimRound: Record<string, number> = {}
  const slotOf: Record<string, number> = {}
  for (const m of ms) {
    if (m.status === 'done' && m.winnerTeamId) {
      const loser = m.winnerTeamId === m.p1TeamId ? m.p2TeamId : m.p1TeamId
      if (loser) { elimRound[loser] = m.round; slotOf[loser] = m.slot }
    }
    for (const p of [m.p1TeamId, m.p2TeamId]) if (p && slotOf[p] == null) slotOf[p] = m.slot
  }
  const losers = Object.keys(elimRound).filter(u => u !== champion)
  losers.sort((a, b) => elimRound[b] - elimRound[a] || (slotOf[a] ?? 0) - (slotOf[b] ?? 0))
  return champion ? [champion, ...losers] : losers
}

export interface TeamQualifier { teamId: string; groupKey: string; bracket: number; rank: number }
// ESTIMATE for the admin panel only — assembleTeamFinal() below reads the
// final pool (lib/bracket.ts getFinalPool), not this.
export function computeTeamQualifiers(compId: string): TeamQualifier[] {
  const cfg = getEventConfig(compId)
  const all = matchesForComp(compId)
  const seedCap = entryCapFor(compId)
  const held = new Map<string, number>()
  const out: TeamQualifier[] = []
  for (const gk of prelimGroupKeys(compId)) {
    const brackets = Array.from(new Set(all.filter(m => m.stage === 'prelim' && m.groupKey === gk).map(m => m.bracket))).sort((a, b) => a - b)
    for (const b of brackets) {
      const ms = all.filter(m => m.stage === 'prelim' && m.groupKey === gk && m.bracket === b)
      if (!ms.every(m => m.status === 'done')) continue
      const k = cfg.qualify[qualifyKey(gk, b)] ?? DEFAULT_QUALIFY
      if (k <= 0) continue
      const ranked = rankTeamBracket(compId, 'prelim', gk, b)
      let taken = 0
      for (let i = 0; i < ranked.length && taken < k; i++) {
        const teamId = ranked[i]
        if (!teamId) continue
        if ((held.get(teamId) ?? 0) >= seedCap) continue
        held.set(teamId, (held.get(teamId) ?? 0) + 1)
        out.push({ teamId, groupKey: gk, bracket: b, rank: i + 1 })
        taken++
      }
    }
  }
  return out
}

/**
 * Team twin of bracket.ts's bracketQualifyCandidates — same "the matches were
 * about the ticket, not the bracket championship" rule, same round-boundary
 * caveat for a non-power-of-two qualify count. Returns team ids.
 */
export function teamQualifyCandidates(compId: string, groupKey: string, bracket: number): { candidates: string[]; atRound: number; aliveCount: number; exact: boolean } | null {
  const ms = matchesForComp(compId).filter(m => m.stage === 'prelim' && m.groupKey === groupKey && m.bracket === bracket)
  if (ms.length === 0) return null
  const cfg = getEventConfig(compId)
  const k = Math.max(1, cfg.qualify[qualifyKey(groupKey, bracket)] ?? DEFAULT_QUALIFY)
  const maxRound = Math.max(...ms.map(m => m.round))
  const byRound = (r: number) => ms.filter(m => m.round === r)
  const enteringRound = (r: number) => Array.from(new Set(byRound(r).flatMap(m => [m.p1TeamId, m.p2TeamId]).filter((id): id is string => !!id)))

  let best: { candidates: string[]; atRound: number } = { candidates: enteringRound(1), atRound: 0 }
  for (let r = 1; r <= maxRound; r++) {
    const rms = byRound(r)
    if (!rms.every(m => m.status === 'done')) break
    const survivors = r < maxRound ? enteringRound(r + 1) : (rms[0]?.winnerTeamId ? [rms[0].winnerTeamId] : [])
    if (survivors.length < k) break
    best = { candidates: survivors, atRound: r }
  }
  return { ...best, aliveCount: best.candidates.length, exact: best.candidates.length === k }
}

// Twin of assembleFinal — one pool row = one team's سهم count. Multi-entry
// teams get spread seats unless the admin turns on finalRandomSeeding.
export async function assembleTeamFinal(compId: string): Promise<{ seats: number; players: number; capped: boolean }> {
  const cfg = getEventConfig(compId)
  const cap = getEvent(compId)?.finalSize ?? 128

  const pool = getFinalPool(compId)
  if (pool.length === 0) throw new Error('EMPTY_POOL')
  let entries = pool.map(p => ({ userId: p.userId, count: Math.max(1, Math.floor(p.sahm)) }))

  if (cfg.finalSeeding?.length) {
    const rankOf = new Map(cfg.finalSeeding.map((u, i) => [u, i]))
    entries.sort((a, b) => (rankOf.get(a.userId) ?? 1e9) - (rankOf.get(b.userId) ?? 1e9))
  } else {
    entries = shuffle(entries, rng(seedFrom(compId + 'final')))
  }

  let capped = false
  const kept: typeof entries = []
  let seatSum = 0
  for (const e of entries) {
    if (seatSum + e.count > cap) { capped = true; break }
    kept.push(e); seatSum += e.count
  }

  await clearMatchesByStage(compId, 'final')
  const seats = cfg.finalRandomSeeding
    ? randomSeats(kept, seedFrom(compId + 'final-tree'))
    : spreadSeats(kept, seedFrom(compId + 'final-tree'))
  if (seats.filter(Boolean).length >= 2) buildTeamTree(compId, 'final', '', 0, seats, seedFrom(compId + 'final-tree'), true)
  setEventConfig(compId, { publishedGroups: { ...(getEventConfig(compId).publishedGroups ?? {}), final: false } })
  return { seats: seatSum, players: kept.length, capped }
}
