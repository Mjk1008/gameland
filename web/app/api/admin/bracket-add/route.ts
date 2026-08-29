import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getUserById } from '@/lib/store'
import { addPlayerToSlot } from '@/lib/bracket'

// Admin drops a player into an empty round-1 slot of a bracket (MD-6).
// Body: { compId, groupKey, bracket, slot, userId }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId, groupKey, bracket, slot, userId } = await req.json().catch(() => ({}))
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  if (typeof groupKey !== 'string' || typeof bracket !== 'number' || typeof slot !== 'number') {
    return NextResponse.json({ error: 'ورودی نامعتبر' }, { status: 400 })
  }
  if (!userId || !getUserById(userId)) return NextResponse.json({ error: 'کاربر پیدا نشد' }, { status: 404 })

  try {
    const m = addPlayerToSlot(compId, groupKey, bracket, slot, userId)
    return NextResponse.json({ ok: true, match: m })
  } catch (e: any) {
    const map: Record<string, string> = {
      SLOT_NOT_FOUND: 'این جایگاه پیدا نشد',
      SLOT_FULL: 'این جایگاه پره',
    }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
