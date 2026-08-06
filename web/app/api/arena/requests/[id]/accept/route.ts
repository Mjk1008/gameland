import { NextResponse } from 'next/server'
import { acceptPlayRequest, getPlayRequest } from '@/lib/arena'
import { withArenaUser, sendArenaNotifs, userBrief } from '@/lib/arena-http'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return withArenaUser(async uid => {
    const r = getPlayRequest(params.id)
    if (!r) return NextResponse.json({ error: 'درخواست پیدا نشد' }, { status: 404 })
    const res = acceptPlayRequest(uid, params.id)
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
    sendArenaNotifs(res.notify)
    return NextResponse.json({
      match: { ...res.match, requester: userBrief(res.match.requesterId), acceptor: userBrief(res.match.acceptorId) },
    })
  })
}
