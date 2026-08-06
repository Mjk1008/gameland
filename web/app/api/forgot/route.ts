import { NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/store'
import { makeResetToken } from '@/lib/reset-token'
import { sendMail } from '@/lib/mailer'

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const email = (b.email ?? '').toString().trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'ایمیل رو وارد کن' }, { status: 400 })

  const u = getUserByEmail(email)
  // Only password accounts can reset via email; Google accounts log in with Google.
  if (u && u.passwordHash) {
    const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://gamelandteam.ir'
    const link = `${base}/reset?token=${makeResetToken(u.id)}`
    const html = `<div style="font-family:Tahoma,sans-serif;direction:rtl;line-height:2">
      <h2>بازیابی گذرواژهٔ گیم‌لند</h2>
      <p>سلام ${u.name || ''}،</p>
      <p>برای تعیین گذرواژهٔ جدید روی لینک زیر بزن (تا ۳۰ دقیقه معتبره):</p>
      <p><a href="${link}" style="color:#A855F7">${link}</a></p>
      <p>اگه تو این درخواست رو ندادی، این ایمیل رو نادیده بگیر.</p>
    </div>`
    try { await sendMail(email, 'بازیابی گذرواژهٔ گیم‌لند', html) } catch (e) { console.error('[forgot] mail failed', e) }
  }
  // Never reveal whether the email exists.
  return NextResponse.json({ ok: true })
}
