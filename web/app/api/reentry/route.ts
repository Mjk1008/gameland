import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, getRegistration, setRegistrationAttempts, getEvent, pushNotif, matchesForComp, whenReady, unpaidAttempts } from '@/lib/store'
import { bracketModeOf, entryCapFor, notStartedBracketsForUser } from '@/lib/bracket'

// User buys `count` re-entry سهم after the draw (MD-5b). Adds attempts to the
// existing approved registration (bypassing the post-draw lock) so the new سهم
// show as unpaid → the user then uploads a فیش, admin approves via
// /api/admin/reentry-approve which settles payment and seats the player.
export async function POST(req: Request) {
  await whenReady()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const { compId, count } = await req.json().catch(() => ({}))
  const c = getEvent(compId)
  if (!c) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  if (matchesForComp(compId).length === 0) return NextResponse.json({ error: 'هنوز قرعه‌کشی نشده' }, { status: 400 })
  if (bracketModeOf(compId) !== 'prelims') return NextResponse.json({ error: 'شانس مجدد فقط برای مسابقات مقدماتی‌داره' }, { status: 400 })

  const r = getRegistration(uid, compId)
  if (!r || r.status !== 'approved') return NextResponse.json({ error: 'ثبت‌نام تاییدشده‌ای برای این مسابقه نداری' }, { status: 400 })

  const cap = entryCapFor(compId)
  if (r.attempts >= cap) return NextResponse.json({ error: `سقفِ سهم (${cap}) پره — شانس مجدد نداری` }, { status: 400 })
  if (notStartedBracketsForUser(compId, uid) === 0) return NextResponse.json({ error: 'براکتِ شروع‌نشده‌ای نمونده' }, { status: 400 })

  const n = Math.max(1, Math.min(Number(count) || 1, cap - r.attempts, notStartedBracketsForUser(compId, uid)))
  const updated = setRegistrationAttempts(r.id, r.attempts + n, { allowPostDraw: true })

  pushNotif(uid, 'registration', 'شانس مجدد ثبت شد',
    `${n} سهمِ شانس مجدد برای «${c.title}» اضافه شد. حالا فیش پرداخت رو بارگذاری کن تا ادمین تایید و توی براکت بعدی جای‌گذاریت کنه.`)

  return NextResponse.json({ ok: true, attempts: updated.attempts, added: n, unpaid: unpaidAttempts(updated) })
}
