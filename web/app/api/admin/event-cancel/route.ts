import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, isSuperAdmin, getEvent, cancelEvent, registrationsForComp, pushNotif } from '@/lib/store'

// Super-admin only. Soft-cancels an event that already has registrations/a
// bracket — see cancelEvent() in lib/store.ts. Nothing is deleted; this is
// the only way to retire an event with real data (deleteEvent refuses once
// any exists). Restricted to one person on purpose after the 2026-09 incident:
// a regular admin/organizer misclick must never be able to take an event
// down, only the account in SUPER_ADMIN_PHONE.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const u = uid ? getUserById(uid) : undefined
  if (!isSuperAdmin(u)) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId } = await req.json().catch(() => ({}))
  const c = compId ? getEvent(compId) : undefined
  if (!c) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  if (c.status === 'cancelled') return NextResponse.json({ ok: true, status: 'cancelled' })

  cancelEvent(compId)
  for (const r of registrationsForComp(compId)) {
    pushNotif(r.userId, 'announcement', 'مسابقه لغو شد', `مسابقهٔ «${c.title}» لغو شد.`)
  }

  return NextResponse.json({ ok: true, status: 'cancelled' })
}
