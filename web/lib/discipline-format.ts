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
