import { NextResponse } from 'next/server'
import { submitPlayResult, getPlayMatch } from '@/lib/arena'
import { withArenaUser, sendArenaNotifs, userBrief } from '@/lib/arena-http'
import { persist } from '@/lib/db/persistence'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withArenaUser(async uid => {
    const b = await req.json().catch(() => ({}))
    const winnerId = String(b.winnerId ?? '')
    if (!getPlayMatch(params.id)) return NextResponse.json({ error: 'پیدا نشد' }, { status: 404 })
    const res = submitPlayResult(uid, params.id, winnerId)
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
    sendArenaNotifs(res.notify)
    if (res.pointsAwarded > 0) {
      persist.track.insertMany([{
        id: 'ev_' + Math.random().toString(36).slice(2, 10),
        userId: res.match.winnerUserId ?? uid,
        sessionId: 'server',
        name: 'arena_points_awarded',
        path: '/arena',
        props: JSON.stringify({ matchId: params.id, points: res.pointsAwarded }),
      }])
    }
    return NextResponse.json({
      match: { ...res.match, requester: userBrief(res.match.requesterId), acceptor: userBrief(res.match.acceptorId) },
      pointsAwarded: res.pointsAwarded,
    })
  })
}
