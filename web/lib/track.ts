// Client-side behavioral event tracking. Each call is its own fire-and-forget
// request with `keepalive: true` (Fetch API — request completes even if the
// page navigates away immediately after, unlike a batched/timer flush which
// would lose the event on a same-tick redirect e.g. signup → signIn).
// See docs/24-analytics-prd.md.

let sessionId: string | null = null

function getSessionId(): string {
  if (sessionId) return sessionId
  try {
    sessionId = localStorage.getItem('gl_sid')
    if (!sessionId) {
      sessionId = 'sid_' + Math.random().toString(36).slice(2, 12)
      localStorage.setItem('gl_sid', sessionId)
    }
  } catch {
    sessionId = 'sid_' + Math.random().toString(36).slice(2, 12)
  }
  return sessionId
}

/** Session id for correlating pre-auth steps with server-fired events. */
export function getTrackSessionId(): string {
  return getSessionId()
}

// Allow-listed callers only — never pass raw user text (receipt content,
// chat text, phone numbers) as a prop value; ids/enums/counts are fine.
export function track(name: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const payload = JSON.stringify({
    sessionId: getSessionId(),
    events: [{ name, path: window.location.pathname, props }],
  })
  fetch('/api/track', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
}
