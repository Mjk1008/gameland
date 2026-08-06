import { NextResponse } from 'next/server'
import { seedArenaDemo } from '@/lib/arena-seed'
import { arenaMonthStats } from '@/lib/arena'
import { whenReady } from '@/lib/store'

export async function POST() {
  if (process.env.NODE_ENV === 'production' && process.env.ARENA_SEED !== 'true') {
    return NextResponse.json({ error: 'فقط در development' }, { status: 403 })
  }
  await whenReady()
  const res = await seedArenaDemo(true)
  if (!res.ok) return NextResponse.json({ error: res.message }, { status: 400 })
  return NextResponse.json(res)
}

export async function GET() {
  await whenReady()
  const stats = arenaMonthStats()
  return NextResponse.json({ ok: true, stats })
}
