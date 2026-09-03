import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, getRegistrationById, setRegistrationStatus, getEvent, pushNotif, matchesForComp, grantReferralRewards, unpaidAttempts, receiptCoversPendingPayment } from '@/lib/store'
import { isRealPlayer } from '@/lib/bracket-slots'
import { trackServer, trackUserProps } from '@/lib/track-server'
import { recordPromoterEarning, voidPendingEarningsForReg } from '@/lib/promoter'

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

  // After the draw, approve still works (leftover pool). Reject is blocked
  // only if this account already has a real seat in a tree.
  if (action === 'reject') {
    const seated = matchesForComp(r.compId).some(m =>
      (isRealPlayer(m.p1UserId) && m.p1UserId === r.userId) ||
      (isRealPlayer(m.p2UserId) && m.p2UserId === r.userId),
    )
    if (seated) return NextResponse.json({ error: 'این گیمر تو براکت نشسته — رد ممکن نیست' }, { status: 409 })
  }

  if (action === 'approve' && unpaidAttempts(r) > 0 && !receiptCoversPendingPayment(r)) {
    return NextResponse.json({ error: 'فیش پرداخت آپلود نشده' }, { status: 400 })
  }

  const prev = r.status
  const prevPaid = r.paidAttempts ?? 0
  const rsn = (reason ?? '').toString().trim().slice(0, 240)   // optional admin reason/note
  const status = action === 'approve' ? 'approved' : 'rejected'
  if (prev === status) return NextResponse.json({ ok: true, status })   // no-op, no duplicate notif
  setRegistrationStatus(regId, status, action === 'reject' ? rsn || undefined : undefined)
  if (status === 'approved') {
    grantReferralRewards(r.userId)
    // Never let a commission-recording failure block the approval from
    // finishing — the status flip above already succeeded, so the gamer must
    // still get notified either way. A lost earning here is recoverable by an
    // admin reconciling app_promoter_earnings against approved regs; a gamer
    // approved-but-never-notified, or an approval that 500s after the DB
    // already shows them approved, is not something support can see coming.
    try { await recordPromoterEarning(r, prevPaid) }
    catch (e) { console.error('[reg-approve] recordPromoterEarning failed', regId, e) }
  } else if (status === 'rejected') {
    try { await voidPendingEarningsForReg(regId) }
    catch (e) { console.error('[reg-approve] voidPendingEarningsForReg failed', regId, e) }
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
    const drawn = matchesForComp(r.compId).length > 0
    pushNotif(r.userId, 'registration', prev === 'rejected' ? 'ثبت‌نامت بازبینی و تایید شد ✓' : 'ثبت‌نامت تایید شد ✓',
      prev === 'rejected'
        ? `ثبت‌نام «${title}» دوباره بررسی شد و تایید شد — ردِ قبلی اشتباه بود، شرمنده.${drawn ? '' : ' حالا در قرعه‌کشی شرکت داده می‌شوی.'}`
        : `پرداخت «${title}» تایید شد.${rsn ? ` یادداشت: ${rsn}` : ''}${drawn ? '' : ' حالا در قرعه‌کشی شرکت داده می‌شوی.'}`)
  } else {
    pushNotif(r.userId, 'registration', 'ثبت‌نام رد شد',
      `ثبت‌نام «${title}» تایید نشد.${rsn ? ` دلیل: ${rsn}` : ' برای پیگیری با پشتیبانی تماس بگیر.'}`)
  }

  return NextResponse.json({ ok: true, status })
}
