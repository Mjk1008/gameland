import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { persist } from '@/lib/db/persistence'

// Behavioral event ingest — always returns ok, never throws into the client.
// Fire-and-forget write (persist.track.insertMany doesn't await the DB), so
// this never adds latency the caller has to wait on beyond the round-trip.
const MAX_BATCH = 20

export async function POST(req: Request) {
  const session = await getServerSession(authOptions).catch(() => null)
  const uid = (session as any)?.uid as string | undefined

  const body = await req.json().catch(() => null)
  const sessionId = (body?.sessionId ?? '').toString().slice(0, 40)
  const events = Array.isArray(body?.events) ? body.events.slice(0, MAX_BATCH) : []
  if (!sessionId || !events.length) return NextResponse.json({ ok: true })

  const rows = events
    .filter((e: any) => e && typeof e.name === 'string' && e.name.length > 0 && e.name.length < 60)
    .map((e: any) => ({
      id: 'ev_' + Math.random().toString(36).slice(2, 10),
      userId: uid,
      sessionId,
      name: e.name.slice(0, 60),
      path: (e.path ?? '').toString().slice(0, 200),
      props: JSON.stringify(e.props ?? {}).slice(0, 500),
    }))

  persist.track.insertMany(rows)
  return NextResponse.json({ ok: true })
}
