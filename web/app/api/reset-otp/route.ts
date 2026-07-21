import { NextResponse } from 'next/server'
import { verifyCode } from '@/lib/otp'
import { getUserByPhone, setUserPassword, whenReady } from '@/lib/store'
import { hashPassword, MIN_PASSWORD } from '@/lib/password'

// Reset a password using an SMS OTP (phone-first, no email). The client first
// calls /api/otp/send for the phone, then posts the code + new password here.
export async function POST(req: Request) {
  await whenReady()
  const b = await req.json().catch(() => ({}))
  const phone = (b.phone ?? '').toString().trim()
  const code = (b.code ?? '').toString().trim()
  const password = (b.password ?? '').toString()

  if (!/^09\d{9}$/.test(phone)) return NextResponse.json({ error: 'شمارهٔ موبایل نامعتبر' }, { status: 400 })
  if (password.length < MIN_PASSWORD) return NextResponse.json({ error: `گذرواژه حداقل ${MIN_PASSWORD} کاراکتر` }, { status: 400 })
  if (!verifyCode(phone, code)) return NextResponse.json({ error: 'کد نادرست یا منقضی شده' }, { status: 400 })

  const u = getUserByPhone(phone)
  if (!u) return NextResponse.json({ error: 'حسابی با این شماره پیدا نشد' }, { status: 404 })
  setUserPassword(u.id, hashPassword(password))
  return NextResponse.json({ ok: true })
}
