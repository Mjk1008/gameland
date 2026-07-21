import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pendingRegistrations, hasReceipt, getEvent, pushNotif, getUserById } from '@/lib/store'

// Admin: remind everyone whose registration isn't approved yet AND who hasn't
// uploaded a receipt, to pay + upload their فیش. One reminder per user.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if ((session as any)?.role !== 'admin' && (session as any)?.role !== 'organizer') {
    return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  // default: only those WITHOUT a receipt (the ones who still need to act).
  // includeWithReceipt=true → also nudge pending-with-receipt (awaiting review).
  const includeWithReceipt = !!body.includeWithReceipt

  const perUser = new Map<string, string>()   // userId → a comp title (for the message)
  for (const r of pendingRegistrations()) {
    if (!includeWithReceipt && hasReceipt(r.id)) continue
    if (!perUser.has(r.userId)) perUser.set(r.userId, getEvent(r.compId)?.title ?? 'مسابقه')
  }

  let sent = 0
  for (const [userId, title] of perUser) {
    if (!getUserById(userId)) continue
    pushNotif(userId, 'registration', 'فیشِ پرداختت رو آپلود کن',
      `ثبت‌نامت در «${title}» هنوز کامل نشده. برای نهایی‌شدن، مبلغ رو کارت‌به‌کارت کن و عکسِ فیش رو تو اپ (صفحهٔ پرداخت) آپلود کن تا ادمین تأیید کنه.`)
    sent++
  }
  return NextResponse.json({ ok: true, sent })
}
