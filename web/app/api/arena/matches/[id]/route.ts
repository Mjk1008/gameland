import { NextResponse } from 'next/server'
import {
  getPlayMatch, getPlayRequest, verifiedGamenetsForPicker,
} from '@/lib/arena'
import { generateArenaSlots } from '@/lib/arena-slots'
import { gamenetPhotoIdsFor } from '@/lib/store'
import { withArenaUser, userBrief } from '@/lib/arena-http'

function serializeMatch(m: NonNullable<ReturnType<typeof getPlayMatch>>) {
  const req = getPlayRequest(m.requestId)
  const city = req?.city ?? ''
  const province = req?.province ?? ''
  const gamenets = verifiedGamenetsForPicker(city, province).map(g => ({
    id: g.id,
    name: g.name,
    city: g.city,
    province: g.province ?? '',
    address: g.address,
    stations: g.stations,
    coverPhotoId: gamenetPhotoIdsFor(g.id)[0] ?? null,
  }))
  const proposedGamenet = m.gamenetId ? gamenets.find(g => g.id === m.gamenetId) : null
  return {
    match: {
      ...m,
      request: req ?? null,
      requester: userBrief(m.requesterId),
      acceptor: userBrief(m.acceptorId),
      proposedGamenet,
    },
    slots: generateArenaSlots(),
    gamenets,
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return withArenaUser(async uid => {
    const m = getPlayMatch(params.id)
    if (!m) return NextResponse.json({ error: 'پیدا نشد' }, { status: 404 })
    if (uid !== m.requesterId && uid !== m.acceptorId) {
      return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })
    }
    return NextResponse.json(serializeMatch(m))
  })
}
