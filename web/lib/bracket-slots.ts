// Sentinel ids for empty (rest) and cancelled-advance slots in bracket trees.
// Stored in Match.p1UserId / p2UserId — never real user rows.

export const CANCELLED_PREFIX = '__gl_cancelled:'
export const REST_PREFIX = '__gl_rest:'

export function cancelledSlotKey(sourceMatchId: string): string {
  return CANCELLED_PREFIX + sourceMatchId
}

export function restSlotKey(n: number): string {
  return REST_PREFIX + n
}

export function isCancelledSlot(uid?: string): boolean {
  return !!uid && uid.startsWith(CANCELLED_PREFIX)
}

export function isRestSlot(uid?: string): boolean {
  return !!uid && uid.startsWith(REST_PREFIX)
}

export function isRealPlayer(uid?: string): boolean {
  return !!uid && !isCancelledSlot(uid) && !isRestSlot(uid)
}

export function restIndex(uid: string): number {
  const n = parseInt(uid.slice(REST_PREFIX.length), 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

const REST_PALETTE = [
  { fg: '#6B9E78', bg: '#6B9E7828' },
  { fg: '#6B8FAE', bg: '#6B8FAE28' },
  { fg: '#AE8F6B', bg: '#AE8F6B28' },
  { fg: '#9E6BAE', bg: '#9E6BAE28' },
  { fg: '#AE6B7B', bg: '#AE6B7B28' },
  { fg: '#7BAE6B', bg: '#7BAE6B28' },
] as const

export function restColor(n: number): { fg: string; bg: string } {
  return REST_PALETTE[(Math.max(1, n) - 1) % REST_PALETTE.length]
}

export type SlotKind = 'player' | 'rest' | 'cancelled'

export function slotKind(uid?: string): SlotKind {
  if (!uid) return 'player'
  if (isRestSlot(uid)) return 'rest'
  if (isCancelledSlot(uid)) return 'cancelled'
  return 'player'
}

export function slotLabel(uid?: string): string | null {
  if (!uid) return null
  if (isRestSlot(uid)) return `rest${restIndex(uid)}`
  if (isCancelledSlot(uid)) return 'لغو شده'
  return null
}
