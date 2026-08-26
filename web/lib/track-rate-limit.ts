// Abuse guard for the unauthenticated POST /api/track ingest.
//
// Single-instance app (one Liara container, in-memory + Postgres), so a plain
// in-process map is enough — no shared store, no new DB table, no dependency.

const WINDOW_MS = 60_000
/** Max /api/track requests per identifier per window. */
const MAX_PER_WINDOW = 60
/** Safety valve so a flood of unique identifiers can't grow the map forever. */
const MAX_TRACKED_KEYS = 20_000

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

function sweep(now: number) {
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
}

/**
 * Best-effort request identifier: proxy-provided client IP, else the
 * client-supplied session id, else a shared bucket (still bounded).
 */
export function trackRateKey(req: Request, sessionId?: string): string {
  const fwd = req.headers.get('x-forwarded-for') ?? ''
  const ip = fwd.split(',')[0]?.trim() || req.headers.get('x-real-ip')?.trim() || ''
  if (ip) return 'ip:' + ip.slice(0, 64)
  if (sessionId) return 'sid:' + sessionId.slice(0, 64)
  return 'anon'
}

/** Fixed-window counter. Returns false once the identifier is over the cap. */
export function allowTrackRequest(key: string, now = Date.now()): boolean {
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_KEYS) {
      sweep(now)
      if (buckets.size >= MAX_TRACKED_KEYS) return false
    }
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (b.count >= MAX_PER_WINDOW) return false
  b.count += 1
  return true
}

/** Seconds the caller should wait before retrying — for the 429 Retry-After. */
export function trackRetryAfterSec(key: string, now = Date.now()): number {
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) return 1
  return Math.max(1, Math.ceil((b.resetAt - now) / 1000))
}
