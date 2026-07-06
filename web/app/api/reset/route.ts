import { NextResponse } from 'next/server'
import { getUserById, setUserPassword } from '@/lib/store'
import { verifyResetToken } from '@/lib/reset-token'
import { hashPassword, MIN_PASSWORD } from '@/lib/password'

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const token = (b.token ?? '').toString()
  const password = (b.password ?? '').toString()

  const userId = verifyResetToken(token)
  if (!userId || !getUserById(userId)) {
    return NextResponse.json({ error: 'لینک بازیابی نامعتبر یا منقضی شده — دوباره درخواست بده' }, { status: 400 })
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json({ error: `گذرواژه باید حداقل ${MIN_PASSWORD} کاراکتر باشه` }, { status: 400 })
  }
  setUserPassword(userId, hashPassword(password))
  return NextResponse.json({ ok: true })
}
