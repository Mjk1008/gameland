import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, whenReady, allEvents } from '@/lib/store'
import {
  allPromoterCodes, updatePromoterCode, getPromoterCode,
  pendingEarningsTotal, allPromoterEarnings, activatePromoter, reactivatePromoter,
  deactivatePromoter, deactivatePromoterCode, reactivatePromoterCode,
  updatePromoterTerms, renamePrimaryCode, listActivePromoters, pendingCodeRequests,
  adminIssueCode, rejectCodeRequest, statsForCode, primaryCodeForPromoter,
  campaignCodesForPromoter, markEarningPaid, markAllPendingPaidForPromoter,
  reconcilePromoterEarnings,
} from '@/lib/promoter'

async function adminOnly() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return null
  if (role !== 'admin' && role !== 'organizer') return null
  return uid
}

const MSG: Record<string, string> = {
  CODE_EXISTS: 'این کد قبلاً ثبت شده',
  USER_NOT_FOUND: 'کاربر پیدا نشد',
  NOT_GAMER: 'پروموتر فقط برای حساب گیمر است',
  NOT_ACTIVE: 'پروموتر فعال نیست',
  NOT_FOUND: 'پیدا نشد',
  NO_PRIMARY_CODE: 'کد اصلی این پروموتر پیدا نشد',
  PRIMARY_CODE: 'کد اصلی را نمی‌شود جدا غیرفعال کرد — کل پروموتر را متوقف کن',
  ALREADY_REVIEWED: 'این درخواست قبلاً بررسی شده',
  REQUEST_PENDING: 'یک درخواست در انتظار تأیید دارد',
  CODE_LIMIT: 'سقف کدهای کمپین این پروموتر پر است',
  COMP_REQUIRED: 'برای کد کمپین یک رویداد انتخاب کن',
  COMP_NOT_FOUND: 'این رویداد پیدا نشد',
  DISCOUNT_RANGE: 'تخفیف باید ۱ تا ۹۰٪ باشد',
  COMMISSION_RANGE: 'کمیسیون باید ۰ تا ۵۰٪ باشد',
  CODE_LENGTH: 'کد باید ۳ تا ۲۴ کاراکتر باشد',
}

function errMsg(raw: string) {
  const s = (raw ?? '').toString()
  if (MSG[s]) return MSG[s]
  if (/unique|duplicate|23505/i.test(s)) return MSG.CODE_EXISTS
  if (/does not exist|undefined column/i.test(s)) return 'اسکیمای دیتابیس ناقص است — یک دیپلوی لازم است'
  if (/23503|foreign key/i.test(s)) return 'حساب این کاربر در دیتابیس کامل نیست'
  if (/PROMO_INSERT_FAILED|failed query/i.test(s)) return 'ذخیره در دیتابیس نشد — دوباره امتحان کن'
  return s.length > 12 ? s.slice(0, 160) : 'انجام نشد'
}

const eventTitle = (id?: string) => (id ? allEvents().find(e => e.id === id)?.title ?? id : undefined)

function mapCode(id: string) {
  const c = getPromoterCode(id)!
  return {
    id: c.id,
    code: c.code,
    active: c.active,
    compId: c.compId,
    eventTitle: eventTitle(c.compId),
    discountPercent: c.discountPercent,
    commissionPercent: c.commissionPercent,
    note: c.note,
    ...statsForCode(c.id),
  }
}

export async function GET() {
  await whenReady()
  const adminId = await adminOnly()
  if (!adminId) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const partners = listActivePromoters().map(u => {
    const primary = primaryCodeForPromoter(u.id)
    const campaigns = campaignCodesForPromoter(u.id, { includeInactive: true })
    const mine = allPromoterEarnings().filter(e => e.promoterUserId === u.id)
    return {
      userId: u.id,
      name: u.name,
      tag: u.tag,
      phone: u.phone ?? '',
      active: !!u.promoterActive,
      discountPercent: u.promoterDiscountPercent ?? 0,
      commissionPercent: u.promoterCommissionPercent ?? 0,
      primary: primary ? mapCode(primary.id) : null,
      campaignCodes: campaigns.filter(c => c.active).map(c => mapCode(c.id)),
      inactiveCampaignCodes: campaigns.filter(c => !c.active).map(c => mapCode(c.id)),
      pendingCommission: mine.filter(e => e.status === 'pending').reduce((s, e) => s + e.commissionAmount, 0),
      paidCommission: mine.filter(e => e.status === 'paid').reduce((s, e) => s + e.commissionAmount, 0),
    }
  })

  const requests = pendingCodeRequests().map(r => {
    const u = getUserById(r.promoterUserId)
    return {
      id: r.id,
      promoterUserId: r.promoterUserId,
      promoterName: u?.name ?? '?',
      promoterTag: u?.tag ?? '?',
      promoterPhone: u?.phone ?? '',
      requestedCode: r.requestedCode,
      compId: r.compId,
      eventTitle: eventTitle(r.compId),
      note: r.note,
      createdAt: r.createdAt,
    }
  })

  const earnings = allPromoterEarnings().map(e => {
    const u = getUserById(e.promoterUserId)
    const code = getPromoterCode(e.codeId)
    return {
      ...e,
      promoterName: u?.name ?? '?',
      promoterTag: u?.tag ?? '?',
      codeLabel: code?.code ?? '?',
    }
  })

  const events = allEvents().map(e => ({ id: e.id, title: e.title }))

  return NextResponse.json({ partners, requests, earnings, events, pendingTotal: pendingEarningsTotal() })
}

export async function POST(req: Request) {
  await whenReady()
  const adminId = await adminOnly()
  if (!adminId) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const action = (body.action ?? 'activate').toString()
  const userId = (body.userId ?? body.promoterUserId ?? '').toString()
  const codeId = (body.codeId ?? '').toString()

  try {
    switch (action) {
      case 'activate': {
        if (!userId) return NextResponse.json({ error: 'کاربر را انتخاب کن' }, { status: 400 })
        const { primaryCode } = await activatePromoter(userId, body.discountPercent, body.commissionPercent)
        return NextResponse.json({ ok: true, code: primaryCode ? { id: primaryCode.id, code: primaryCode.code } : null })
      }
      case 'reactivate': {
        if (!userId) return NextResponse.json({ error: 'کاربر نامعتبر' }, { status: 400 })
        await reactivatePromoter(userId)
        return NextResponse.json({ ok: true })
      }
      case 'deactivate': {
        if (!userId) return NextResponse.json({ error: 'کاربر نامعتبر' }, { status: 400 })
        await deactivatePromoter(userId)
        return NextResponse.json({ ok: true })
      }
      case 'updateTerms': {
        if (!userId) return NextResponse.json({ error: 'کاربر نامعتبر' }, { status: 400 })
        const u = getUserById(userId)
        await updatePromoterTerms(
          userId,
          body.discountPercent != null ? Number(body.discountPercent) : (u?.promoterDiscountPercent ?? 20),
          body.commissionPercent != null ? Number(body.commissionPercent) : (u?.promoterCommissionPercent ?? 10),
        )
        return NextResponse.json({ ok: true })
      }
      case 'renameCode': {
        if (!userId || !body.code) return NextResponse.json({ error: 'کد نامعتبر' }, { status: 400 })
        const c = await renamePrimaryCode(userId, body.code.toString())
        return NextResponse.json({ ok: true, code: { id: c.id, code: c.code } })
      }
      case 'setNote': {
        if (!codeId) return NextResponse.json({ error: 'کد نامعتبر' }, { status: 400 })
        await updatePromoterCode(codeId, { note: (body.note ?? '').toString() })
        return NextResponse.json({ ok: true })
      }
      case 'createCampaignCode': {
        if (!userId) return NextResponse.json({ error: 'کاربر را انتخاب کن' }, { status: 400 })
        const c = await adminIssueCode(userId, adminId, {
          code: body.code?.toString(),
          note: body.note?.toString(),
          compId: body.compId?.toString(),
        })
        return NextResponse.json({ ok: true, code: { id: c.id, code: c.code } })
      }
      case 'approveRequest': {
        const requestId = (body.requestId ?? '').toString()
        const request = pendingCodeRequests().find(r => r.id === requestId)
        if (!request) return NextResponse.json({ error: 'درخواست پیدا نشد' }, { status: 404 })
        const c = await adminIssueCode(request.promoterUserId, adminId, {
          requestId,
          code: body.code?.toString(),
          note: body.note?.toString(),
        })
        return NextResponse.json({ ok: true, code: { id: c.id, code: c.code } })
      }
      case 'rejectRequest': {
        const requestId = (body.requestId ?? '').toString()
        if (!requestId) return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 400 })
        await rejectCodeRequest(requestId, adminId, body.reason?.toString())
        return NextResponse.json({ ok: true })
      }
      case 'deactivateCode': {
        if (!codeId) return NextResponse.json({ error: 'کد نامعتبر' }, { status: 400 })
        await deactivatePromoterCode(codeId)
        return NextResponse.json({ ok: true })
      }
      case 'reactivateCode': {
        if (!codeId) return NextResponse.json({ error: 'کد نامعتبر' }, { status: 400 })
        await reactivatePromoterCode(codeId)
        return NextResponse.json({ ok: true })
      }
      case 'markPaid': {
        const earningId = (body.earningId ?? '').toString()
        if (!earningId) return NextResponse.json({ error: 'شناسه نامعتبر' }, { status: 400 })
        await markEarningPaid(earningId, body.note?.toString())
        return NextResponse.json({ ok: true })
      }
      case 'markPaidAll': {
        if (!userId) return NextResponse.json({ error: 'کاربر نامعتبر' }, { status: 400 })
        const res = await markAllPendingPaidForPromoter(userId, body.note?.toString())
        return NextResponse.json({ ok: true, ...res })
      }
      case 'reconcile': {
        const res = await reconcilePromoterEarnings()
        return NextResponse.json({ ok: true, ...res })
      }
      default:
        return NextResponse.json({ error: 'اکشن نامعتبر' }, { status: 400 })
    }
  } catch (e: any) {
    const msg = [e?.message, e?.cause?.message, e?.code].filter(Boolean).join(' | ')
    if (action === 'activate') console.error('[promoter] activate failed', msg)
    return NextResponse.json({ error: errMsg(msg) }, { status: 400 })
  }
}
