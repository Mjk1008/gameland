import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getUserById, setEventConfig } from '@/lib/store'

// Toggle a رشته's بازماندگان (survivors) sign-up on/off. Same event — just a
// flag; no separate event is created. When on, the رشته's registration page
// shows the «جدول بازماندگان» box.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId, enabled } = await req.json().catch(() => ({}))
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })

  setEventConfig(compId, { leftoverOpen: enabled === true })
  return NextResponse.json({ ok: true, enabled: enabled === true })
}
