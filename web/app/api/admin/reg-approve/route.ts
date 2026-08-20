import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, getRegistrationById, setRegistrationStatus, getEvent, pushNotif, matchesForComp, grantReferralRewards } from '@/lib/store'
import { trackServer, trackUserProps } from '@/lib/track-server'
import { recordPromoterEarning } from '@/lib/promoter'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { regId, action, reason } = await req.json().catch(() => ({}))
  if (!regId || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'پارامتر نامعتبر' }, { status: 400 })
  }
  const r = getRegistrationById(regId)
  if (!r) return NextResponse.json({ error: 'ثبت‌نام پیدا نشد' }, { status: 404 })

  // Once the bracket is drawn, approvals feed seats — flipping a status would
  // corrupt matches. Reversals (and everything else) lock at draw time.
  if (matchesForComp(r.compId).length > 0) {
    return NextResponse.json({ error: 'قرعه‌کشی انجام شده — وضعیت این ثبت‌نام دیگه قابل تغییر نیست' }, { status: 409 })
  }

  const prev = r.status
  const prevPaid = r.paidAttempts ?? 0
  const rsn = (reason ?? '').toString().trim().slice(0, 240)   // optional admin reason/note
  const status = action === 'approve' ? 'approved' : 'rejected'
  if (prev === status) return NextResponse.json({ ok: true, status })   // no-op, no duplicate notif
  setRegistrationStatus(regId, status, action === 'reject' ? rsn || undefined : undefined)
  if (status === 'approved') {
    grantReferralRewards(r.userId)
    await recordPromoterEarning(r, prevPaid)
  }

  // Server-fired funnel event — no client dependency, free coverage of the
  // approve/reject step for the /admin/behavior funnel view.
  const gamer = getUserById(r.userId)
  const ev = getEvent(r.compId)
  trackServer({
    userId: r.userId,
    name: status === 'approved' ? 'reg_approved' : 'reg_rejected',
    path: '/admin/requests',
    props: trackUserProps(gamer, { compId: r.compId, disc: ev?.disc }),
  })

  const c = getEvent(r.compId)
  const title = c?.title ?? 'مسابقه'
  if (action === 'approve') {
    pushNotif(r.userId, 'registration', prev === 'rejected' ? 'ثبت‌نامت بازبینی و تایید شد ✓' : 'ثبت‌نامت تایید شد ✓',
      prev === 'rejected'
        ? `ثبت‌نام «${title}» دوباره بررسی شد و تایید شد — ردِ قبلی اشتباه بود، شرمنده. حالا در قرعه‌کشی شرکت داده می‌شوی.`
        : `پرداخت «${title}» تایید شد.${rsn ? ` یادداشت: ${rsn}` : ''} حالا در قرعه‌کشی شرکت داده می‌شوی.`)
  } else {
    pushNotif(r.userId, 'registration', 'ثبت‌نام رد شد',
      `ثبت‌نام «${title}» تایید نشد.${rsn ? ` دلیل: ${rsn}` : ' برای پیگیری با پشتیبانی تماس بگیر.'}`)
  }

  return NextResponse.json({ ok: true, status })
}
