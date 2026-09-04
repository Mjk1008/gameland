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
  clearMatchesForComp, clearMatchesByStage, clearMatchesForGroup, pushMatch, saveMatch, matchesForComp, getMatch,
  findNextMatch, getUserById, prelimGroupKeys, setRegSeeds,
  getEventConfig, setEventConfig, qualifyKey, pushNotif, getEvent, getRegistration,
  settledAttempts, drawEligibleRegistrations, type EventConfig,
} from './store'
import { DEFAULT_ENTRY_CAP, defaultBracketMode, type BracketMode } from './discipline-format'
import { MAX_SEEDS_TO_FINAL } from './competition-engine'
import { drawProvinceOf, provincesInDrawGroup, resolveProvince } from './iran-geo'
import {
  cancelledSlotKey, isCancelledSlot, isRealPlayer, isRestSlot, leftoverFillOpen, restSlotKey,
} from './bracket-slots'

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
export function groupKeyForUser(userId: string, mode: GroupMode): string {
  return groupKeyOf(userId, mode)
}
function groupKeyOf(userId: string, mode: GroupMode): string {
  const u = getUserById(userId)
  if (mode === 'province') {
    const p = drawProvinceOf(resolveProvince(u?.province, u?.city))
    return `province:${p}`
  }
  return `city:${u?.city || 'نامشخص'}`
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

// Admin-chosen N brackets (not maxK). Each account's k سهم go into distinct
// brackets first; leftover copies (k > N) fill the currently least-loaded
// bracket that has the fewest copies of that account. Within a bracket,
// spreadSeats then puts those copies on opposite sides of the tree.
export function distributeIntoBrackets(
  players: { userId: string; attempts: number }[],
  nBrackets: number,
  seed: number,
): string[][] {
  const N = Math.max(1, Math.floor(nBrackets))
  const brackets: string[][] = Array.from({ length: N }, () => [])
  const ordered = shuffle(players, rng(seed)).sort((a, b) => b.attempts - a.attempts)
  for (const p of ordered) {
    const k = Math.max(1, p.attempts)
    for (let t = 0; t < k; t++) {
      let best = 0, bestCopies = Infinity, bestSize = Infinity
      for (let i = 0; i < N; i++) {
        let copies = 0
        for (const u of brackets[i]) if (u === p.userId) copies++
        const size = brackets[i].length
        if (copies < bestCopies || (copies === bestCopies && (size < bestSize || (size === bestSize && i < best)))) {
          best = i; bestCopies = copies; bestSize = size
        }
      }
      brackets[best].push(p.userId)
    }
  }
  return brackets
}

function countsOf(seats: string[]): { userId: string; count: number }[] {
  const m = new Map<string, number>()
  for (const u of seats) m.set(u, (m.get(u) ?? 0) + 1)
  return [...m.entries()].map(([userId, count]) => ({ userId, count }))
}

/** Seats this account currently occupies in the trees (prelim R1, or final R1 if no prelims). */
export function seatedTicketsOf(compId: string, userId: string): number {
  const prelim = seatCountInPrelims(compId, userId)
  if (prelim > 0) return prelim
  const hasPrelim = matchesForComp(compId).some(m => m.stage === 'prelim')
  if (hasPrelim) return 0
  let c = 0
  for (const m of matchesForComp(compId)) {
    if (m.stage !== 'final' || m.round !== 1) continue
    if (m.p1UserId === userId) c++
    if (m.p2UserId === userId) c++
  }
  return c
}

export function leftoverTicketsOf(compId: string, userId: string): number {
  const r = getRegistration(userId, compId)
  if (!r) return 0
  const settled = settledAttempts(r)
  if (settled < 1) return 0
  return Math.max(0, settled - seatedTicketsOf(compId, userId))
}

export interface LeftoverPlayer { userId: string; leftover: number; groupKey: string }

function prelimGroupKeyOf(userId: string, mode: GroupMode): string {
  return groupKeyOf(userId, mode)
}

/**
 * Rest-fill pool: settled tickets that are not sitting in a tree.
 * Extra tickets of someone already seated stay in the list (one per rest fill).
 */
export function leftoverPlayers(compId: string): LeftoverPlayer[] {
  const all = matchesForComp(compId)
  if (all.length === 0) return []
  const mode: GroupMode = getEventConfig(compId).groupMode ?? 'city'
  const out: LeftoverPlayer[] = []
  for (const r of drawEligibleRegistrations(compId)) {
    const extra = leftoverTicketsOf(compId, r.userId)
    if (extra <= 0) continue
    out.push({ userId: r.userId, leftover: extra, groupKey: prelimGroupKeyOf(r.userId, mode) })
  }
  return out
}

/** Round-1 prelim seats already held by this account (any group/bracket). */
export function seatCountInPrelims(compId: string, userId: string): number {
  let c = 0
  for (const m of matchesForComp(compId)) {
    if (m.stage !== 'prelim' || m.round !== 1) continue
    if (m.p1UserId === userId) c++
    if (m.p2UserId === userId) c++
  }
  return c
}

/** userIds already seated in any prelim bracket for this event. */
export function userIdsInPrelims(compId: string): Set<string> {
  const ids = new Set<string>()
  for (const m of matchesForComp(compId)) {
    if (m.stage !== 'prelim') continue
    if (m.p1UserId) ids.add(m.p1UserId)
    if (m.p2UserId) ids.add(m.p2UserId)
  }
  return ids
}

/** Split players across exactly `bracketCount` brackets (batch draw). */
export function distributeSeatsToCount(
  players: { userId: string; attempts: number }[],
  bracketCount: number,
  seed: number,
  minSize = 0,
): { seats: string[]; preordered: boolean }[] {
  const n = Math.min(6, Math.max(1, bracketCount))
  const dist = distributeIntoBrackets(players, n, seed)
  return dist.map((seatList, i) => ({
    seats: seatList.length ? spreadSeats(countsOf(seatList), seedFrom(String(seed) + ':b' + i), minSize) : [],
    preordered: true,
  }))
}

export interface PrelimBatchInput {
  compId: string
  groupKey: string
  bracketCount: number
  capacityPerBracket: number
  players: { userId: string; attempts: number }[]
}

/** Add prelim brackets for a subset of players in one group — does not wipe existing brackets. */
export async function generatePrelimBatch(input: PrelimBatchInput): Promise<{ brackets: number; matches: number; bracketFrom: number; bracketTo: number }> {
  const { compId, groupKey, capacityPerBracket } = input
  const bracketCount = Math.min(6, Math.max(1, Math.floor(input.bracketCount)))
  const cap = Math.min(2048, Math.max(2, Math.floor(capacityPerBracket)))
  const players = input.players
    .filter(p => p.userId && p.attempts > 0)
    .map(p => {
      const seated = seatCountInPrelims(compId, p.userId)
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
    buildTree(compId, 'prelim', groupKey, bIdx, seats, seedFrom(compId + groupKey + bIdx), preordered)
    qualify[qualifyKey(groupKey, bIdx)] = qualify[qualifyKey(groupKey, bIdx)] ?? DEFAULT_QUALIFY
    built++
  }
  if (built === 0) throw new Error('NO_PLAYERS')

  const patch: Partial<EventConfig> = { qualify }
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

/** Max distinct entries one account carries into the final for this event. */
export function entryCapFor(compId: string): number {
  return getEventConfig(compId).entryCap ?? DEFAULT_ENTRY_CAP
}

// Split a bracket into `k` regions by recursively giving each half as even a
// share as possible (randomly which half gets the extra when k is odd). One
// copy of a multi-entry account lands in each region — so 2 copies are always
// in opposite halves, 4 in opposite quarters — while the exact slot inside a
// region stays random.
function regionsFor(k: number, start: number, len: number, r: () => number): [number, number][] {
  if (k <= 0) return []
  if (k === 1 || len <= 1) return [[start, start + len]]
  const half = Math.floor(len / 2)
  if (half < 1) return [[start, start + len]]
  const a = Math.floor(k / 2)
  const b = k - a
  const leftK = r() < 0.5 ? a : b
  return [...regionsFor(leftK, start, half, r), ...regionsFor(k - leftK, start + half, len - half, r)]
}

// Position each account's `count` entries into ONE single-elim tree so its own
// entries are as far apart as possible (meet only in the late rounds), then fill
// the gaps with single-entry players. Byes (empty seeds) are themselves spread
// so they occupy different first-round matches when there are enough players.
// Returns a padded seat list (length = a power of two, '' = bye) ready for
// buildTree(..., preordered=true).
export function spreadSeats(entries: { userId: string; count: number }[], seed: number, minSize = 0): string[] {
  const total = entries.reduce((s, e) => s + Math.max(1, e.count), 0)
  if (total === 0) return []
  let size = 1
  while (size < total) size *= 2
  size = Math.max(2, size)
  if (minSize > size) {
    let s = Math.floor(minSize)
    if (s & (s - 1)) { let p = 1; while (p < s) p *= 2; s = p }
    size = Math.max(size, s)
  }
  const slots: (string | null)[] = Array.from({ length: size }, () => null)
  const r = rng(seed)

  const nearestFree = (ideal: number): number => {
    for (let d = 0; d < size; d++) {
      const a = (ideal + d) % size, b = (ideal - d + size) % size
      if (slots[a] == null) return a
      if (slots[b] == null) return b
    }
    return -1
  }
  const pickInRegion = (start: number, end: number): number => {
    const free: number[] = []
    for (let i = start; i < end; i++) if (slots[i] == null) free.push(i)
    if (free.length === 0) return nearestFree((start + end) >> 1)
    return free[Math.floor(r() * free.length)]
  }

  const multi = entries.filter(e => Math.max(1, e.count) >= 2)
  const singles = entries.filter(e => Math.max(1, e.count) < 2)
  const multiOrdered = shuffle(multi, r).sort((a, b) => Math.max(1, b.count) - Math.max(1, a.count))
  for (const e of multiOrdered) {
    const c = Math.max(1, e.count)
    for (const [start, end] of shuffle(regionsFor(c, 0, size, r), r)) {
      const pos = pickInRegion(start, end)
      if (pos >= 0) slots[pos] = e.userId
    }
  }

  const free: number[] = []
  for (let i = 0; i < size; i++) if (slots[i] == null) free.push(i)
  const nByes = size - total
  const byeSet = new Set<number>()
  const bandCount = (i: number, band: number) => {
    const b0 = Math.floor(i / band) * band
    let n = 0
    for (const x of byeSet) if (x >= b0 && x < b0 + band) n++
    return n
  }
  for (let n = 0; n < nByes; n++) {
    let best = -1, bestScore = Infinity
    for (const i of free) {
      if (byeSet.has(i)) continue
      const mate = i ^ 1
      let score = r() * 4
      if (byeSet.has(mate)) score += 10_000
      if (slots[mate]) score -= 8
      if (size >= 4) score += 40 * bandCount(i, size / 2)
      if (size >= 8) score += 20 * bandCount(i, size / 4)
      if (size >= 16) score += 10 * bandCount(i, size / 8)
      if (score < bestScore) { bestScore = score; best = i }
    }
    if (best < 0) break
    byeSet.add(best)
  }

  const playerSlots = shuffle(free.filter(i => !byeSet.has(i)), r)
  const names: string[] = []
  for (const e of shuffle(singles, r)) names.push(e.userId)
  for (let i = 0; i < names.length && i < playerSlots.length; i++) slots[playerSlots[i]] = names[i]

  return slots.map(s => s ?? '')
}

/** Place N unique players in a power-of-two bracket with spread byes. */
export function seedBracketSlots(players: string[], seed: number): string[] {
  if (players.length === 0) return []
  return spreadSeats(players.map(userId => ({ userId, count: 1 })), seed)
}

// place a finished match's winner into the next round's correct slot
function feedWinner(m: Match) {
  const next = findNextMatch(m)
  if (!next || !m.winnerUserId) return
  if (m.slot % 2 === 0) next.p1UserId = m.winnerUserId
  else                  next.p2UserId = m.winnerUserId
  if (isRealPlayer(next.p1UserId) && isRealPlayer(next.p2UserId)) next.status = 'ready'
  saveMatch(next)   // persist the mutated (already in-memory) match
}

function feedCancelled(m: Match) {
  const next = findNextMatch(m)
  if (!next) return
  const key = cancelledSlotKey(m.id)
  if (m.slot % 2 === 0) next.p1UserId = key
  else                  next.p2UserId = key
  saveMatch(next)
}

function clearCancelledFeed(m: Match) {
  const next = findNextMatch(m)
  if (!next) return
  const key = cancelledSlotKey(m.id)
  let changed = false
  if (next.p1UserId === key) { next.p1UserId = undefined; changed = true }
  if (next.p2UserId === key) { next.p2UserId = undefined; changed = true }
  if (changed) {
    if (next.status === 'ready') next.status = 'pending'
    saveMatch(next)
  }
}

function unwindAdvance(m: Match) {
  const next = findNextMatch(m)
  if (next && next.status === 'done') throw new Error('NEXT_ROUND_PLAYED')
  const prev = m.winnerUserId
  const key = cancelledSlotKey(m.id)
  if (next) {
    const fed = m.slot % 2 === 0 ? 'p1' : 'p2'
    const cur = fed === 'p1' ? next.p1UserId : next.p2UserId
    if (cur === prev || cur === key || isRestSlot(cur) || !isRealPlayer(cur)) {
      if (fed === 'p1') next.p1UserId = undefined
      else next.p2UserId = undefined
      if (next.status === 'ready') next.status = 'pending'
      saveMatch(next)
    }
  }
  m.status = 'pending'
  m.winnerUserId = undefined
  m.cancelled = false
  saveMatch(m)
}

function assignRestLabels(compId: string, stage: 'prelim' | 'final', groupKey: string, bracketIdx: number) {
  const mine = matchesForComp(compId).filter(m => m.stage === stage && m.groupKey === groupKey && m.bracket === bracketIdx)
  const first = Math.min(...mine.map(m => m.round))
  const r1 = mine.filter(m => m.round === first).sort((a, b) => a.slot - b.slot)
  let n = 1
  for (const m of r1) {
    if (!m.p1UserId) { m.p1UserId = restSlotKey(n++); saveMatch(m) }
    if (!m.p2UserId) { m.p2UserId = restSlotKey(n++); saveMatch(m) }
  }
}

// Build a single-elim tree for one bracket from a seat list.
// `preordered` = the seat list is already positioned (spreadSeats) — do NOT
// reshuffle, and treat '' entries as intentional byes at their exact index.
function buildTree(compId: string, stage: 'prelim' | 'final', groupKey: string, bracketIdx: number, seats: string[], seed: number, preordered = false) {
  const padded = preordered ? seats.slice() : seedBracketSlots(seats.filter(Boolean), seed)
  let size = padded.length
  if (size === 0) return
  size = Math.max(2, size)

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
  assignRestLabels(compId, stage, groupKey, bracketIdx)
  resolveByes(compId, stage, groupKey, bracketIdx)
}

// Settle cancelled-side auto-advances. Rest seats stay pending — admin fills
// them later and records the winner; auto-winning a rest match would lock the
// next round and block adding a leftover into rest1.
function resolveByes(compId: string, stage: 'prelim' | 'final', groupKey: string, bracketIdx: number) {
  const mine = () => matchesForComp(compId).filter(m => m.stage === stage && m.groupKey === groupKey && m.bracket === bracketIdx)
  const byRS = (round: number, slot: number) => mine().find(m => m.round === round && m.slot === slot)
  const realCount = (m: Match) => (isRealPlayer(m.p1UserId) ? 1 : 0) + (isRealPlayer(m.p2UserId) ? 1 : 0)
  const hasCancelled = (m: Match) => isCancelledSlot(m.p1UserId) || isCancelledSlot(m.p2UserId)
  const hasRest = (m: Match) => isRestSlot(m.p1UserId) || isRestSlot(m.p2UserId)
  const soleReal = (m: Match) => (isRealPlayer(m.p1UserId) ? m.p1UserId : isRealPlayer(m.p2UserId) ? m.p2UserId : undefined)

  let changed = true, guard = 0
  while (changed && guard++ < 1000) {
    changed = false
    for (const m of mine().sort((a, b) => a.round - b.round || a.slot - b.slot)) {
      if (m.status === 'done') continue
      const r = realCount(m)
      if (r === 2) { if (m.status !== 'ready') { m.status = 'ready'; saveMatch(m); changed = true } continue }
      // rest vs player (or rest vs rest): wait for admin to fill or record.
      if (hasRest(m)) continue

      let feedersDone = true
      if (m.round > 1) {
        const f1 = byRS(m.round - 1, m.slot * 2), f2 = byRS(m.round - 1, m.slot * 2 + 1)
        feedersDone = !!f1 && !!f2 && f1.status === 'done' && f2.status === 'done'
      }
      if (m.round > 1 && !feedersDone) continue

      if (r === 1) {
        const w = soleReal(m)!
        m.winnerUserId = w
        m.status = 'done'
        m.cancelled = false
        saveMatch(m)
        feedWinner(m)
        changed = true
        continue
      }

      if (r === 0 && hasCancelled(m)) {
        m.status = 'done'
        m.cancelled = true
        m.winnerUserId = undefined
        saveMatch(m)
        feedCancelled(m)
        changed = true
        continue
      }

      if (r === 0 && feedersDone) {
        m.status = 'done'
        saveMatch(m)
        changed = true
      }
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
    const k = settledAttempts(r)
    if (k < 1) continue
    const gk = groupKeyOf(r.userId, mode)
    if (!groups.has(gk)) groups.set(gk, [])
    groups.get(gk)!.push({ userId: r.userId, attempts: k })
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
  const unpublished: Record<string, boolean> = { ...(getEventConfig(compId).publishedGroups ?? {}) }
  for (const gk of groups.keys()) unpublished[gk] = false
  setEventConfig(compId, { groupMode: mode, qualify, publishedGroups: unpublished })
  return { groups: groups.size, brackets: bracketCount, matches: matchesForComp(compId).length }
}

export interface ProvinceDrawInput {
  compId: string
  destProvince: string
  sourceProvince: string
  nBrackets: number
  bracketSize: number
}

// Draw ONE province at a time. Number of brackets and tree size are chosen by
// the admin — not derived from max سهم. Other provinces' brackets stay put.
export async function generateProvincePrelims(input: ProvinceDrawInput): Promise<{
  province: string; source: string; groups: number; brackets: number; seats: number; matches: number; userIds: string[]
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
    syncFinalEntries(input.compId)
  }

  const seated = new Set<string>()
  for (const m of matchesForComp(input.compId)) {
    if (m.stage !== 'prelim') continue
    if (m.p1UserId) seated.add(m.p1UserId)
    if (m.p2UserId) seated.add(m.p2UserId)
  }

  const allowed = new Set(src === dest ? provincesInDrawGroup(dest) : [src])
  const players: { userId: string; attempts: number }[] = []
  for (const r of drawEligibleRegistrations(input.compId)) {
    if (seated.has(r.userId)) continue
    const u = getUserById(r.userId)
    if (!allowed.has(resolveProvince(u?.province, u?.city))) continue
    const k = settledAttempts(r)
    if (k < 1) continue
    players.push({ userId: r.userId, attempts: k })
  }

  const tickets = players.reduce((s, p) => s + p.attempts, 0)
  if (tickets === 0) throw new Error('NO_TICKETS')
  if (N > tickets) throw new Error('TOO_MANY_BRACKETS')
  if (tickets > N * size) throw new Error('CAPACITY')

  const dist = distributeIntoBrackets(players, N, seedFrom(input.compId + gk + 'into'))
  const cfg = getEventConfig(input.compId)
  const qualify = { ...cfg.qualify }
  for (const k of Object.keys(qualify)) if (k.startsWith(gk + '#')) delete qualify[k]

  let bracketCount = 0
  let seatCount = 0
  dist.forEach((seats, idx) => {
    if (seats.length === 0) return
    const bIdx = idx + 1
    const ordered = spreadSeats(countsOf(seats), seedFrom(input.compId + gk + bIdx + 'spread'), size)
    buildTree(input.compId, 'prelim', gk, bIdx, ordered, seedFrom(input.compId + gk + bIdx), true)
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
    userIds: [...new Set(dist.flat())],
  }
}

/** Wipe one prelim group (province/city/mixed) so admin can re-draw from the UI. */
export async function clearPrelimGroup(compId: string, groupKey: string): Promise<{ deleted: number; finalCleared: boolean }> {
  const gk = (groupKey || '').trim()
  if (!gk) throw new Error('GROUP_KEY')
  const deleted = matchesForComp(compId).filter(m => m.stage === 'prelim' && m.groupKey === gk).length
  if (deleted === 0) throw new Error('NOT_FOUND')
  await clearMatchesForGroup(compId, 'prelim', gk)
  let finalCleared = false
  if (matchesForComp(compId).some(m => m.stage === 'final')) {
    await clearMatchesByStage(compId, 'final')
    syncFinalEntries(compId)
    finalCleared = true
  }
  const cfg = getEventConfig(compId)
  const qualify = { ...cfg.qualify }
  for (const k of Object.keys(qualify)) if (k.startsWith(gk + '#')) delete qualify[k]
  const bracketSchedule = { ...(cfg.bracketSchedule ?? {}) }
  for (const k of Object.keys(bracketSchedule)) if (k.startsWith(gk + '#')) delete bracketSchedule[k]
  const publishedGroups = { ...(cfg.publishedGroups ?? {}) }
  delete publishedGroups[gk]
  setEventConfig(compId, { qualify, bracketSchedule, publishedGroups })
  return { deleted, finalCleared }
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
    .map(r => {
      const k = settledAttempts(r)
      return { userId: r.userId, count: Math.min(Math.max(0, k), cap) }
    })
    .filter(e => e.count > 0)
  const seats = spreadSeats(entries, seedFrom(compId + 'direct'))
  if (seats.filter(Boolean).length >= 2) {
    buildTree(compId, 'final', '', 0, seats, seedFrom(compId + 'direct-tree'), true)
  }
  setEventConfig(compId, {
    bracketMode: 'direct',
    publishedGroups: { ...(getEventConfig(compId).publishedGroups ?? {}), final: false },
  })
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
  if (!isRealPlayer(winnerUserId)) throw new Error('INVALID_WINNER')
  m.winnerUserId = winnerUserId
  m.score = score
  m.status = 'done'
  m.cancelled = false
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

export function cancelMatch(matchId: string): Match {
  const m = getMatch(matchId)
  if (!m) throw new Error('MATCH_NOT_FOUND')
  if (m.status === 'done' && !m.cancelled) throw new Error('MATCH_ALREADY_DONE')
  const next = findNextMatch(m)
  if (next && next.status === 'done') throw new Error('NEXT_ROUND_PLAYED')
  m.status = 'done'
  m.cancelled = true
  m.winnerUserId = undefined
  saveMatch(m)
  feedCancelled(m)
  resolveByes(m.compId, m.stage, m.groupKey, m.bracket)
  if (m.stage === 'final') syncFinalEntries(m.compId)
  return m
}

/** Record a winner on a previously cancelled match — reverses cancel advances first. */
export function recordCancelledMatchResult(matchId: string, winnerUserId: string, score?: string): Match {
  const m = getMatch(matchId)
  if (!m) throw new Error('MATCH_NOT_FOUND')
  if (m.status !== 'done' || !m.cancelled) throw new Error('MATCH_NOT_CANCELLED')
  if (winnerUserId !== m.p1UserId && winnerUserId !== m.p2UserId) throw new Error('INVALID_WINNER')
  if (!isRealPlayer(winnerUserId)) throw new Error('INVALID_WINNER')
  const next = findNextMatch(m)
  if (next && next.status === 'done') throw new Error('NEXT_ROUND_PLAYED')
  clearCancelledFeed(m)
  m.cancelled = false
  m.winnerUserId = winnerUserId
  m.score = score
  saveMatch(m)
  feedWinner(m)
  resolveByes(m.compId, m.stage, m.groupKey, m.bracket)
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
  if (!isRealPlayer(newWinnerUserId)) throw new Error('INVALID_WINNER')
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
  m.cancelled = false
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
      (!isRealPlayer(m.p1UserId) || !isRealPlayer(m.p2UserId)) &&
      m.p1UserId !== userId && m.p2UserId !== userId,
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

// ── fill a rest (or empty) slot from leftovers, in a still-running bracket ──
export function fillRestSlot(matchId: string, side: 1 | 2, userId: string): Match {
  const m = getMatch(matchId)
  if (!m) throw new Error('SLOT_NOT_FOUND')
  if (bracketState(m.compId, m.groupKey, m.bracket) === 'done') throw new Error('BRACKET_DONE')
  const mode: GroupMode = getEventConfig(m.compId).groupMode ?? 'city'
  if (!leftoverFillOpen(m.groupKey) && prelimGroupKeyOf(userId, mode) !== m.groupKey) throw new Error('NOT_LEFTOVER')
  if (leftoverTicketsOf(m.compId, userId) < 1) throw new Error('NOT_LEFTOVER')
  const slotUid = side === 1 ? m.p1UserId : m.p2UserId
  if (slotUid && !isRestSlot(slotUid)) throw new Error('NOT_REST')
  const other = side === 1 ? m.p2UserId : m.p1UserId
  if (other === userId) throw new Error('SELF_MATCH')
  if (m.status === 'done') unwindAdvance(m)
  if (side === 1) m.p1UserId = userId
  else m.p2UserId = userId
  m.cancelled = false
  m.winnerUserId = undefined
  m.status = (isRealPlayer(m.p1UserId) && isRealPlayer(m.p2UserId)) ? 'ready' : 'pending'
  saveMatch(m)
  resolveByes(m.compId, m.stage, m.groupKey, m.bracket)
  if (m.stage === 'final') syncFinalEntries(m.compId)
  return getMatch(matchId) ?? m
}

// ── manually place a player into an empty round-1 slot (admin "افزودن") ──
export function addPlayerToSlot(compId: string, groupKey: string, bracket: number, slot: number, userId: string): Match {
  const m = matchesForComp(compId).find(x => x.groupKey === groupKey && x.bracket === bracket && x.round === 1 && x.slot === slot)
  if (!m) throw new Error('SLOT_NOT_FOUND')
  const p1Open = !m.p1UserId || isRestSlot(m.p1UserId)
  const p2Open = !m.p2UserId || isRestSlot(m.p2UserId)
  if (!p1Open && !p2Open) throw new Error('SLOT_FULL')
  const side: 1 | 2 = p1Open ? 1 : 2
  if (leftoverTicketsOf(compId, userId) >= 1) return fillRestSlot(m.id, side, userId)
  const other = side === 1 ? m.p2UserId : m.p1UserId
  if (other === userId) throw new Error('SELF_MATCH')
  if (m.status === 'done') unwindAdvance(m)
  if (side === 1) m.p1UserId = userId
  else m.p2UserId = userId
  m.cancelled = false
  m.winnerUserId = undefined
  m.status = (isRealPlayer(m.p1UserId) && isRealPlayer(m.p2UserId)) ? 'ready' : 'pending'
  saveMatch(m)
  resolveByes(compId, m.stage, groupKey, bracket)
  return getMatch(m.id) ?? m
}

// ── rank the players of one bracket, best → worst ──
export function rankBracket(compId: string, stage: 'prelim' | 'final', groupKey: string, bracket: number): string[] {
  const ms = matchesForComp(compId).filter(m => m.stage === stage && m.groupKey === groupKey && m.bracket === bracket)
  if (ms.length === 0) return []
  const maxRound = Math.max(...ms.map(m => m.round))
  const finalM = ms.find(m => m.round === maxRound)
  const champion = isRealPlayer(finalM?.winnerUserId) ? finalM!.winnerUserId! : undefined
  const elimRound: Record<string, number> = {}
  const slotOf: Record<string, number> = {}
  for (const m of ms) {
    if (m.status === 'done' && isRealPlayer(m.winnerUserId)) {
      const loser = m.winnerUserId === m.p1UserId ? m.p2UserId : m.p1UserId
      if (isRealPlayer(loser)) { elimRound[loser!] = m.round; slotOf[loser!] = m.slot }
    }
    for (const p of [m.p1UserId, m.p2UserId]) if (isRealPlayer(p) && slotOf[p!] == null) slotOf[p!] = m.slot
  }
  const losers = Object.keys(elimRound).filter(u => u !== champion)
  losers.sort((a, b) => elimRound[b] - elimRound[a] || (slotOf[a] ?? 0) - (slotOf[b] ?? 0))
  return champion ? [champion, ...losers] : losers
}

// Pick exactly `k` real players from a bracket's ranking. Skips rest/cancelled
// placeholders. If an account already holds `seedCap` qual slots from earlier
// brackets, walks down to the next ranked player so this bracket still exports
// exactly `k` — the admin-configured per-bracket count is never short-changed.
function pickBracketQualifiers(
  ranked: string[], k: number, held: Map<string, number>, seedCap: number,
): { userId: string; rank: number }[] {
  const out: { userId: string; rank: number }[] = []
  for (let i = 0; i < ranked.length && out.length < k; i++) {
    const userId = ranked[i]
    if (!isRealPlayer(userId)) continue
    if ((held.get(userId) ?? 0) >= seedCap) continue
    held.set(userId, (held.get(userId) ?? 0) + 1)
    out.push({ userId, rank: i + 1 })
  }
  return out
}

// ── qualifiers across all prelim brackets (only complete brackets contribute) ──
// One row PER QUALIFICATION, not per player. Every finished bracket contributes
// exactly its configured qualify count (sum of admin stepper values). An
// account may qualify from several brackets → up to MAX_SEEDS_TO_FINAL entries
// in the final spread; extra slots in a bracket go to the next ranked player.
export interface Qualifier { userId: string; groupKey: string; bracket: number; rank: number }
export function computeQualifiers(compId: string): Qualifier[] {
  const cfg = getEventConfig(compId)
  const all = matchesForComp(compId)
  const seedCap = MAX_SEEDS_TO_FINAL
  const held = new Map<string, number>()
  const out: Qualifier[] = []
  for (const gk of prelimGroupKeys(compId)) {
    const brackets = Array.from(new Set(all.filter(m => m.stage === 'prelim' && m.groupKey === gk).map(m => m.bracket))).sort((a, b) => a - b)
    for (const b of brackets) {
      const ms = all.filter(m => m.stage === 'prelim' && m.groupKey === gk && m.bracket === b)
      if (!ms.every(m => m.status === 'done')) continue          // bracket not finished
      const k = cfg.qualify[qualifyKey(gk, b)] ?? DEFAULT_QUALIFY
      if (k <= 0) continue
      const ranked = rankBracket(compId, 'prelim', gk, b)
      for (const { userId, rank } of pickBracketQualifiers(ranked, k, held, seedCap)) {
        out.push({ userId, groupKey: gk, bracket: b, rank })
      }
    }
  }
  return out
}

// Recompute Registration.seedsEarned (= live final entries) for every approved
// account in the comp. Call after any change to the final bracket.
export function syncFinalEntries(compId: string): void {
  for (const r of drawEligibleRegistrations(compId)) {
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
  // a self-match (both slots the same account) always "wins" for that userId
  // (there's no other side to lose), but one of the two entries still retires —
  // count each resolved self-match as one loss too, or the live count never drops.
  const selfLosses = fin.filter(m => m.status === 'done' && m.p1UserId === userId && m.p2UserId === userId).length
  return Math.max(0, total - lost - selfLosses)
}

// ── assemble / re-assemble the final bracket from current qualifiers ──
// One qualification row = one seat. Multi-entry accounts get spread entries.
export async function assembleFinal(compId: string): Promise<{ seats: number; players: number; capped: boolean }> {
  const cfg = getEventConfig(compId)
  const cap = getEvent(compId)?.finalSize ?? 128

  const quals = computeQualifiers(compId)
  const counts = new Map<string, number>()
  for (const q of quals) counts.set(q.userId, (counts.get(q.userId) ?? 0) + 1)
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
  const qualify = { ...cfg.qualify, [qualifyKey(groupKey, bracket)]: Math.max(0, Math.min(2, Math.floor(count))) }
  setEventConfig(compId, { qualify })
}

export function publishKeyOf(groupKey: string): string {
  return groupKey || 'final'
}

export function isDrawPublished(compId: string, groupKey: string): boolean {
  const g = getEventConfig(compId).publishedGroups
  if (!g) return true
  const key = publishKeyOf(groupKey)
  if (!Object.prototype.hasOwnProperty.call(g, key)) return true
  return g[key] === true
}

export function publishDrawGroup(compId: string, groupKey: string): { notified: number } {
  const key = publishKeyOf(groupKey)
  const cfg = getEventConfig(compId)
  setEventConfig(compId, { publishedGroups: { ...(cfg.publishedGroups ?? {}), [key]: true } })
  const uids = new Set<string>()
  for (const m of matchesForComp(compId)) {
    if (publishKeyOf(m.groupKey) !== key) continue
    if (isRealPlayer(m.p1UserId)) uids.add(m.p1UserId)
    if (isRealPlayer(m.p2UserId)) uids.add(m.p2UserId)
  }
  for (const uid of uids) {
    pushNotif(uid, 'draw', 'قرعه‌کشی منتشر شد', 'براکت‌های شهرت چیده شد. مسابقه‌ات رو در صفحهٔ مسابقه ببین.')
  }
  return { notified: uids.size }
}

/** 1-based match number inside its own bracket (round then slot). */
export function matchNumberMap(ms: { id: string; stage: string; groupKey: string; bracket: number; round: number; slot: number }[]): Map<string, number> {
  const groups = new Map<string, typeof ms>()
  for (const m of ms) {
    const k = `${m.stage}|${m.groupKey}|${m.bracket}`
    const list = groups.get(k)
    if (list) list.push(m)
    else groups.set(k, [m])
  }
  const out = new Map<string, number>()
  for (const list of groups.values()) {
    list.sort((a, b) => a.round - b.round || a.slot - b.slot)
    list.forEach((m, i) => out.set(m.id, i + 1))
  }
  return out
}

export function isDrawn(compId: string): boolean {
  return matchesForComp(compId).length > 0
}
