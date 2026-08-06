// Play Arena («میدون») tunables — see docs/27-challenge-ladder-prd.md

export const ARENA_REQUEST_TTL_HOURS = 72
export const ARENA_CONFIRM_WINDOW_HOURS = 48
export const ARENA_MAX_OPEN_REQUESTS = 2
export const ARENA_MAX_OPEN_PER_DISC = 1
export const ARENA_REQUEST_COOLDOWN_HOURS = 24
export const ARENA_FRAUD_RATIO_REQUESTS = 3
export const ARENA_FRAUD_COOLDOWN_HOURS = 72
export const ARENA_WIN_POINTS_BO1 = 5
export const ARENA_WIN_POINTS_BO3 = 10
export const ARENA_MAX_SCORED_WINS_PER_30D = 3
export const ARENA_NOTE_MAX_LEN = 80
export const ARENA_SLOT_DAYS = 7

export const ARENA_SLOT_WINDOWS = [
  { start: 10, end: 13, label: '۱۰–۱۳' },
  { start: 13, end: 16, label: '۱۳–۱۶' },
  { start: 16, end: 19, label: '۱۶–۱۹' },
  { start: 19, end: 22, label: '۱۹–۲۲' },
] as const
