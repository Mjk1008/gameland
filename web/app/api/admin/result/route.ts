import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, recordPrelimOutcome, pushNotif, getRegistrationById, getEvent } from '@/lib/store'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const { compId, regId, outcome } = b
  if (!regId || (outcome !== 'advance' && outcome !== 'eliminate')) {
    return NextResponse.json({ error: 'پارامتر نامعتبر' }, { status: 400 })
  }

  try {
    const r = recordPrelimOutcome(regId, outcome)
    const c = getEvent(compId)
    const title = outcome === 'advance' ? 'به فاینال راه یافتی! 🎉' : 'حذف از مقدماتی'
    const body  = c
      ? `${c.title} — شانس ${r.prelimsCompleted}/${r.attempts} ${outcome === 'advance' ? 'صعود کرد' : 'حذف شد'}`
      : `نتیجهٔ شانس ${r.prelimsCompleted}/${r.attempts} ثبت شد`
    pushNotif(r.userId, outcome === 'advance' ? 'advance' : 'result', title, body)
    return NextResponse.json({ ok: true, registration: r })
  } catch (e: any) {
    const map: Record<string, string> = {
      REG_NOT_FOUND: 'ثبت‌نام پیدا نشد',
      NO_ATTEMPTS_LEFT: 'شانسی باقی نمونده',
      MAX_SEEDS_REACHED: 'حداکثر ۳ seed مجاز',
    }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
