import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { setRegistrationAttempts, LEFTOVER_MAX_ATTEMPTS } from '@/lib/store'

// Admin corrects a registration's ticket count (سهم), 1..LEFTOVER_MAX_ATTEMPTS
// (10) — a بازماندگان top-up can legitimately push a row past the normal 6.
// Locked after the draw.
export async function POST(req: Request) {
  const role = (await getServerSession(authOptions) as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })

  const { regId, attempts } = await req.json().catch(() => ({}))
  const n = Number(attempts)
  if (!regId || !n || n < 1 || n > LEFTOVER_MAX_ATTEMPTS) return NextResponse.json({ error: `تعداد سهم باید ۱ تا ${LEFTOVER_MAX_ATTEMPTS} باشد` }, { status: 400 })

  try {
    const r = setRegistrationAttempts(regId, n)
    return NextResponse.json({ ok: true, attempts: r.attempts })
  } catch (e: any) {
    const msg = e.message === 'REG_LOCKED' ? 'بعد از قرعه‌کشی تعداد سهم قابل تغییر نیست'
      : e.message === 'REG_NOT_FOUND' ? 'ثبت‌نام پیدا نشد' : 'انجام نشد'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
