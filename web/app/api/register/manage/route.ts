import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, reduceRegistrationAttempts, cancelRegistration, getEvent, pushNotif, whenReady } from '@/lib/store'
import { voidPendingEarningsForReg } from '@/lib/promoter'

// User-initiated, pre-draw only: lower your own سهم count, or withdraw
// entirely. Kept deliberately understated in the UI — this route is the
// honest escape hatch, not a promoted flow.
export async function POST(req: Request) {
  await whenReady()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const compId = (body.compId ?? '').toString()
  const action = (body.action ?? '').toString()
  const c = getEvent(compId)
  if (!c) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })

  const errorMap: Record<string, string> = {
    REG_NOT_FOUND: 'ثبت‌نامی برای این مسابقه نداری',
    REG_LOCKED: 'قرعه‌کشی انجام شده — دیگه نمی‌شه تغییرش داد',
    TEAM_PARTNER_LOCKED: 'کاهش یا انصراف فقط از طرفِ کاپیتانِ تیم انجام می‌شه',
    BAD_COUNT: 'تعداد سهمِ جدید باید کمتر از تعداد فعلی باشه و نمی‌تونه کمتر از سهمِ پرداخت‌شده بشه',
  }

  try {
    if (action === 'reduce') {
      const n = Number(body.attempts)
      const r = reduceRegistrationAttempts(uid, compId, n)
      pushNotif(uid, 'registration', 'سهمت کم شد',
        `تعدادِ سهمت تو «${c.title}» به ${r.attempts} کاهش پیدا کرد.`)
      return NextResponse.json({ ok: true, attempts: r.attempts })
    }
    if (action === 'cancel') {
      const droppedIds = cancelRegistration(uid, compId)
      for (const id of droppedIds) {
        try { await voidPendingEarningsForReg(id) }
        catch (e) { console.error('[register/manage] voidPendingEarningsForReg failed', id, e) }
      }
      pushNotif(uid, 'registration', 'از مسابقه انصراف دادی',
        `ثبت‌نامت تو «${c.title}» لغو شد. هر وقت خواستی می‌تونی دوباره ثبت‌نام کنی (تا وقتی ثبت‌نام بازه).`)
      return NextResponse.json({ ok: true, cancelled: true })
    }
    return NextResponse.json({ error: 'عملیات نامعتبر' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: errorMap[e.message] || e.message || 'انجام نشد' }, { status: 400 })
  }
}
