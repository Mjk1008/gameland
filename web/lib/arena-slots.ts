import { ARENA_SLOT_DAYS, ARENA_SLOT_WINDOWS } from './arena-config'

export interface ArenaSlot {
  scheduledAt: number
  label: string
}

/** Fixed booking windows — Tehran-local wall clock (UTC+3:30, no DST). */
export function generateArenaSlots(from = Date.now()): ArenaSlot[] {
  const out: ArenaSlot[] = []
  const offsetMs = 3.5 * 60 * 60 * 1000
  const local = new Date(from + offsetMs)
  const baseDay = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())

  for (let d = 0; d < ARENA_SLOT_DAYS; d++) {
    const dayStart = baseDay + d * 86400000
    for (const w of ARENA_SLOT_WINDOWS) {
      const scheduledAt = dayStart + w.start * 3600000 - offsetMs
      if (scheduledAt <= from + 3600000) continue
      const dayLabel = new Date(dayStart).toLocaleDateString('fa-IR', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
      out.push({ scheduledAt, label: `${dayLabel} · ${w.label}` })
    }
  }
  return out
}

export function isValidArenaSlot(ts: number): boolean {
  return generateArenaSlots(Date.now() - 86400000).some(s => s.scheduledAt === ts)
}
