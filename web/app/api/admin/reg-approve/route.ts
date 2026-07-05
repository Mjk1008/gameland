import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, getRegistrationById, setRegistrationStatus, getEvent, pushNotif } from '@/lib/store'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { regId, action } = await req.json().catch(() => ({}))
  if (!regId || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'پارامتر نامعتبر' }, { status: 400 })
  }
  const r = getRegistrationById(regId)
  if (!r) return NextResponse.json({ error: 'ثبت‌نام پیدا نشد' }, { status: 404 })

  const status = action === 'approve' ? 'approved' : 'rejected'
  setRegistrationStatus(regId, status)

  const c = getEvent(r.compId)
  const title = c?.title ?? 'مسابقه'
  if (action === 'approve') {
    pushNotif(r.userId, 'registration', 'ثبت‌نامت تایید شد ✓', `پرداخت «${title}» تایید شد. حالا در قرعه‌کشی شرکت داده می‌شوی.`)
  } else {
    pushNotif(r.userId, 'registration', 'ثبت‌نام رد شد', `ثبت‌نام «${title}» تایید نشد. برای پیگیری با پشتیبانی تماس بگیر.`)
  }

  return NextResponse.json({ ok: true, status })
}
