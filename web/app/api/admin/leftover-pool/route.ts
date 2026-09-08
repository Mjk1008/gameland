import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getUserById, setLeftoverPoolEnabled } from '@/lib/store'

// Toggle a رشته's own بازماندگان pool on/off (per-event, not global). Turning
// it on the first time creates the sibling pool event; later toggles reuse it.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId, enabled } = await req.json().catch(() => ({}))
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })

  try {
    const pool = setLeftoverPoolEnabled(compId, enabled === true, uid)
    return NextResponse.json({ ok: true, enabled: enabled === true, poolEventId: pool?.id ?? null })
  } catch (e: any) {
    return NextResponse.json({ error: e.message === 'EVENT_NOT_FOUND' ? 'مسابقه پیدا نشد' : 'انجام نشد' }, { status: 400 })
  }
}
