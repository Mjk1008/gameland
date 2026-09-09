import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getUserById } from '@/lib/store'
import { addToFinalPool, removeFromFinalPool, setFinalPoolSahm, setEntryCap } from '@/lib/bracket'

// Admin-curated final pool (see lib/bracket.ts finalPool). One route, four
// actions — they all touch the same {userId, sahm}[] list on the event.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { compId, action } = body
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })

  if (action === 'add') {
    const { userId, sahm } = body
    if (!userId || !getUserById(userId)) return NextResponse.json({ error: 'کاربر پیدا نشد' }, { status: 404 })
    const pool = addToFinalPool(compId, userId, Math.max(1, Math.floor(Number(sahm) || 1)))
    return NextResponse.json({ ok: true, pool })
  }
  if (action === 'send') {
    const { userIds } = body
    if (!Array.isArray(userIds) || userIds.length === 0) return NextResponse.json({ error: 'کسی انتخاب نشده' }, { status: 400 })
    let pool = null as ReturnType<typeof addToFinalPool> | null
    for (const uid of userIds) if (typeof uid === 'string' && getUserById(uid)) pool = addToFinalPool(compId, uid, 1)
    return NextResponse.json({ ok: true, added: userIds.length, pool })
  }
  if (action === 'sahm') {
    const { userId, sahm } = body
    if (!userId) return NextResponse.json({ error: 'ورودی نامعتبر' }, { status: 400 })
    const pool = setFinalPoolSahm(compId, userId, Math.floor(Number(sahm) || 0))
    return NextResponse.json({ ok: true, pool })
  }
  if (action === 'remove') {
    const { userId } = body
    if (!userId) return NextResponse.json({ error: 'ورودی نامعتبر' }, { status: 400 })
    const pool = removeFromFinalPool(compId, userId)
    return NextResponse.json({ ok: true, pool })
  }
  if (action === 'cap') {
    const { cap } = body
    const n = Math.floor(Number(cap))
    if (!Number.isFinite(n) || n < 1) return NextResponse.json({ error: 'سقف نامعتبره' }, { status: 400 })
    setEntryCap(compId, n)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'عملیات نامعتبر' }, { status: 400 })
}
