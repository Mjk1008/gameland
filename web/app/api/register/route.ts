import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createRegistration, pushNotif, getUserById, getEvent, profileCompletion } from '@/lib/store'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const u = uid ? getUserById(uid) : null
  if (!uid || !u) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  // Complete profile required before joining a competition.
  if (u.role === 'gamer' && !profileCompletion(u).complete) {
    return NextResponse.json({ error: 'PROFILE_INCOMPLETE', message: 'اول پروفایلت رو کامل کن' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const compId = (body.compId ?? '').toString()
  const attempts = Number(body.attempts)
  if (!attempts || attempts < 1 || attempts > 6) return NextResponse.json({ error: 'تعداد بلیط باید ۱ تا ۶ باشد' }, { status: 400 })
  const c = getEvent(compId)
  if (!c) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  // V1: registration is free (sponsor-funded prizes). Only open events accept it.
  if (c.status !== 'open') {
    const why = c.status === 'done' ? 'این مسابقه پایان یافته'
      : c.status === 'live' ? 'ثبت‌نام بسته شده — مسابقه در حال برگزاری است'
      : 'ثبت‌نام این مسابقه هنوز باز نشده'
    return NextResponse.json({ error: why }, { status: 400 })
  }

  try {
    const r = createRegistration(uid, compId, attempts)
    pushNotif(uid, 'registration', 'ثبت‌نام ثبت شد', `${c.title} با ${attempts} بلیط ثبت شد. پس از واریز و ارسال رسید، ثبت‌نامت توسط ادمین تایید می‌شود.`)
    return NextResponse.json({ ok: true, registration: r })
  } catch (e: any) {
    const map: Record<string, string> = {
      ALREADY_REGISTERED: 'قبلاً در این مسابقه ثبت‌نام کرده‌ای',
      ATTEMPTS_OUT_OF_RANGE: 'تعداد بلیط باید ۱ تا ۶ باشد',
      INSUFFICIENT_BALANCE: 'سکهٔ کافی نداری',
    }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
