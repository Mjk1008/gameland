/** 1v1 vs 2v2 labels — same game can appear twice under one رویداد (e.g. FC26 solo + FC26 teams). */

export type TeamSize = 1 | 2

export function normalizeTeamSize(v?: number | null): TeamSize {
  return v === 2 ? 2 : 1
}

/** Unique slot within a mother competition: disc + format. */
export function disciplineSlotKey(disc: string, teamSize?: number | null): string {
  return `${disc}:${normalizeTeamSize(teamSize)}`
}

/** Public card / list title segment for the game name. */
export function disciplineDisplayName(gameName: string, teamSize?: number | null): string {
  return normalizeTeamSize(teamSize) === 2 ? `${gameName} · ۲به۲` : gameName
}

/** Full persisted event title when the discipline belongs to a رویداد. */
export function buildDisciplineTitle(compTitle: string, gameName: string, teamSize?: number | null): string {
  return `${compTitle} — ${disciplineDisplayName(gameName, teamSize)}`
}

export function formatModeLabel(teamSize?: number | null): '۱به۱' | '۲به۲' {
  return normalizeTeamSize(teamSize) === 2 ? '۲به۲' : '۱به۱'
}

// ── tournament shape ──────────────────────────────────────────────────────────
export type BracketMode = 'prelims' | 'direct'

// Only EA FC 26 (disc id `fc26`) runs city/province prelim brackets. Every other
// discipline is a single direct bracket — everyone seeded straight in, that one
// bracket IS the tournament. Admin can override per-event until the draw.
export const PRELIM_DISCIPLINES = new Set(['fc26'])

export function defaultBracketMode(disc: string): BracketMode {
  return PRELIM_DISCIPLINES.has(disc) ? 'prelims' : 'direct'
}

export function bracketModeLabel(mode: BracketMode): string {
  return mode === 'prelims' ? 'مقدماتی استانی + فینال' : 'تک‌براکت مستقیم'
}

/** Ticket/سهم buy cap per discipline. Direct-bracket seats also use this. Seed-to-final cap is 2. */
export const DEFAULT_ENTRY_CAP = 6
