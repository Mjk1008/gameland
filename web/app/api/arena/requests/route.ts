import { NextResponse } from 'next/server'
import { listOpenRequests, createPlayRequest, getPlayRequest, type PlayRequest } from '@/lib/arena'
import { getUserById } from '@/lib/store'
import { withArenaUser, sendArenaNotifs, userBrief } from '@/lib/arena-http'
import type { Disc } from '@/lib/mock-data'

function serializeRequest(r: PlayRequest) {
  const u = getUserById(r.userId)
  return {
    ...r,
    requester: u ? { id: u.id, name: u.name, tag: u.tag, city: u.city } : null,
  }
}

export async function GET(req: Request) {
  return withArenaUser(async () => {
    const q = new URL(req.url).searchParams
    const rows = listOpenRequests({
      city: q.get('city') || undefined,
      province: q.get('province') || undefined,
      disc: q.get('disc') || undefined,
    })
    return NextResponse.json({ requests: rows.map(serializeRequest) })
  })
}

export async function POST(req: Request) {
  return withArenaUser(async uid => {
    const b = await req.json().catch(() => ({}))
    const bestOf = Number(b.bestOf) as 1 | 3 | 5
    const res = createPlayRequest(uid, {
      disc: String(b.disc ?? '') as Disc,
      bestOf,
      city: String(b.city ?? ''),
      province: String(b.province ?? ''),
      note: b.note ? String(b.note) : '',
    })
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
    return NextResponse.json({ request: serializeRequest(res.request) })
  })
}
