import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { setRegistrationAttempts, getRegistrationById, attemptsCapFor } from '@/lib/store'

// Admin corrects a registration's ticket count (سهم), 1..cap. Locked after the draw.
export async function POST(req: Request) {
  const role = (await getServerSession(authOptions) as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })

  const { regId, attempts } = await req.json().catch(() => ({}))
  const n = Number(attempts)
  const existing = regId ? getRegistrationById(regId) : undefined
  if (!existing) return NextResponse.json({ error: 'ثبت‌نام پیدا نشد' }, { status: 404 })
  const cap = attemptsCapFor(existing.compId)
  if (!n || n < 1 || n > cap) return NextResponse.json({ error: `تعداد سهم باید ۱ تا ${cap} باشد` }, { status: 400 })

  try {
    const r = setRegistrationAttempts(regId, n)
    return NextResponse.json({ ok: true, attempts: r.attempts })
  } catch (e: any) {
    const msg = e.message === 'REG_LOCKED' ? 'بعد از قرعه‌کشی تعداد سهم قابل تغییر نیست'
      : e.message === 'REG_NOT_FOUND' ? 'ثبت‌نام پیدا نشد' : 'انجام نشد'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
