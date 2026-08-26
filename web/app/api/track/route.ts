import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { persist } from '@/lib/db/persistence'
import { clientTrackAllowed, trackEventId } from '@/lib/track-events'
import { allowTrackRequest, trackRateKey, trackRetryAfterSec } from '@/lib/track-rate-limit'

// Behavioral event ingest — always returns ok, never throws into the client.
// Fire-and-forget write (persist.track.insertMany doesn't await the DB), so
// this never adds latency the caller has to wait on beyond the round-trip.
//
// Anonymous callers are allowed (logged-out pageviews are real analytics), so
// the only abuse guard is the per-IP rate limit in lib/track-rate-limit.
const MAX_BATCH = 20
const MAX_PATH_LEN = 200
const MAX_PROPS_LEN = 500

function tooMany(key: string) {
  return NextResponse.json(
    { ok: false },
    { status: 429, headers: { 'Retry-After': String(trackRetryAfterSec(key)) } },
  )
}

export async function POST(req: Request) {
  // Reject floods before the session lookup — that is the expensive part.
  const ipKey = trackRateKey(req)
  const haveIp = ipKey !== 'anon'
  if (haveIp && !allowTrackRequest(ipKey)) return tooMany(ipKey)

  const session = await getServerSession(authOptions).catch(() => null)
  const uid = (session as any)?.uid as string | undefined

  const body = await req.json().catch(() => null)
  const sessionId = (body?.sessionId ?? '').toString().slice(0, 40)

  // No proxy IP header (direct hit) — fall back to the client session id.
  if (!haveIp) {
    const sidKey = trackRateKey(req, sessionId)
    if (!allowTrackRequest(sidKey)) return tooMany(sidKey)
  }

  const events = Array.isArray(body?.events) ? body.events.slice(0, MAX_BATCH) : []
  if (!sessionId || !events.length) return NextResponse.json({ ok: true })

  const rows = events
    .filter((e: any) => e && typeof e.name === 'string' && e.name.length > 0 && e.name.length < 60)
    .filter((e: any) => clientTrackAllowed(e.name, uid))
    .map((e: any) => ({
      id: trackEventId(e.name, uid),
      userId: uid,
      sessionId,
      name: e.name.slice(0, 60),
      path: (e.path ?? '').toString().slice(0, MAX_PATH_LEN),
      props: JSON.stringify(e.props ?? {}).slice(0, MAX_PROPS_LEN),
    }))

  if (rows.length) persist.track.insertMany(rows)
  return NextResponse.json({ ok: true })
}
