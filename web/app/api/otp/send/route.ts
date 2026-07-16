import { NextResponse } from 'next/server'
import { canSend, issueCode } from '@/lib/otp'
import { sendSms } from '@/lib/sms'

const OTP_TEMPLATE = process.env.KAVENEGAR_OTP_TEMPLATE || 'gameland-otp'

// Send a login/reset code to a phone. Always returns ok (no enumeration).
export async function POST(req: Request) {
  const { phone } = await req.json().catch(() => ({}))
  const p = (phone ?? '').toString().trim()
  if (!/^09\d{9}$/.test(p)) return NextResponse.json({ error: 'شمارهٔ موبایل درست نیست — با ۰۹ شروع می‌شه و ۱۱ رقمه' }, { status: 400 })
  if (!canSend(p)) return NextResponse.json({ error: 'کد قبلی هنوز معتبره — یه دقیقه صبر کن' }, { status: 429 })

  const code = issueCode(p)
  await sendSms({ to: p, template: OTP_TEMPLATE, tokens: [code] })
  return NextResponse.json({ ok: true })
}
