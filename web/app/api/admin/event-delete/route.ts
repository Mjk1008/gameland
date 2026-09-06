import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, isSuperAdmin, getEvent, deleteEvent } from '@/lib/store'

// Super-admin only, and only for an event with zero registrations/matches —
// deleteEvent() itself enforces the latter (throws EVENT_HAS_DATA), this
// route just turns that into a clear message. An event that already has
// data must be cancelled instead (see /api/admin/event-cancel) so it can
// never lose data to a misclick again.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const u = uid ? getUserById(uid) : undefined
  if (!isSuperAdmin(u)) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId } = await req.json().catch(() => ({}))
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })

  try {
    deleteEvent(compId)
  } catch (e: any) {
    if (e?.message === 'EVENT_HAS_DATA') {
      return NextResponse.json({ error: 'این مسابقه ثبت‌نام یا براکت داره — به‌جاش کنسلش کن، حذف کامل فقط برای مسابقهٔ خالیه' }, { status: 400 })
    }
    throw e
  }
  return NextResponse.json({ ok: true })
}
