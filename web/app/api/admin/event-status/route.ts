import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, getEvent, updateEventStatus, registrationsForComp, pushNotif } from '@/lib/store'

const LABEL: Record<string, string> = {
  soon: 'به‌زودی',
  open: 'ثبت‌نام باز',
  live: 'در حال برگزاری',
  done: 'پایان‌یافته',
}

// Which notification (if any) to broadcast to participants on each transition.
const ANNOUNCE: Record<string, { title: string; body: (t: string) => string } | undefined> = {
  open: { title: 'ثبت‌نام باز شد', body: t => `ثبت‌نام مسابقهٔ «${t}» باز شد. همین حالا ثبت‌نام کن.` },
  live: { title: 'مسابقه شروع شد', body: t => `«${t}» وارد مرحلهٔ اجرا شد. براکت خودت رو دنبال کن.` },
  done: { title: 'مسابقه به پایان رسید', body: t => `«${t}» تمام شد. نتایج نهایی اعلام شد.` },
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId, status } = await req.json().catch(() => ({}))
  if (!compId || !LABEL[status]) return NextResponse.json({ error: 'پارامتر نامعتبر' }, { status: 400 })

  const c = getEvent(compId)
  if (!c) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })

  updateEventStatus(compId, status as any, LABEL[status])

  const a = ANNOUNCE[status]
  if (a) {
    for (const r of registrationsForComp(compId)) {
      pushNotif(r.userId, 'announcement', a.title, a.body(c.title))
    }
  }

  return NextResponse.json({ ok: true, status, statusLabel: LABEL[status] })
}
