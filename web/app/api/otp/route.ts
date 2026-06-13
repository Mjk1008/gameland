import { NextResponse } from 'next/server'
import { issueOtp } from '@/lib/store'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const phone = (body.phone ?? '').toString().trim()
  if (!/^09\d{9}$/.test(phone)) {
    return NextResponse.json({ error: 'شماره موبایل معتبر نیست' }, { status: 400 })
  }
  issueOtp(phone)
  return NextResponse.json({ ok: true })
}
