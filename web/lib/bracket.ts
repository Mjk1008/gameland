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
  findNextMatch, getUserById, prelimGroupKeys,
  getEventConfig, setEventConfig, qualifyKey, pushNotif, getEvent,
} from './store'

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

// Balanced-random seat distribution, once-per-bracket, early-bracket priority.
// Returns brackets[i] = ordered list of userIds (seats) for bracket i (0-based).
export function distributeSeats(players: { userId: string; attempts: number }[], seed: number): string[][] {
  if (players.length === 0) return []
  const maxK = Math.max(...players.map(p => p.attempts))
  const N = Math.min(6, Math.max(1, maxK))
  const brackets: string[][] = Array.from({ length: N }, () => [])
  const order = shuffle(players, rng(seed))
  for (const p of order) {
    const k = Math.min(p.attempts, N)
    // pick the k least-full brackets; ties → lower index (fill early first)
    const idxs = Array.from({ length: N }, (_, i) => i)
      .sort((a, b) => brackets[a].length - brackets[b].length || a - b)
      .slice(0, k)
    for (const i of idxs) brackets[i].push(p.userId)
  }
  return brackets
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

// Build a single-elim tree for one bracket from an ordered seat list.
function buildTree(compId: string, stage: 'prelim' | 'final', groupKey: string, bracketIdx: number, seats: string[], seed: number) {
  const players = shuffle(seats, rng(seed))            // random seeding inside the bracket
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
export interface Qualifier { userId: string; groupKey: string; bracket: number; rank: number }
export function computeQualifiers(compId: string): Qualifier[] {
  const cfg = getEventConfig(compId)
  const all = matchesForComp(compId)
  const out: Qualifier[] = []
  const seen = new Set<string>()
  for (const gk of prelimGroupKeys(compId)) {
    const brackets = Array.from(new Set(all.filter(m => m.stage === 'prelim' && m.groupKey === gk).map(m => m.bracket)))
    for (const b of brackets) {
      const ms = all.filter(m => m.stage === 'prelim' && m.groupKey === gk && m.bracket === b)
      if (!ms.every(m => m.status === 'done')) continue          // bracket not finished
      const k = cfg.qualify[qualifyKey(gk, b)] ?? DEFAULT_QUALIFY
      rankBracket(compId, 'prelim', gk, b).slice(0, k).forEach((userId, i) => {
        if (seen.has(userId)) return
        seen.add(userId)
        out.push({ userId, groupKey: gk, bracket: b, rank: i + 1 })
      })
    }
  }
  return out
}

// ── assemble / re-assemble the final bracket from current qualifiers ──
export async function assembleFinal(compId: string): Promise<{ seats: number; capped: boolean }> {
  const cfg = getEventConfig(compId)
  let ids = computeQualifiers(compId).map(q => q.userId)
  if (cfg.finalSeeding?.length) {
    const set = new Set(ids)
    const ordered = cfg.finalSeeding.filter(u => set.has(u))
    const rest = ids.filter(u => !ordered.includes(u))
    ids = [...ordered, ...rest]
  } else {
    ids = shuffle(ids, rng(seedFrom(compId + 'final')))
  }
  // Final capacity is per-discipline (FIFA/fc26 = 128, others default 32);
  // falls back to 128 when unset. Below that many qualifiers → one smaller bracket.
  const cap = getEvent(compId)?.finalSize ?? 128
  const capped = ids.length > cap
  if (capped) ids = ids.slice(0, cap)

  await clearMatchesByStage(compId, 'final')
  if (ids.length >= 2) buildTree(compId, 'final', '', 0, ids, seedFrom(compId + 'final-tree'))
  return { seats: ids.length, capped }
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
