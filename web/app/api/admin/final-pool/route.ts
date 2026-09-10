import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getEventConfig, getUserById, getTeam } from '@/lib/store'
import { addToFinalPool, removeFromFinalPool, setFinalPoolSahm, setEntryCap, setFinalRandomSeeding } from '@/lib/bracket'

// Admin-curated final pool (see lib/bracket.ts finalPool). One route, five
// actions — they all touch the same {userId, sahm}[] list on the event. For a
// team (2v2) event the "userId" slot in that list holds a teamId instead — a
// team is always exactly one final seat, so سهم there is forced to 1.
function validId(compId: string, isTeam: boolean, id: unknown): id is string {
  if (typeof id !== 'string' || !id) return false
  return isTeam ? getTeam(id)?.compId === compId : !!getUserById(id)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { compId, action } = body
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  const isTeam = getEventConfig(compId).teamSize === 2

  if (action === 'add') {
    const { userId, sahm } = body
    if (!validId(compId, isTeam, userId)) return NextResponse.json({ error: isTeam ? 'تیم پیدا نشد' : 'کاربر پیدا نشد' }, { status: 404 })
    const pool = addToFinalPool(compId, userId, isTeam ? 1 : Math.max(1, Math.floor(Number(sahm) || 1)))
    return NextResponse.json({ ok: true, pool })
  }
  if (action === 'send') {
    const { userIds } = body
    if (!Array.isArray(userIds) || userIds.length === 0) return NextResponse.json({ error: 'کسی انتخاب نشده' }, { status: 400 })
    let pool = null as ReturnType<typeof addToFinalPool> | null
    for (const id of userIds) if (validId(compId, isTeam, id)) pool = addToFinalPool(compId, id, 1)
    return NextResponse.json({ ok: true, added: userIds.length, pool })
  }
  if (action === 'sahm') {
    if (isTeam) return NextResponse.json({ error: 'برای رشته‌های دو‌به‌دو سهم قابل تغییر نیست — هر تیم یک صندلی' }, { status: 400 })
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
    if (isTeam) return NextResponse.json({ error: 'برای رشته‌های دو‌به‌دو سقف سهم کاربردی نداره' }, { status: 400 })
    const { cap } = body
    const n = Math.floor(Number(cap))
    if (!Number.isFinite(n) || n < 1) return NextResponse.json({ error: 'سقف نامعتبره' }, { status: 400 })
    setEntryCap(compId, n)
    return NextResponse.json({ ok: true })
  }
  if (action === 'randomSeeding') {
    setFinalRandomSeeding(compId, body.enabled === true)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'عملیات نامعتبر' }, { status: 400 })
}
