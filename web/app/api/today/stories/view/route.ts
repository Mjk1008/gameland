import { NextResponse } from 'next/server'
import { markStoriesSeen } from '@/lib/stories'
import { withTodayUser } from '@/lib/today-hub-http'

// Batched — the client collects seen ids and calls this once on viewer
// close (+ once on visibilitychange→hidden), not per-segment (docs/37 §4.4).
export async function POST(req: Request) {
  return withTodayUser(async uid => {
    const b = await req.json().catch(() => ({}))
    const ids = Array.isArray(b.ids) ? b.ids.map((x: any) => x.toString()).slice(0, 50) : []
    if (ids.length) markStoriesSeen(ids, uid)
    return NextResponse.json({ ok: true })
  })
}
