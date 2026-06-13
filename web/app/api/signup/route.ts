import { NextResponse } from 'next/server'
import { createUser, verifyOtp } from '@/lib/store'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const phone = (body.phone ?? '').toString().trim()
  const code  = (body.code  ?? '').toString().trim()
  const name  = (body.name  ?? '').toString().trim()
  const tag   = (body.tag   ?? '').toString().trim()
  const city  = (body.city  ?? '').toString().trim()
  const disc  = (body.disc  ?? null)

  if (!/^09\d{9}$/.test(phone)) return NextResponse.json({ error: 'موبایل نامعتبر' },  { status: 400 })
  if (!verifyOtp(phone, code))  return NextResponse.json({ error: 'کد اشتباه/منقضی' }, { status: 400 })
  if (name.length < 2)          return NextResponse.json({ error: 'نام الزامی' },       { status: 400 })
  if (!/^[a-zA-Z0-9_-]{3,16}$/.test(tag)) return NextResponse.json({ error: 'تگ: 3-16 کاراکتر انگلیسی' }, { status: 400 })
  if (city.length < 2)          return NextResponse.json({ error: 'شهر الزامی' },       { status: 400 })

  try {
    const u = createUser({ phone, name, tag, city, primaryDisc: disc, role: 'gamer' })
    return NextResponse.json({ ok: true, userId: u.id })
  } catch (e: any) {
    const map: Record<string, string> = {
      PHONE_TAKEN: 'این موبایل قبلاً ثبت‌نام کرده',
      TAG_TAKEN:   'این تگ قبلاً انتخاب شده',
      NATIONAL_ID_TAKEN: 'این کد ملی قبلاً ثبت شده',
    }
    return NextResponse.json({ error: map[e.message] || 'خطای ناشناخته' }, { status: 400 })
  }
}
