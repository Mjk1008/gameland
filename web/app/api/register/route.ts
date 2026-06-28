import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createRegistration, pushNotif, getUserById, applyCoinTxn, coinBalance, getEvent } from '@/lib/store'

const COINS_PER_ATTEMPT = 100

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const u = uid ? getUserById(uid) : null
  if (!uid || !u) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const compId = (body.compId ?? '').toString()
  const attempts = Number(body.attempts)
  if (!attempts || attempts < 1 || attempts > 6) return NextResponse.json({ error: 'تعداد شانس باید ۱ تا ۶ باشد' }, { status: 400 })
  const c = getEvent(compId)
  if (!c) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  if (c.status === 'done')  return NextResponse.json({ error: 'این مسابقه پایان یافته' }, { status: 400 })

  const cost = attempts * COINS_PER_ATTEMPT
  if (coinBalance(uid) < cost) {
    return NextResponse.json({ error: `سکهٔ کافی نداری. نیاز: ${cost}, موجودی: ${coinBalance(uid)}` }, { status: 400 })
  }

  try {
    const r = createRegistration(uid, compId, attempts)
    applyCoinTxn(uid, -cost, 'attempt', r.id)
    pushNotif(uid, 'registration', 'ثبت‌نام موفق', `${c.title} با ${attempts} شانس ثبت شد. ${cost} سکه کسر شد. منتظر قرعه‌کشی باش.`)
    return NextResponse.json({ ok: true, registration: r })
  } catch (e: any) {
    const map: Record<string, string> = {
      ALREADY_REGISTERED: 'قبلاً در این مسابقه ثبت‌نام کرده‌ای',
      ATTEMPTS_OUT_OF_RANGE: 'تعداد شانس باید ۱ تا ۶ باشد',
      INSUFFICIENT_BALANCE: 'سکهٔ کافی نداری',
    }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
