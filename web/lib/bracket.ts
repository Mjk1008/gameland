// Bracket draw + advancement logic.
// MVP: each gamer registers with N attempts (tickets). Draw places every
// attempt into one of 6 preliminary brackets, then generates single-elim
// matches inside each bracket. Winners (up to 3 seeds per gamer) feed the
// 128-player final bracket.

import { Registration, Match, clearMatchesForComp, pushMatch, matchesForComp, getMatch, findNextMatch, recordPrelimOutcome, pushNotif, getUserById } from './store'

const PRELIM_BRACKETS = 6

// Deterministic pseudo-random shuffle (seedable via comp id length)
function shuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice()
  let s = seed || 1
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface DrawInput {
  compId: string
  registrations: Registration[]
}

export function generateBracketDraw({ compId, registrations }: DrawInput): { matchesCreated: number; bracketsFilled: number } {
  clearMatchesForComp(compId)

  // Expand each registration into N seat-slots (one per attempt)
  type Seat = { regId: string; userId: string; attemptIdx: number }
  const seats: Seat[] = []
  for (const r of registrations) {
    for (let i = 0; i < r.attempts; i++) {
      seats.push({ regId: r.id, userId: r.userId, attemptIdx: i })
    }
  }
  if (seats.length === 0) return { matchesCreated: 0, bracketsFilled: 0 }

  // Shuffle seats deterministically
  const shuffled = shuffle(seats, compId.length * 1000 + seats.length)

  // Distribute round-robin into 6 prelim brackets
  const buckets: Seat[][] = Array.from({ length: PRELIM_BRACKETS }, () => [])
  shuffled.forEach((s, i) => buckets[i % PRELIM_BRACKETS].push(s))

  let totalMatches = 0
  let bracketsFilled = 0

  buckets.forEach((bucket, bIdx) => {
    if (bucket.length === 0) return
    bracketsFilled++

    // Pad to next power of 2 (byes)
    let size = 1
    while (size < bucket.length) size *= 2
    while (bucket.length < size) bucket.push({ regId: '', userId: '', attemptIdx: -1 })

    // Round 1
    let prevRoundIds: string[] = []
    for (let i = 0; i < bucket.length / 2; i++) {
      const p1 = bucket[i * 2]
      const p2 = bucket[i * 2 + 1]
      const m: Match = {
        id: 'm_' + Math.random().toString(36).slice(2, 10),
        compId,
        bracket: bIdx + 1,
        round: 1,
        slot: i,
        p1UserId: p1.userId || undefined,
        p2UserId: p2.userId || undefined,
        winnerUserId: p2.userId ? undefined : p1.userId, // bye auto-wins
        status: (p1.userId && p2.userId) ? 'ready' : (p1.userId ? 'done' : 'pending'),
        createdAt: Date.now(),
      }
      pushMatch(m)
      prevRoundIds.push(m.id)
      totalMatches++
    }

    // Higher rounds — empty matches for the bracket tree shape
    let curRound = 2
    let curCount = bucket.length / 4
    while (curCount >= 1) {
      for (let i = 0; i < curCount; i++) {
        const m: Match = {
          id: 'm_' + Math.random().toString(36).slice(2, 10),
          compId,
          bracket: bIdx + 1,
          round: curRound,
          slot: i,
          status: 'pending',
          createdAt: Date.now(),
        }
        pushMatch(m)
        totalMatches++
      }
      curCount = Math.floor(curCount / 2)
      curRound++
    }
  })

  return { matchesCreated: totalMatches, bracketsFilled }
}

export function setMatchWinner(matchId: string, winnerUserId: string, score?: string): Match {
  const m = getMatch(matchId)
  if (!m) throw new Error('MATCH_NOT_FOUND')
  if (m.status === 'done') throw new Error('MATCH_ALREADY_DONE')
  if (winnerUserId !== m.p1UserId && winnerUserId !== m.p2UserId) throw new Error('INVALID_WINNER')

  m.winnerUserId = winnerUserId
  m.score = score
  m.status = 'done'

  // Feed winner into next round (if not final round of this bracket)
  const next = findNextMatch(m.compId, m.bracket, m.round, m.slot)
  if (next) {
    if (m.slot % 2 === 0) next.p1UserId = winnerUserId
    else                  next.p2UserId = winnerUserId
    if (next.p1UserId && next.p2UserId) next.status = 'ready'
  } else if (m.bracket > 0) {
    // Bracket champion — count as a seed via recordPrelimOutcome
    // We pair the regId by looking up the registration that has attempts left
    // Best-effort: notif the winner and mark advance via record API path
    const winner = getUserById(winnerUserId)
    if (winner) {
      pushNotif(winnerUserId, 'advance', 'قهرمان براکت مقدماتی!', `از براکت ${m.bracket} به فاینال صعود کردی`)
    }
  }
  return m
}

export function isDrawn(compId: string): boolean {
  return matchesForComp(compId).length > 0
}
