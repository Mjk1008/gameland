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
  clearMatchesForComp, clearMatchesByStage, pushMatch, saveMatch, matchesForComp, getMatch,
  findNextMatch, prelimGroupKeys, currentTeamMembers, getUserById,
  getEventConfig, setEventConfig, qualifyKey, pushNotif, getEvent,
} from './store'
import { rng, shuffle, seedFrom, distributeSeats, DEFAULT_QUALIFY } from './bracket'
import { drawProvinceOf, resolveProvince } from './iran-geo'

// Team's group key: captain's city/province (surfaced at team-creation time),
// same `${mode}:${value}` format as the solo groupKeyOf — so prelimGroupKeys(),
// BracketView's scope list, and the city-grouped display all need zero changes
// to handle a team event (docs/27 §4.2, founder call §12 Q1).
function teamGroupKeyOf(team: Team, mode: GroupMode): string {
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

function buildTeamTree(compId: string, stage: 'prelim' | 'final', groupKey: string, bracketIdx: number, seats: string[], seed: number) {
  const teams = shuffle(seats, rng(seed))
  let size = 1
  while (size < teams.length) size *= 2
  size = Math.max(2, size)
  const padded = teams.slice()
  while (padded.length < size) padded.push('')

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
    const gk = teamGroupKeyOf(t, mode)
    if (!groups.has(gk)) groups.set(gk, [])
    groups.get(gk)!.push({ userId: t.id, attempts: t.attempts })   // distributeSeats is opaque on the id field — a team id works verbatim
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
export function computeTeamQualifiers(compId: string): TeamQualifier[] {
  const cfg = getEventConfig(compId)
  const all = matchesForComp(compId)
  const out: TeamQualifier[] = []
  const seen = new Set<string>()
  for (const gk of prelimGroupKeys(compId)) {
    const brackets = Array.from(new Set(all.filter(m => m.stage === 'prelim' && m.groupKey === gk).map(m => m.bracket)))
    for (const b of brackets) {
      const ms = all.filter(m => m.stage === 'prelim' && m.groupKey === gk && m.bracket === b)
      if (!ms.every(m => m.status === 'done')) continue
      const k = cfg.qualify[qualifyKey(gk, b)] ?? DEFAULT_QUALIFY
      rankTeamBracket(compId, 'prelim', gk, b).slice(0, k).forEach((teamId, i) => {
        if (seen.has(teamId)) return
        seen.add(teamId)
        out.push({ teamId, groupKey: gk, bracket: b, rank: i + 1 })
      })
    }
  }
  return out
}

export async function assembleTeamFinal(compId: string): Promise<{ seats: number; capped: boolean }> {
  const cfg = getEventConfig(compId)
  let ids = computeTeamQualifiers(compId).map(q => q.teamId)
  if (cfg.finalSeeding?.length) {
    const set = new Set(ids)
    const ordered = cfg.finalSeeding.filter(u => set.has(u))
    const rest = ids.filter(u => !ordered.includes(u))
    ids = [...ordered, ...rest]
  } else {
    ids = shuffle(ids, rng(seedFrom(compId + 'final')))
  }
  const cap = getEvent(compId)?.finalSize ?? 128
  const capped = ids.length > cap
  if (capped) ids = ids.slice(0, cap)

  await clearMatchesByStage(compId, 'final')
  if (ids.length >= 2) buildTeamTree(compId, 'final', '', 0, ids, seedFrom(compId + 'final-tree'))
  return { seats: ids.length, capped }
}
