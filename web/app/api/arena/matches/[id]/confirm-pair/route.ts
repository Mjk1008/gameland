import { NextResponse } from 'next/server'
import { confirmPair, getPlayMatch } from '@/lib/arena'
import { withArenaUser, sendArenaNotifs, userBrief } from '@/lib/arena-http'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return withArenaUser(async uid => {
    if (!getPlayMatch(params.id)) return NextResponse.json({ error: 'پیدا نشد' }, { status: 404 })
    const res = confirmPair(uid, params.id)
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
    sendArenaNotifs(res.notify)
    return NextResponse.json({
      match: { ...res.match, requester: userBrief(res.match.requesterId), acceptor: userBrief(res.match.acceptorId) },
    })
  })
}
