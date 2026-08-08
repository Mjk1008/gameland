// Event names + ingest rules — single source for client /api/track and server trackServer.

/** Must never be accepted from POST /api/track (server-only, needs user_id). */
export const SERVER_ONLY_EVENTS = new Set([
  'signup_complete',
  'profile_complete',
  'ticket_select',
  'receipt_submit',
  'reg_approved',
  'reg_rejected',
])

/** Client may fire without a logged-in user (session-based). */
export const CLIENT_ANONYMOUS_EVENTS = new Set([
  'signup_start',
  'pageview',
  'tap',
])

/** Client may fire only when session has user_id — drops ghost session rows. */
export const CLIENT_AUTH_EVENTS = new Set([
  'pay_page_view',
  'bracket_view',
  'arena_tab_open',
  'arena_feed_view',
  'arena_request_create',
  'arena_request_accept',
  'arena_pair_confirm',
  'arena_book_complete',
  'arena_result_confirm',
  'arena_points_awarded',
])

/** One row per user — stable id for idempotent server inserts. */
export const ONCE_PER_USER_EVENTS = new Set([
  'signup_complete',
  'profile_complete',
])

export function trackEventId(name: string, userId?: string) {
  if (userId && ONCE_PER_USER_EVENTS.has(name)) {
    const prefix = name === 'signup_complete' ? 'sc' : 'pc'
    return `${prefix}_${userId}`
  }
  return 'ev_' + Math.random().toString(36).slice(2, 10)
}

export function clientTrackAllowed(name: string, userId?: string) {
  if (SERVER_ONLY_EVENTS.has(name)) return false
  if (CLIENT_ANONYMOUS_EVENTS.has(name)) return true
  if (CLIENT_AUTH_EVENTS.has(name)) return Boolean(userId)
  return false
}
