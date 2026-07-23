import { NextResponse } from 'next/server'
import { createPhoneUser, setReferrerByTag, whenReady } from '@/lib/store'
import { persist } from '@/lib/db/persistence'
import { hashPassword, MIN_PASSWORD } from '@/lib/password'

// Minimal signup — just enough to create an account and be able to log in.
// The full gamer profile is completed later on the profile page.
export async function POST(req: Request) {
  await whenReady()   // never race the initial DB hydration (avoids dup accounts)
  const b = await req.json().catch(() => ({}))
  const phone    = (b.phone ?? '').toString().trim()
  const email    = (b.email ?? '').toString().trim().toLowerCase()
  const password = (b.password ?? '').toString()

  if (!/^09\d{9}$/.test(phone)) return NextResponse.json({ error: 'شمارهٔ موبایل نامعتبر' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'ایمیل معتبر وارد کن' }, { status: 400 })
  if (password.length < MIN_PASSWORD) return NextResponse.json({ error: `گذرواژه حداقل ${MIN_PASSWORD} کاراکتر` }, { status: 400 })

  try {
    const u = createPhoneUser({ phone, email, passwordHash: hashPassword(password) })
    // referral attribution — optional, silently ignored when invalid (never
    // blocks signup); immutable once set
    const ref = (b.ref ?? '').toString().trim()
    if (ref) setReferrerByTag(u.id, ref)
    await persist.user.insertAsync(u)   // durable: only report success once committed
    return NextResponse.json({ ok: true, userId: u.id })
  } catch (e: any) {
    const map: Record<string, string> = {
      PHONE_TAKEN: 'این شماره قبلاً ثبت‌نام کرده',
      EMAIL_TAKEN: 'این ایمیل قبلاً ثبت‌نام کرده',
    }
    return NextResponse.json({ error: map[e.message] || 'یه مشکلی پیش اومد، دوباره امتحان کن' }, { status: 400 })
  }
}
