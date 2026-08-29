// Tournament engine.
//
// Flow:
//  1. Players register in a city (and province). Each buys 1–6 tickets (سهم).
//  2. Preliminary stage runs PER GROUP (city or province — admin picks the mode).
//     A group has up to 6 brackets (max tickets = 6). Each player's k tickets
//     become k seats spread across k DISTINCT brackets — balanced-random with a
//     bias toward filling the earlier brackets first.
//  3. Each prelim bracket is a single-elim tree. Admin sets how many top players
//     qualify from each bracket to the final.
//  4. The final is one 128-slot single-elim bracket, seeded from all qualifiers.
//     Admin may override the final seeding manually.
//  5. Admin records each match result → winner auto-advances; status goes live.

import {
  Registration, Match, GroupMode,
  clearMatchesForComp, clearMatchesByStage, pushMatch, saveMatch, matchesForComp, getMatch,
  findNextMatch, getUserById, prelimGroupKeys, approvedRegistrationsForComp, setRegSeeds,
  getEventConfig, setEventConfig, qualifyKey, pushNotif, getEvent,
} from './store'
import { DEFAULT_ENTRY_CAP, defaultBracketMode, type BracketMode } from './discipline-format'

// ── deterministic RNG (seedable so a redraw is reproducible) ──
export function rng(seed: number) {
  let s = seed >>> 0
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
export function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
export function seedFrom(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

export const DEFAULT_QUALIFY = 2   // winner + runner-up, until admin changes it

// group key for a user under the chosen mode
function groupKeyOf(userId: string, mode: GroupMode): string {
  const u = getUserById(userId)
  const val = (mode === 'province' ? u?.province : u?.city) || 'نامشخص'
  return `${mode}:${val}`
}

// Deterministic seat distribution: an account with k سهم takes exactly one seat
// in brackets 1..k (0-based 0..k-1). No "least-full" balancing — bracket 0 holds
// every registrant (runs first / earliest date), each later bracket only the
// accounts that bought that many سهم, so early brackets are the fullest on
// purpose (MD-5a). `offset` lets re-entries (MD-5b) start from the first
// not-yet-started bracket instead of 0.
// Returns brackets[i] = list of userIds for bracket i (0-based). Within-bracket
// seeding is randomised later in buildTree.
export function distributeSeats(
  players: { userId: string; attempts: number }[],
  seed: number,
  offset = 0,
): string[][] {
  if (players.length === 0) return []
  const maxK = Math.max(...players.map(p => p.attempts))
  const N = Math.min(6, Math.max(1, offset + maxK))
  const brackets: string[][] = Array.from({ length: N }, () => [])
  // shuffle only for a stable-but-unordered append order (no bracket-choice bias)
  for (const p of shuffle(players, rng(seed))) {
    const k = Math.min(p.attempts, N - offset)
    for (let i = 0; i < k; i++) brackets[offset + i].push(p.userId)
  }
  return brackets
}

/** Max distinct entries one account carries into the final for this event. */
export function entryCapFor(compId: string): number {
  return getEventConfig(compId).entryCap ?? DEFAULT_ENTRY_CAP
}

// Position each account's `count` entries into ONE single-elim tree so its own
// entries are as far apart as possible (meet only in the late rounds), then fill
// the gaps with single-entry players. Returns a padded seat list (length = a
// power of two, '' = bye) ready for buildTree(..., preordered=true).
export function spreadSeats(entries: { userId: string; count: number }[], seed: number): string[] {
  const total = entries.reduce((s, e) => s + Math.max(1, e.count), 0)
  if (total === 0) return []
  let size = 1
  while (size < total) size *= 2
  size = Math.max(2, size)
  const slots: (string | null)[] = Array.from({ length: size }, () => null)

  const nearestFree = (ideal: number): number => {
    for (let d = 0; d < size; d++) {
      const a = (ideal + d) % size, b = (ideal - d + size) % size
      if (slots[a] == null) return a
      if (slots[b] == null) return b
    }
    return -1
  }

  // multi-entry accounts first (biggest first), stride-placed; then singles.
  const ordered = shuffle(entries, rng(seed)).sort((a, b) => Math.max(1, b.count) - Math.max(1, a.count))
  for (const e of ordered) {
    const c = Math.max(1, e.count)
    const stride = size / c
    for (let i = 0; i < c; i++) {
      const pos = nearestFree(Math.round(i * stride))
      if (pos >= 0) slots[pos] = e.userId
    }
  }
  return slots.map(s => s ?? '')
}

// place a finished match's winner into the next round's correct slot
function feedWinner(m: Match) {
  const next = findNextMatch(m)
  if (!next) return
  if (m.slot % 2 === 0) next.p1UserId = m.winnerUserId
  else                  next.p2UserId = m.winnerUserId
  if (next.p1UserId && next.p2UserId) next.status = 'ready'
  saveMatch(next)   // persist the mutated (already in-memory) match
}

// Build a single-elim tree for one bracket from a seat list.
// `preordered` = the seat list is already positioned (spreadSeats) — do NOT
// reshuffle, and treat '' entries as intentional byes at their exact index.
function buildTree(compId: string, stage: 'prelim' | 'final', groupKey: string, bracketIdx: number, seats: string[], seed: number, preordered = false) {
  const players = preordered ? seats.slice() : shuffle(seats, rng(seed))   // random seeding inside the bracket unless pre-positioned
  let size = 1
  while (size < players.length) size *= 2
  size = Math.max(2, size)
  const padded = players.slice()
  while (padded.length < size) padded.push('')          // '' = bye

  for (let i = 0; i < size / 2; i++) {
    const p1 = padded[i * 2], p2 = padded[i * 2 + 1]
    pushMatch({
      id: 'm_' + Math.random().toString(36).slice(2, 10),
      compId, stage, groupKey, bracket: bracketIdx, round: 1, slot: i,
      p1UserId: p1 || undefined, p2UserId: p2 || undefined,
      // Byes are resolved by resolveByes() right below, not pre-resolved here.
      // Pre-setting winnerUserId/status='done' at push time meant resolveByes
      // (which skips already-'done' matches) never called feedWinner() for a
      // bye — the bye winner's advance into round 2 silently never happened,
      // and once the real adjacent match was later played, round 2 was
      // mistaken for its OWN bye (only 1 occupant) and auto-advanced that
      // player again, skipping the actual match against the bye recipient
      // entirely. Only exercised by non-power-of-2 bracket sizes — missed by
      // the Phase 0 differential baseline (deliberately an exact power of 2).
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
  resolveByes(compId, stage, groupKey, bracketIdx)
}

// Settle all byes/empty matches so that only genuine 2-player matches remain
// 'ready' (playable). A match with 1 player whose feeders are fully resolved is
// an auto-advance (bye); a match with 0 players and resolved feeders is dead
// (done, no winner). Runs to a fixpoint so byes cascade up the tree.
function resolveByes(compId: string, stage: 'prelim' | 'final', groupKey: string, bracketIdx: number) {
  const mine = () => matchesForComp(compId).filter(m => m.stage === stage && m.groupKey === groupKey && m.bracket === bracketIdx)
  const byRS = (round: number, slot: number) => mine().find(m => m.round === round && m.slot === slot)
  let changed = true, guard = 0
  while (changed && guard++ < 1000) {
    changed = false
    for (const m of mine().sort((a, b) => a.round - b.round || a.slot - b.slot)) {
      if (m.status === 'done') continue
      const n = (m.p1UserId ? 1 : 0) + (m.p2UserId ? 1 : 0)
      if (n === 2) { if (m.status !== 'ready') { m.status = 'ready'; saveMatch(m); changed = true } continue }
      // feeders resolved?
      let feedersDone = true
      if (m.round > 1) {
        const f1 = byRS(m.round - 1, m.slot * 2), f2 = byRS(m.round - 1, m.slot * 2 + 1)
        feedersDone = !!f1 && !!f2 && f1.status === 'done' && f2.status === 'done'
      }
      if (!feedersDone) continue
      if (n === 1) { m.winnerUserId = m.p1UserId || m.p2UserId; m.status = 'done'; saveMatch(m); feedWinner(m); changed = true }
      else { m.status = 'done'; saveMatch(m); changed = true }   // dead/empty
    }
  }
}

// ── public: generate the preliminary stage ──
export interface DrawInput { compId: string; registrations: Registration[]; groupMode?: GroupMode }
export async function generatePrelims({ compId, registrations, groupMode }: DrawInput): Promise<{ groups: number; brackets: number; matches: number }> {
  const mode: GroupMode = groupMode ?? getEventConfig(compId).groupMode ?? 'city'
  await clearMatchesForComp(compId)

  const groups = new Map<string, { userId: string; attempts: number }[]>()
  for (const r of registrations) {
    const gk = groupKeyOf(r.userId, mode)
    if (!groups.has(gk)) groups.set(gk, [])
    groups.get(gk)!.push({ userId: r.userId, attempts: r.attempts })
  }

  const qualify: Record<string, number> = {}
  let bracketCount = 0
  for (const [gk, players] of groups) {
    const dist = distributeSeats(players, seedFrom(compId + gk))
    dist.forEach((seats, idx) => {
      if (seats.length === 0) return
      const bIdx = idx + 1
      buildTree(compId, 'prelim', gk, bIdx, seats, seedFrom(compId + gk + bIdx))
      qualify[qualifyKey(gk, bIdx)] = DEFAULT_QUALIFY
      bracketCount++
    })
  }
  setEventConfig(compId, { groupMode: mode, qualify })
  return { groups: groups.size, brackets: bracketCount, matches: matchesForComp(compId).length }
}

// Resolved tournament shape for an event: explicit config, else discipline default.
export function bracketModeOf(compId: string): BracketMode {
  const cfg = getEventConfig(compId)
  if (cfg.bracketMode) return cfg.bracketMode
  return defaultBracketMode(getEvent(compId)?.disc ?? '')
}

// ── public: generate a single DIRECT bracket (no prelims, no grouping) ──
// Every approved player is seeded straight into one single-elim tree; an account
// with k سهم gets min(k, entryCap) spread entries (its own entries meet only in
// the late rounds). This tree IS the tournament — placements are entered
// manually at finalize, same as the assembled final.
export async function generateDirectBracket(
  { compId, registrations }: { compId: string; registrations: Registration[] },
): Promise<{ seats: number; players: number; matches: number }> {
  await clearMatchesForComp(compId)
  const cap = entryCapFor(compId)
  const entries = registrations
    .map(r => ({ userId: r.userId, count: Math.min(Math.max(1, r.attempts), cap) }))
    .filter(e => e.count > 0)
  const seats = spreadSeats(entries, seedFrom(compId + 'direct'))
  if (seats.filter(Boolean).length >= 2) {
    buildTree(compId, 'final', '', 0, seats, seedFrom(compId + 'direct-tree'), true)
  }
  setEventConfig(compId, { bracketMode: 'direct' })
  syncFinalEntries(compId)
  return {
    seats: seats.filter(Boolean).length,
    players: entries.length,
    matches: matchesForComp(compId).length,
  }
}

// Per-bracket progress state — drives the re-entry "not-started" check (MD-5b)
// and the admin schedule panel.
export function bracketState(compId: string, groupKey: string, bracket: number): 'not-started' | 'running' | 'done' {
  const ms = matchesForComp(compId).filter(m => m.groupKey === groupKey && m.bracket === bracket)
  if (ms.length === 0) return 'not-started'
  const done = ms.filter(m => m.status === 'done').length
  if (done === 0) return 'not-started'
  if (done === ms.length) return 'done'
  return 'running'
}

// ── record a result; auto-advance the winner ──
export function setMatchWinner(matchId: string, winnerUserId: string, score?: string): Match {
  const m = getMatch(matchId)
  if (!m) throw new Error('MATCH_NOT_FOUND')
  if (m.status === 'done') throw new Error('MATCH_ALREADY_DONE')
  if (winnerUserId !== m.p1UserId && winnerUserId !== m.p2UserId) throw new Error('INVALID_WINNER')
  m.winnerUserId = winnerUserId
  m.score = score
  m.status = 'done'
  saveMatch(m)
  feedWinner(m)
  // settle any byes this result may have created downstream
  resolveByes(m.compId, m.stage, m.groupKey, m.bracket)
  if (m.stage === 'prelim' && !findNextMatch(m)) {
    pushNotif(winnerUserId, 'advance', 'قهرمان براکت مقدماتی', 'به مرحلهٔ بعد صعود کردی — منتظر مونتاژ فینال باش.')
  }
  if (m.stage === 'final') syncFinalEntries(m.compId)
  return m
}

// ── correct an already-recorded result (admin "ویرایش") ──
// Reverts the previous winner's advance into the next round and re-feeds the new
// winner. Blocked if the next-round match has already been played (admin must fix
// that one first).
export function correctMatchResult(matchId: string, newWinnerUserId: string): Match {
  const m = getMatch(matchId)
  if (!m) throw new Error('MATCH_NOT_FOUND')
  if (m.status !== 'done') throw new Error('MATCH_NOT_DONE')
  if (newWinnerUserId !== m.p1UserId && newWinnerUserId !== m.p2UserId) throw new Error('INVALID_WINNER')
  if (newWinnerUserId === m.winnerUserId) return m
  const next = findNextMatch(m)
  if (next && next.status === 'done') throw new Error('NEXT_ROUND_PLAYED')
  if (next) {
    // clear the stale winner out of the downstream slot before re-feeding
    if (m.slot % 2 === 0) next.p1UserId = undefined
    else                  next.p2UserId = undefined
    if (next.status === 'ready') next.status = 'pending'
    saveMatch(next)
  }
  m.winnerUserId = newWinnerUserId
  m.status = 'done'
  saveMatch(m)
  feedWinner(m)
  resolveByes(m.compId, m.stage, m.groupKey, m.bracket)
  if (m.stage === 'final') syncFinalEntries(m.compId)
  return m
}

// ── re-entry (MD-5b): seat a returning player into later not-started brackets ──
// Places up to `n` new entries for `userId`, one per not-started bracket in the
// player's own prelim group (lowest bracket index first — same "early first" as
// the original draw). Uses the empty round-1 / bye slots; skips a bracket with
// no free slot. Returns how many were actually placed and where.
export function placeReentrySeats(compId: string, userId: string, n: number): { placed: number; brackets: number[] } {
  const mode: GroupMode = getEventConfig(compId).groupMode ?? 'city'
  const gk = groupKeyOf(userId, mode)
  const all = matchesForComp(compId)
  const bracketIdxs = Array.from(new Set(all.filter(m => m.stage === 'prelim' && m.groupKey === gk).map(m => m.bracket))).sort((a, b) => a - b)
  const placedBrackets: number[] = []
  for (const b of bracketIdxs) {
    if (placedBrackets.length >= n) break
    if (bracketState(compId, gk, b) !== 'not-started') continue
    const first = Math.min(...all.filter(m => m.stage === 'prelim' && m.groupKey === gk && m.bracket === b).map(m => m.round))
    const slot = all.find(m =>
      m.stage === 'prelim' && m.groupKey === gk && m.bracket === b && m.round === first &&
      (!m.p1UserId || !m.p2UserId) && m.p1UserId !== userId && m.p2UserId !== userId,
    )
    if (!slot) continue
    try { addPlayerToSlot(compId, gk, b, slot.slot, userId); placedBrackets.push(b) } catch { /* slot filled meanwhile */ }
  }
  return { placed: placedBrackets.length, brackets: placedBrackets }
}

// Count of not-started prelim brackets in a player's group (for the re-entry
// eligibility check).
export function notStartedBracketsForUser(compId: string, userId: string): number {
  const mode: GroupMode = getEventConfig(compId).groupMode ?? 'city'
  const gk = groupKeyOf(userId, mode)
  const idxs = Array.from(new Set(matchesForComp(compId).filter(m => m.stage === 'prelim' && m.groupKey === gk).map(m => m.bracket)))
  return idxs.filter(b => bracketState(compId, gk, b) === 'not-started').length
}

// ── manually place a player into an empty round-1 slot (admin "افزودن") ──
export function addPlayerToSlot(compId: string, groupKey: string, bracket: number, slot: number, userId: string): Match {
  const m = matchesForComp(compId).find(x => x.groupKey === groupKey && x.bracket === bracket && x.round === 1 && x.slot === slot)
  if (!m) throw new Error('SLOT_NOT_FOUND')
  if (m.p1UserId && m.p2UserId) throw new Error('SLOT_FULL')
  if (!m.p1UserId) m.p1UserId = userId
  else m.p2UserId = userId
  if (m.p1UserId && m.p2UserId) m.status = 'ready'
  saveMatch(m)
  resolveByes(compId, m.stage, groupKey, bracket)
  return m
}

// ── rank the players of one bracket, best → worst ──
export function rankBracket(compId: string, stage: 'prelim' | 'final', groupKey: string, bracket: number): string[] {
  const ms = matchesForComp(compId).filter(m => m.stage === stage && m.groupKey === groupKey && m.bracket === bracket)
  if (ms.length === 0) return []
  const maxRound = Math.max(...ms.map(m => m.round))
  const champion = ms.find(m => m.round === maxRound)?.winnerUserId
  const elimRound: Record<string, number> = {}
  const slotOf: Record<string, number> = {}
  for (const m of ms) {
    if (m.status === 'done' && m.winnerUserId) {
      const loser = m.winnerUserId === m.p1UserId ? m.p2UserId : m.p1UserId
      if (loser) { elimRound[loser] = m.round; slotOf[loser] = m.slot }
    }
    for (const p of [m.p1UserId, m.p2UserId]) if (p && slotOf[p] == null) slotOf[p] = m.slot
  }
  const losers = Object.keys(elimRound).filter(u => u !== champion)
  losers.sort((a, b) => elimRound[b] - elimRound[a] || (slotOf[a] ?? 0) - (slotOf[b] ?? 0))
  return champion ? [champion, ...losers] : losers
}

// ── qualifiers across all prelim brackets (only complete brackets contribute) ──
// One row PER QUALIFICATION, not per player. An account that wins its slot in
// several prelim brackets qualifies several times → carries that many entries
// into the final (capped at entryCapFor). `rank` = finishing rank inside that
// prelim bracket.
export interface Qualifier { userId: string; groupKey: string; bracket: number; rank: number }
export function computeQualifiers(compId: string): Qualifier[] {
  const cfg = getEventConfig(compId)
  const all = matchesForComp(compId)
  const cap = entryCapFor(compId)
  const perUser = new Map<string, number>()
  const out: Qualifier[] = []
  for (const gk of prelimGroupKeys(compId)) {
    const brackets = Array.from(new Set(all.filter(m => m.stage === 'prelim' && m.groupKey === gk).map(m => m.bracket))).sort((a, b) => a - b)
    for (const b of brackets) {
      const ms = all.filter(m => m.stage === 'prelim' && m.groupKey === gk && m.bracket === b)
      if (!ms.every(m => m.status === 'done')) continue          // bracket not finished
      const k = cfg.qualify[qualifyKey(gk, b)] ?? DEFAULT_QUALIFY
      rankBracket(compId, 'prelim', gk, b).slice(0, k).forEach((userId, i) => {
        const held = perUser.get(userId) ?? 0
        if (held >= cap) return
        perUser.set(userId, held + 1)
        out.push({ userId, groupKey: gk, bracket: b, rank: i + 1 })
      })
    }
  }
  return out
}

// Recompute Registration.seedsEarned (= live final entries) for every approved
// account in the comp. Call after any change to the final bracket.
export function syncFinalEntries(compId: string): void {
  for (const r of approvedRegistrationsForComp(compId)) {
    setRegSeeds(r.userId, compId, liveFinalEntries(compId, r.userId))
  }
}

// Count of an account's still-alive entries in the assembled final (0 if the
// final isn't built or the account isn't in it). Feeds Registration.seedsEarned
// display on the player pages.
export function liveFinalEntries(compId: string, userId: string): number {
  const fin = matchesForComp(compId).filter(m => m.stage === 'final')
  if (fin.length === 0) return 0
  const firstRound = Math.min(...fin.map(m => m.round))
  const total = fin
    .filter(m => m.round === firstRound)
    .reduce((n, m) => n + (m.p1UserId === userId ? 1 : 0) + (m.p2UserId === userId ? 1 : 0), 0)
  if (total === 0) return 0
  // subtract entries eliminated so far
  const lost = fin.filter(m =>
    m.status === 'done' && m.winnerUserId && m.winnerUserId !== userId &&
    (m.p1UserId === userId || m.p2UserId === userId),
  ).length
  return Math.max(0, total - lost)
}

// ── assemble / re-assemble the final bracket from current qualifiers ──
// Multi-entry: an account with N qualifications gets N spread seats in the one
// final tree (spreadSeats) — its own entries meet only in the late rounds and
// the account is out only when ALL its entries lose.
export async function assembleFinal(compId: string): Promise<{ seats: number; players: number; capped: boolean }> {
  const cfg = getEventConfig(compId)
  const cap = getEvent(compId)?.finalSize ?? 128

  // qualifications → per-account counts
  const counts = new Map<string, number>()
  for (const q of computeQualifiers(compId)) counts.set(q.userId, (counts.get(q.userId) ?? 0) + 1)
  let entries = [...counts.entries()].map(([userId, count]) => ({ userId, count }))

  // manual seeding order (first seat of each listed account first), else random
  if (cfg.finalSeeding?.length) {
    const rankOf = new Map(cfg.finalSeeding.map((u, i) => [u, i]))
    entries.sort((a, b) => (rankOf.get(a.userId) ?? 1e9) - (rankOf.get(b.userId) ?? 1e9))
  } else {
    entries = shuffle(entries, rng(seedFrom(compId + 'final')))
  }

  // cap total SEATS at finalSize (drop whole accounts from the tail)
  let capped = false
  const kept: typeof entries = []
  let seatSum = 0
  for (const e of entries) {
    if (seatSum + e.count > cap) { capped = true; break }
    kept.push(e); seatSum += e.count
  }

  await clearMatchesByStage(compId, 'final')
  const seats = spreadSeats(kept, seedFrom(compId + 'final-tree'))
  if (seats.filter(Boolean).length >= 2) buildTree(compId, 'final', '', 0, seats, seedFrom(compId + 'final-tree'), true)
  syncFinalEntries(compId)
  return { seats: seatSum, players: kept.length, capped }
}

export function setFinalSeeding(compId: string, orderedUserIds: string[]) {
  setEventConfig(compId, { finalSeeding: orderedUserIds })
  return assembleFinal(compId)
}

export function setBracketQualify(compId: string, groupKey: string, bracket: number, count: number) {
  const cfg = getEventConfig(compId)
  const qualify = { ...cfg.qualify, [qualifyKey(groupKey, bracket)]: Math.max(0, Math.floor(count)) }
  setEventConfig(compId, { qualify })
}

export function isDrawn(compId: string): boolean {
  return matchesForComp(compId).length > 0
}
