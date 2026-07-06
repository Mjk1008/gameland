import { NextResponse } from 'next/server'
import { createUser } from '@/lib/store'
import { hashPassword, MIN_PASSWORD } from '@/lib/password'
import { DISC } from '@/lib/mock-data'

const VALID_DISCS = new Set(Object.keys(DISC))
const VALID_MSG = new Set(['whatsapp', 'telegram', 'both'])

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const phone     = (b.phone ?? '').toString().trim()
  const email     = (b.email ?? '').toString().trim().toLowerCase()
  const password  = (b.password ?? '').toString()
  const firstName = (b.firstName ?? '').toString().trim()
  const lastName  = (b.lastName ?? '').toString().trim()
  const tag       = (b.tag ?? '').toString().trim()
  const province  = (b.province ?? '').toString().trim()
  const city      = (b.city ?? '').toString().trim()
  const messenger = VALID_MSG.has(b.messenger) ? b.messenger : 'whatsapp'
  const discs     = Array.isArray(b.discs) ? b.discs.filter((d: string) => VALID_DISCS.has(d)) : []
  const experienceYears = b.experienceYears != null && b.experienceYears !== '' ? Number(b.experienceYears) : undefined
  const teamName  = (b.teamName ?? '').toString().trim() || undefined

  if (!/^09\d{9}$/.test(phone)) return NextResponse.json({ error: 'شمارهٔ موبایل نامعتبر' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'ایمیل معتبر وارد کن' }, { status: 400 })
  if (password.length < MIN_PASSWORD) return NextResponse.json({ error: `گذرواژه حداقل ${MIN_PASSWORD} کاراکتر` }, { status: 400 })
  if (!firstName || !lastName) return NextResponse.json({ error: 'نام و نام خانوادگی الزامی' }, { status: 400 })
  if (!/^[a-zA-Z0-9_-]{3,16}$/.test(tag)) return NextResponse.json({ error: 'تگ: ۳ تا ۱۶ کاراکتر انگلیسی' }, { status: 400 })
  if (!province || !city) return NextResponse.json({ error: 'استان و شهر الزامی' }, { status: 400 })
  if (discs.length === 0) return NextResponse.json({ error: 'حداقل یک رشته انتخاب کن' }, { status: 400 })

  try {
    const u = createUser({
      phone, email, passwordHash: hashPassword(password),
      name: `${firstName} ${lastName}`.trim(), firstName, lastName,
      tag, province, city, messenger,
      primaryDisc: discs[0], discs, experienceYears, teamName,
      role: 'gamer',
    })
    return NextResponse.json({ ok: true, userId: u.id })
  } catch (e: any) {
    const map: Record<string, string> = {
      PHONE_TAKEN: 'این شماره قبلاً ثبت‌نام کرده',
      EMAIL_TAKEN: 'این ایمیل قبلاً ثبت‌نام کرده',
      TAG_TAKEN: 'این تگ قبلاً انتخاب شده',
      NATIONAL_ID_TAKEN: 'این کد ملی قبلاً ثبت شده',
    }
    return NextResponse.json({ error: map[e.message] || 'خطای ناشناخته' }, { status: 400 })
  }
}
