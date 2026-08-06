import { NextResponse } from 'next/server'
import { bookPlayMatch, getPlayMatch, getPlayRequest, verifiedGamenetsForPicker } from '@/lib/arena'
import { generateArenaSlots } from '@/lib/arena-slots'
import { gamenetPhotoIdsFor } from '@/lib/store'
import { withArenaUser, sendArenaNotifs, userBrief } from '@/lib/arena-http'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withArenaUser(async uid => {
    const b = await req.json().catch(() => ({}))
    const gamenetId = String(b.gamenetId ?? '')
    const scheduledAt = Number(b.scheduledAt)
    if (!getPlayMatch(params.id)) return NextResponse.json({ error: 'پیدا نشد' }, { status: 404 })
    const res = bookPlayMatch(uid, params.id, gamenetId, scheduledAt)
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
    sendArenaNotifs(res.notify)
    return NextResponse.json({
      match: { ...res.match, requester: userBrief(res.match.requesterId), acceptor: userBrief(res.match.acceptorId) },
      scheduled: res.scheduled,
    })
  })
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return withArenaUser(async () => {
    const m = getPlayMatch(params.id)
    if (!m) return NextResponse.json({ error: 'پیدا نشد' }, { status: 404 })
    const req = getPlayRequest(m.requestId)
    const city = req?.city ?? ''
    const province = req?.province ?? ''
    return NextResponse.json({
      slots: generateArenaSlots(),
      gamenets: verifiedGamenetsForPicker(city, province).map(g => ({
        id: g.id, name: g.name, city: g.city, province: g.province,
        address: g.address, stations: g.stations,
        coverPhotoId: gamenetPhotoIdsFor(g.id)[0] ?? null,
      })),
    })
  })
}
