// Competition engine — per docs/15. Pure logic; UI/data layer plugs in later.

import type { Attempt, Competition, Seed } from './schema'

export const MAX_ATTEMPTS_PER_COMPETITION = 6
export const MAX_SEEDS_TO_FINAL = 2
export const FINAL_SIZE = 128
export const PRELIM_COUNT = 6

export interface AttemptPurchaseInput {
  playerId: string
  competitionId: string
  alreadyBought: number  // existing attempts for this player+comp
  coinsAvailable: number
  coinsPerAttempt: number
}

export type AttemptPurchaseResult =
  | { ok: true; coinsCost: number; attemptNumber: number }
  | { ok: false; reason: 'cap-reached' | 'insufficient-coins' }

export function purchaseAttempt(i: AttemptPurchaseInput): AttemptPurchaseResult {
  if (i.alreadyBought >= MAX_ATTEMPTS_PER_COMPETITION)
    return { ok: false, reason: 'cap-reached' }
  if (i.coinsAvailable < i.coinsPerAttempt)
    return { ok: false, reason: 'insufficient-coins' }
  return { ok: true, coinsCost: i.coinsPerAttempt, attemptNumber: i.alreadyBought + 1 }
}

// Earn a seed: player's attempt result meets threshold AND player still under cap of 2 seeds.
export function evaluateAttemptForSeed(opts: {
  wins: number
  seedThreshold: number
  currentSeedsHeld: number
}): { earnedSeed: boolean; reason?: 'below-threshold' | 'seed-cap-reached' } {
  if (opts.currentSeedsHeld >= MAX_SEEDS_TO_FINAL)
    return { earnedSeed: false, reason: 'seed-cap-reached' }
  if (opts.wins < opts.seedThreshold)
    return { earnedSeed: false, reason: 'below-threshold' }
  return { earnedSeed: true }
}

// Per-player roadmap: where I am, my next match, wins-to-advance, seeds, final qualification.
export interface PlayerRoadmap {
  playerId: string
  competition: Competition
  attempts: Attempt[]
  attemptsRemaining: number
  seeds: Seed[]
  seedsRemaining: number
  qualifiedForFinal: boolean
  nextStep: string  // human-readable Persian
}

export function buildRoadmap(args: {
  playerId: string
  competition: Competition
  attempts: Attempt[]
  seeds: Seed[]
}): PlayerRoadmap {
  const myAttempts = args.attempts.filter(a => a.playerId === args.playerId && a.competitionId === args.competition.id)
  const mySeeds = args.seeds.filter(s => s.playerId === args.playerId && s.competitionId === args.competition.id)
  const attemptsRemaining = Math.max(0, MAX_ATTEMPTS_PER_COMPETITION - myAttempts.length)
  const seedsRemaining = Math.max(0, MAX_SEEDS_TO_FINAL - mySeeds.length)
  const qualifiedForFinal = mySeeds.length >= 1

  let nextStep: string
  if (qualifiedForFinal && seedsRemaining === 0) {
    nextStep = `✅ راهی فینال شدی با ${mySeeds.length} سهمیه — منتظر تاریخ فینال (۱۲۸ نفره)`
  } else if (qualifiedForFinal) {
    nextStep = `✅ فعلاً ${mySeeds.length} سهمیه داری. می‌تونی تا ${attemptsRemaining} تلاش دیگه برای جدول‌های بعدی بخری.`
  } else if (attemptsRemaining > 0) {
    nextStep = `هنوز سهمیه نگرفتی. ${attemptsRemaining} تلاش باقی‌مونده — جدول بعدی رو شروع کن.`
  } else {
    nextStep = '❌ تلاش‌هات تموم شد و سهمیه نگرفتی. مسابقهٔ بعدی منتظرته.'
  }

  return {
    playerId: args.playerId,
    competition: args.competition,
    attempts: myAttempts,
    attemptsRemaining,
    seeds: mySeeds,
    seedsRemaining,
    qualifiedForFinal,
    nextStep,
  }
}
