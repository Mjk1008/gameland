// Domain schema (TypeScript types). Maps 1:1 to docs/12-tech-approach + docs/14 + docs/15.
// Postgres tables will mirror these (one row per record, snake_case columns).

export type EventTier = 'S' | 'A' | 'B' | 'C'
// S=Major(×1.0)  A=Gameland-run(×0.8)  B=All-Star(×0.5)  C=Local(×0.3)

export interface Discipline { id: string; name: string; nameFa: string } // eFootball, EA FC, CS2, …

export interface Player {
  id: string
  nickname: string
  fullName: string
  phone: string              // identity key — duplicates flagged (docs/11 R11)
  city?: string
  province?: string
  disciplines: string[]      // discipline ids
  playStyle?: string         // "حمله‌ای" / "تاکتیکی" …
  photo?: string
  bio?: string
  joinedAt: string           // ISO
}

export interface Competition {
  id: string
  name: string
  disciplineId: string
  tier: EventTier
  date: string               // ISO
  city?: string
  venue?: string             // gamenet name (later)
  organizer?: string
  format: 'six-prelim-128-final' | 'single-elim' | 'double-elim' | 'group-final'
  prizePoolToman?: number    // sponsor-funded only (docs/11 R1)
  sponsorIds: string[]
}

export interface PrelimBracket {
  id: string
  competitionId: string
  index: 1 | 2 | 3 | 4 | 5 | 6
  size: number               // e.g. 64
  seedThreshold: number      // wins to earn a seed (e.g. 6)
}

export interface Attempt {
  // a paid SKILL-SERVICE — not a stake (docs/11 R1, docs/15)
  id: string
  competitionId: string
  bracketId: string
  playerId: string
  coinsSpent: number         // non-convertible coins (docs/11 R6)
  attemptNumber: number      // 1..6 per competition
  resultWins: number
  resultLosses: number
  earnedSeed: boolean
  createdAt: string
}

export interface Seed {
  // earned seed → final. Max 3 per player per competition (docs/15)
  id: string
  competitionId: string
  playerId: string
  fromBracketId: string
  fromAttemptId: string
}

export interface MatchResult {
  // canonical match record; feeds ranking
  id: string
  competitionId: string
  stage: 'prelim' | 'final'
  bracketId?: string
  playerAId: string
  playerBId: string
  scoreA: number
  scoreB: number
  winnerId: string
  playedAt: string
}

export interface Placement {
  competitionId: string
  playerId: string
  rank: number               // 1 = champion
}

export interface RankingEntry {
  playerId: string
  disciplineId: string
  points: number
  events: number
  bestPlacement: number
  bestTier: EventTier
  lastEventAt: string
}

export interface CoinTxn {
  // non-convertible coin ledger (docs/10, docs/11 R6)
  id: string
  playerId: string
  delta: number              // + topup / - spend
  reason: 'topup' | 'attempt' | 'store' | 'refund' | 'admin'
  refId?: string             // attempt id, store item, …
  createdAt: string
}

export interface Sponsor { id: string; name: string; logo?: string }

export interface Prize {
  // sponsor-funded only — fundedBy required (docs/11 R1)
  id: string
  competitionId: string
  rank: number
  amountToman?: number
  description?: string
  fundedBy: string           // sponsor id (NON-NULL)
}

export interface Notification {
  id: string
  playerId: string
  channel: 'sms' | 'in-app' | 'telegram'
  template: string
  payload: Record<string, string | number>
  status: 'queued' | 'sent' | 'failed'
  createdAt: string
}
