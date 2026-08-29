// Shared derived data for bracket views: how many سهم each account holds in a
// competition, and which of an account's entries a given round-1 slot is.
// Used by the admin run-panel and the public bracket page (MD-4 / MD-8).

import { approvedRegistrationsForComp, matchesForComp } from './store'

/** uid → total سهم (attempts) in this competition. */
export function attemptsForComp(compId: string): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of approvedRegistrationsForComp(compId)) m.set(r.userId, r.attempts)
  return m
}

/**
 * `${matchId}:${side}` → entry ordinal (1-based) of that account within its
 * stage. Numbered by round-1 seat order: bracket asc, then slot asc, p1 before
 * p2. Only meaningful for accounts holding more than one entry.
 */
export function entryIndexForComp(compId: string): Map<string, number> {
  const all = matchesForComp(compId)
  // first round number per (stage, groupKey, bracket)
  const firstRound = new Map<string, number>()
  for (const m of all) {
    const k = `${m.stage}|${m.groupKey}|${m.bracket}`
    const cur = firstRound.get(k)
    if (cur == null || m.round < cur) firstRound.set(k, m.round)
  }
  const r1 = all
    .filter(m => m.round === firstRound.get(`${m.stage}|${m.groupKey}|${m.bracket}`))
    .sort((a, b) =>
      (a.stage < b.stage ? -1 : a.stage > b.stage ? 1 : 0) ||
      (a.groupKey < b.groupKey ? -1 : a.groupKey > b.groupKey ? 1 : 0) ||
      a.bracket - b.bracket || a.slot - b.slot,
    )
  const out = new Map<string, number>()
  const seen = new Map<string, number>()   // `${stage}:${uid}` → count so far
  for (const m of r1) {
    for (const [side, uid] of [[1, m.p1UserId], [2, m.p2UserId]] as const) {
      if (!uid) continue
      const key = `${m.stage}:${uid}`
      const n = (seen.get(key) ?? 0) + 1
      seen.set(key, n)
      out.set(`${m.id}:${side}`, n)
    }
  }
  return out
}
