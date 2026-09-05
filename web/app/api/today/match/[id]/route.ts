import { NextResponse } from 'next/server'
import { matchDetailFor } from '@/lib/today-snapshot'
import { withTodayUser } from '@/lib/today-hub-http'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return withTodayUser(async uid => {
    const detail = await matchDetailFor(uid, params.id)
    if (!detail) return NextResponse.json({ error: 'بازی پیدا نشد' }, { status: 404 })
    return NextResponse.json(detail)
  })
}
