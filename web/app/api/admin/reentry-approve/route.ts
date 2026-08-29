import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, getRegistrationById, settleRegistrationAttempts, getEvent, pushNotif, matchesForComp, unpaidAttempts } from '@/lib/store'
import { placeReentrySeats } from '@/lib/bracket'

// Admin approves a re-entry فیش (MD-5b): settles the unpaid سهم on an
// already-approved registration and seats the player into the first N
// not-started brackets of their group. Body: { regId }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { regId } = await req.json().catch(() => ({}))
  const r = getRegistrationById(regId)
  if (!r) return NextResponse.json({ error: 'ثبت‌نام پیدا نشد' }, { status: 404 })
  if (r.status !== 'approved') return NextResponse.json({ error: 'این ثبت‌نام تاییدشده نیست' }, { status: 400 })
  if (matchesForComp(r.compId).length === 0) return NextResponse.json({ error: 'هنوز قرعه‌کشی نشده' }, { status: 400 })

  const delta = unpaidAttempts(r)
  if (delta <= 0) return NextResponse.json({ error: 'سهمِ پرداخت‌نشده‌ای نداره' }, { status: 400 })

  settleRegistrationAttempts(regId)
  const res = placeReentrySeats(r.compId, r.userId, delta)

  const c = getEvent(r.compId)
  pushNotif(r.userId, 'draw', 'شانس مجدد تایید شد',
    res.placed > 0
      ? `${res.placed} سهمِ شانس مجددت تو «${c?.title ?? 'مسابقه'}» توی براکت‌های ${res.brackets.join('، ')} جای‌گذاری شد. صفحهٔ جدول رو ببین.`
      : `شانس مجددت تایید شد ولی جای خالی توی براکت‌های شروع‌نشده نبود — ادمین دستی جای‌گذاریت می‌کنه.`)

  return NextResponse.json({ ok: true, ...res })
}
