import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { seedArenaDemo } from '@/lib/arena-seed'
import { arenaMonthStats } from '@/lib/arena'
import { whenReady, getUserById } from '@/lib/store'

// Dev-only seed/wipe tool for Play Arena demo data. Admin-gated even in
// development because seedArenaDemo(true) clears + reseeds live arena rows —
// see the production gate in lib/arena-seed.ts for why `force` can never
// bypass NODE_ENV==='production' on its own.
async function adminOnly() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return null
  if (role !== 'admin') return null
  return uid
}

export async function POST() {
  if (process.env.NODE_ENV === 'production' && process.env.ARENA_SEED !== 'true') {
    return NextResponse.json({ error: 'فقط در development' }, { status: 403 })
  }
  await whenReady()
  if (!(await adminOnly())) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })
  const res = await seedArenaDemo(true)
  if (!res.ok) return NextResponse.json({ error: res.message }, { status: 400 })
  return NextResponse.json(res)
}

export async function GET() {
  await whenReady()
  if (!(await adminOnly())) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })
  const stats = arenaMonthStats()
  return NextResponse.json({ ok: true, stats })
}
