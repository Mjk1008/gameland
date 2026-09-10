import { NextResponse } from 'next/server'
import { isBroadcaster, endLiveStream } from '@/lib/live'

export async function POST(req: Request) {
  if (!(await isBroadcaster())) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { id } = await req.json().catch(() => ({}))
  if (!id || typeof id !== 'string') return NextResponse.json({ error: 'ورودی ناقصه' }, { status: 400 })

  endLiveStream(id)
  return NextResponse.json({ ok: true })
}
