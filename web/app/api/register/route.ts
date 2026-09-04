import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createRegistration, createTeam, consumeFreeTickets, setReferrerByTag, pushNotif, getUserById, getEvent, getEventConfig, profileCompletion, whenReady, captainTeamFor, getRegistration } from '@/lib/store'
import { persist } from '@/lib/db/persistence'
import { trackServer, trackUserProps } from '@/lib/track-server'
import { validatePromoCode, attachPromoToRegistration, promoErrorMessage, lockRegistrationUnitPrice } from '@/lib/promoter'

function fireTicketSelect(uid: string, u: NonNullable<ReturnType<typeof getUserById>>, c: NonNullable<ReturnType<typeof getEvent>>, attempts: number) {
  trackServer({
    userId: uid,
    name: 'ticket_select',
    path: `/competitions/${c.id}/register`,
    props: trackUserProps(u, { compId: c.id, disc: c.disc, tickets: attempts }),
  })
}

export async function POST(req: Request) {
  await whenReady()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const u = uid ? getUserById(uid) : null
  if (!uid || !u) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  // Complete profile required before joining a competition.
  if (u.role === 'gamer' && !profileCompletion(u).complete) {
    return NextResponse.json({ error: 'اول پروفایلت رو کامل کن', code: 'PROFILE_INCOMPLETE' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const compId = (body.compId ?? '').toString()
  const attempts = Number(body.attempts)
  if (!attempts || attempts < 1 || attempts > 6) return NextResponse.json({ error: 'تعداد بلیط باید ۱ تا ۶ باشد' }, { status: 400 })
  const c = getEvent(compId)
  if (!c) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  const isTeamEvent = getEventConfig(compId).teamSize === 2

  // Referral attribution happens at purchase (product decision): the buyer
  // enters/confirms the code here; set once, immutable, self-referral blocked.
  const ref = (body.ref ?? '').toString().trim()
  if (ref && !u.referredBy) setReferrerByTag(uid, ref)

  const promoRaw = (body.promoCode ?? '').toString().trim()
  let promo: ReturnType<typeof validatePromoCode> | undefined
  if (promoRaw) {
    try { promo = validatePromoCode(promoRaw, uid, compId) }
    catch (e: any) { return NextResponse.json({ error: promoErrorMessage(e.message) }, { status: 400 }) }
    // A promo code only ever applies to a fresh purchase, never a top-up —
    // lockRegistrationUnitPrice() freezes the discounted unit price on the
    // whole registration row, and regPayableAmount() bills unpaidAttempts()
    // (old balance + new) at that price, so attaching a code on a top-up
    // would retroactively discount attempts bought before it. It also lets
    // one buyer burn a code's maxUses alone across repeated top-ups, since
    // attachPromoToRegistration only skips useCount on an EXACT repeat of
    // the same code already on the row.
    const existing = getRegistration(uid, compId)
    const isTopUp = !!existing && existing.status !== 'rejected' && existing.attempts > 0
    if (isTopUp) return NextResponse.json({ error: 'کد تخفیف فقط برای اولین خرید سهم اعمال می‌شه' }, { status: 400 })
  }

  // Registration stays open through draw + live. Extra سهم after the trees
  // exist go to leftovers (بازماندگان), filled into rest slots by admin.
  if (c.status !== 'open' && c.status !== 'live') {
    const why = c.status === 'done' ? 'این مسابقه پایان یافته'
      : 'ثبت‌نام این مسابقه هنوز باز نشده'
    return NextResponse.json({ error: why }, { status: 400 })
  }

  const errorMap: Record<string, string> = {
    MAX_TICKETS: 'سقفِ ۶ سهم برای این رشته پر شده',
    EXCEEDS_MAX: 'بیشتر از سهمیهٔ باقی‌مونده انتخاب کردی',
    REG_LOCKED: 'ثبت‌نام بسته شده — قرعه‌کشی انجام شده',
    ATTEMPTS_OUT_OF_RANGE: 'تعداد سهم باید ۱ تا ۶ باشد',
    INSUFFICIENT_BALANCE: 'سکهٔ کافی نداری',
    TEAM_PARTNER_LOCKED: 'افزودن سهم فقط از طرفِ کاپیتانِ تیم انجام می‌شه',
    INVALID_PARTNER: 'تگِ هم‌تیمی پیدا نشد — درستشو بزن (یا نمی‌تونه خودت باشی)',
    PARTNER_ALREADY_REGISTERED: 'این هم‌تیمی از قبل تو این مسابقه ثبت‌نام داره — یکی دیگه رو انتخاب کن',
  }

  if (isTeamEvent) {
    const teamName = (body.teamName ?? '').toString().trim()
    const partnerTag = (body.partnerTag ?? '').toString().trim()
    const existingTeam = captainTeamFor(uid, compId)
    const live = getRegistration(uid, compId)
    if (!existingTeam && !partnerTag && !(live && live.status !== 'rejected')) return NextResponse.json({ error: 'تگِ هم‌تیمی رو وارد کن' }, { status: 400 })
    try {
      const { registration: r } = await createTeam(compId, uid, teamName, partnerTag, attempts)
      if (promo) await attachPromoToRegistration(r, promo)
      lockRegistrationUnitPrice(r)
      const free = Math.min(u.freeTickets ?? 0, attempts)
      if (free > 0) consumeFreeTickets(uid, r.id, free)
      await persist.user.insertAsync(u)
      await persist.reg.insertAsync(r)
      const paid = attempts - free
      pushNotif(uid, 'registration', 'تیمت ثبت شد',
        `${c.title} با ${attempts} بلیط ثبت شد.${paid > 0 ? ' پس از واریز و ارسال رسید، ثبت‌نامت توسط ادمین تایید می‌شود.' : ''}`)
      fireTicketSelect(uid, u, c, attempts)
      return NextResponse.json({ ok: true, registration: r, freeUsed: free })
    } catch (e: any) {
      return NextResponse.json({ error: errorMap[e.message] || e.message }, { status: 400 })
    }
  }

  try {
    const r = createRegistration(uid, compId, attempts)
    if (promo) await attachPromoToRegistration(r, promo)
    lockRegistrationUnitPrice(r)
    // referral-reward tickets cover part (or all) of this purchase automatically
    const free = Math.min(u.freeTickets ?? 0, attempts)
    if (free > 0) consumeFreeTickets(uid, r.id, free)
    // Durable + ordered: commit the user row first, then the registration, so a
    // surge can't lose the reg or hit the users FK. Notif stays fire-and-forget.
    await persist.user.insertAsync(u)
    await persist.reg.insertAsync(r)
    const paid = attempts - free
    pushNotif(uid, 'registration', 'ثبت‌نام ثبت شد',
      free > 0
        ? `${c.title} با ${attempts} بلیط ثبت شد (${free} سهمِ رایگانِ دعوت + ${paid} پرداختی). ${paid > 0 ? 'برای بخشِ پرداختی فیش بفرست تا ادمین تایید کنه.' : 'نیازی به پرداخت نیست — منتظرِ تاییدِ ادمین بمون.'}`
        : `${c.title} با ${attempts} بلیط ثبت شد. پس از واریز و ارسال رسید، ثبت‌نامت توسط ادمین تایید می‌شود.`)
    fireTicketSelect(uid, u, c, attempts)
    return NextResponse.json({ ok: true, registration: r, freeUsed: free })
  } catch (e: any) {
    return NextResponse.json({ error: errorMap[e.message] || e.message }, { status: 400 })
  }
}
