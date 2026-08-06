import { NextResponse } from 'next/server'
import { cancelPlayRequest, getPlayRequest } from '@/lib/arena'
import { withArenaUser } from '@/lib/arena-http'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return withArenaUser(async uid => {
    if (!getPlayRequest(params.id)) return NextResponse.json({ error: 'پیدا نشد' }, { status: 404 })
    const res = cancelPlayRequest(uid, params.id)
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
    return NextResponse.json({ ok: true })
  })
}
