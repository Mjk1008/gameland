import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createRegistration, consumeFreeTickets, setReferrerByTag, pushNotif, getUserById, getEvent, profileCompletion, whenReady } from '@/lib/store'
import { persist } from '@/lib/db/persistence'

export async function POST(req: Request) {
  await whenReady()
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

  // Referral attribution happens at purchase (product decision): the buyer
  // enters/confirms the code here; set once, immutable, self-referral blocked.
  const ref = (body.ref ?? '').toString().trim()
  if (ref && !u.referredBy) setReferrerByTag(uid, ref)
  // V1: registration is free (sponsor-funded prizes). Only open events accept it.
  if (c.status !== 'open') {
    const why = c.status === 'done' ? 'این مسابقه پایان یافته'
      : c.status === 'live' ? 'ثبت‌نام بسته شده — مسابقه در حال برگزاری است'
      : 'ثبت‌نام این مسابقه هنوز باز نشده'
    return NextResponse.json({ error: why }, { status: 400 })
  }

  try {
    const r = createRegistration(uid, compId, attempts)
    // referral-reward tickets cover part (or all) of this purchase automatically
    const free = Math.min(u.freeTickets ?? 0, attempts)
    if (free > 0) consumeFreeTickets(uid, r.id, free)
    // Durable + ordered: commit the user row first, then the registration, so a
    // surge can't lose the reg or hit the users FK. Notif stays fire-and-forget.
    await persist.user.insertAsync(u)
    await persist.reg.insertAsync(r)
    const paid = attempts - free
    pushNotif(uid, 'registration', 'ثبت‌نام ثبت شد',
      free > 0
        ? `${c.title} با ${attempts} بلیط ثبت شد (${free} سهمِ رایگانِ دعوت + ${paid} پرداختی). ${paid > 0 ? 'برای بخشِ پرداختی فیش بفرست تا ادمین تایید کنه.' : 'نیازی به پرداخت نیست — منتظرِ تاییدِ ادمین بمون.'}`
        : `${c.title} با ${attempts} بلیط ثبت شد. پس از واریز و ارسال رسید، ثبت‌نامت توسط ادمین تایید می‌شود.`)
    return NextResponse.json({ ok: true, registration: r, freeUsed: free })
  } catch (e: any) {
    const map: Record<string, string> = {
      MAX_TICKETS: 'سقفِ ۶ سهم برای این رشته پر شده',
      EXCEEDS_MAX: 'بیشتر از سهمیهٔ باقی‌مونده انتخاب کردی',
      REG_LOCKED: 'ثبت‌نام بسته شده — قرعه‌کشی انجام شده',
      ATTEMPTS_OUT_OF_RANGE: 'تعداد سهم باید ۱ تا ۶ باشد',
      INSUFFICIENT_BALANCE: 'سکهٔ کافی نداری',
    }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
