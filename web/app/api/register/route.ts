import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createRegistration, pushNotif, getUserById } from '@/lib/store'
import { COMPS } from '@/lib/mock-data'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const compId = (body.compId ?? '').toString()
  const attempts = Number(body.attempts)
  if (!attempts || attempts < 1 || attempts > 6) return NextResponse.json({ error: 'تعداد شانس باید ۱ تا ۶ باشد' }, { status: 400 })
  const c = COMPS.find(x => x.id === compId)
  if (!c) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  if (c.status === 'done')  return NextResponse.json({ error: 'این مسابقه پایان یافته' }, { status: 400 })

  try {
    const r = createRegistration(uid, compId, attempts)
    pushNotif(uid, 'registration', 'ثبت‌نام موفق', `${c.title} با ${attempts} شانس ثبت شد. منتظر قرعه‌کشی باش.`)
    return NextResponse.json({ ok: true, registration: r })
  } catch (e: any) {
    const map: Record<string, string> = {
      ALREADY_REGISTERED: 'قبلاً در این مسابقه ثبت‌نام کرده‌ای',
      ATTEMPTS_OUT_OF_RANGE: 'تعداد شانس باید ۱ تا ۶ باشد',
    }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
