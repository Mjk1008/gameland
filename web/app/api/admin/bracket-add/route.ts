import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getUserById } from '@/lib/store'
import { addPlayerToSlot, fillRestSlot } from '@/lib/bracket'

// Admin fills a rest slot from leftovers, or drops a player into an empty
// round-1 slot. Body: { matchId, side, userId } or { compId, groupKey, bracket, slot, userId }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId, groupKey, bracket, slot, userId, matchId, side } = await req.json().catch(() => ({}))
  if (!userId || !getUserById(userId)) return NextResponse.json({ error: 'کاربر پیدا نشد' }, { status: 404 })

  const map: Record<string, string> = {
    SLOT_NOT_FOUND: 'این جایگاه پیدا نشد',
    SLOT_FULL: 'این جایگاه پره',
    NOT_REST: 'اینجا rest نیست',
    NOT_LEFTOVER: 'این گیمر تو بازماندگان نیست',
    BRACKET_DONE: 'این براکت تمام شده',
    NEXT_ROUND_PLAYED: 'راند بعد بازی شده',
    SELF_MATCH: 'نمی‌تونه با خودش بازی کنه',
  }

  try {
    if (matchId && (side === 1 || side === 2)) {
      const m = fillRestSlot(matchId, side, userId)
      return NextResponse.json({ ok: true, match: m })
    }
    if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
    if (typeof groupKey !== 'string' || typeof bracket !== 'number' || typeof slot !== 'number') {
      return NextResponse.json({ error: 'ورودی نامعتبر' }, { status: 400 })
    }
    const m = addPlayerToSlot(compId, groupKey, bracket, slot, userId)
    return NextResponse.json({ ok: true, match: m })
  } catch (e: any) {
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
