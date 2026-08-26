import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, whenReady } from '@/lib/store'
import {
  allPromoterCodes, updatePromoterCode, getPromoterCode,
  pendingEarningsTotal, allPromoterEarnings, activatePromoter,
  deactivatePromoter, deactivatePromoterCode, reactivatePromoterCode,
  updatePromoterTerms, listActivePromoters, pendingCodeRequests,
  adminIssueCode, rejectCodeRequest, statsForCode,
} from '@/lib/promoter'

async function adminOnly() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return null
  if (role !== 'admin' && role !== 'organizer') return null
  return uid
}

function errMsg(code: string) {
  const raw = (code ?? '').toString()
  if (raw === 'CODE_EXISTS' || /unique|duplicate/i.test(raw)) return 'کد تکراری است — تگ این کاربر با کد موجود یکی است'
  if (raw === 'USER_NOT_FOUND') return 'کاربر پیدا نشد'
  if (raw === 'NOT_GAMER') return 'پروموتر فقط برای حساب گیمر است؛ ادمین/برگزارکننده را نمی‌شود فعال کرد'
  if (raw === 'NOT_ACTIVE') return 'پروموتر فعال نیست'
  if (raw === 'NOT_FOUND') return 'درخواست پیدا نشد'
  if (raw === 'ALREADY_REVIEWED') return 'این درخواست قبلاً بررسی شده'
  if (raw === 'CODE_LIMIT') return 'سقف کد فعال برای این پروموتر پر است'
  if (raw === 'DISCOUNT_RANGE') return 'تخفیف باید ۱ تا ۹۰٪ باشد'
  if (raw === 'COMMISSION_RANGE') return 'کمیسیون باید ۰ تا ۵۰٪ باشد'
  if (raw === 'CODE_LENGTH') return 'کد باید ۳ تا ۲۴ کاراکتر باشد'
  if (/does not exist|undefined column/i.test(raw)) return 'جدول کد پروموتر روی دیتابیس ناقص است — یک بار ری‌استارت یا دیپلوی لازم است'
  if (/23503|foreign key/i.test(raw)) return 'حساب این کاربر در دیتابیس کامل نیست'
  if (/PROMO_INSERT_FAILED|failed query/i.test(raw)) return 'ذخیره کد در دیتابیس نشد — دوباره بزن یا کد دستی بده'
  if (raw.length > 8 && /violates|constraint|column|relation/i.test(raw)) return `خطای دیتابیس: ${raw.slice(0, 160)}`
  return raw.length > 12 ? raw.slice(0, 160) : 'فعال‌سازی انجام نشد'
}

export async function GET() {
  await whenReady()
  const adminId = await adminOnly()
  if (!adminId) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const partners = listActivePromoters().map(u => {
    const allCodes = allPromoterCodes()
      .filter(c => c.promoterUserId === u.id)
      .sort((a, b) => Number(b.active) - Number(a.active) || b.createdAt - a.createdAt)
      .map(c => ({
        id: c.id,
        code: c.code,
        active: c.active,
        discountPercent: c.discountPercent,
        commissionPercent: c.commissionPercent,
        note: c.note,
        ...statsForCode(c.id),
      }))
    return {
      userId: u.id,
      name: u.name,
      tag: u.tag,
      phone: u.phone ?? '',
      discountPercent: u.promoterDiscountPercent ?? 0,
      commissionPercent: u.promoterCommissionPercent ?? 0,
      codes: allCodes.filter(c => c.active),
      inactiveCodes: allCodes.filter(c => !c.active),
      active: !!u.promoterActive,
      pendingCommission: allPromoterEarnings()
        .filter(e => e.promoterUserId === u.id && e.status === 'pending')
        .reduce((s, e) => s + e.commissionAmount, 0),
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

  return NextResponse.json({ partners, requests, earnings, pendingTotal: pendingEarningsTotal() })
}

export async function POST(req: Request) {
  await whenReady()
  const adminId = await adminOnly()
  if (!adminId) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const action = (body.action ?? 'activate').toString()

  if (action === 'deactivate') {
    const userId = (body.userId ?? '').toString()
    if (!userId) return NextResponse.json({ error: 'کاربر نامعتبر' }, { status: 400 })
    try {
      await deactivatePromoter(userId)
      return NextResponse.json({ ok: true })
    } catch { return NextResponse.json({ error: 'غیرفعال نشد' }, { status: 400 }) }
  }

  if (action === 'update') {
    const userId = (body.userId ?? body.id ?? '').toString()
    if (!userId) return NextResponse.json({ error: 'کاربر نامعتبر' }, { status: 400 })
    try {
      if (body.discountPercent != null || body.commissionPercent != null) {
        const u = getUserById(userId)
        await updatePromoterTerms(
          userId,
          body.discountPercent != null ? Number(body.discountPercent) : (u?.promoterDiscountPercent ?? 20),
          body.commissionPercent != null ? Number(body.commissionPercent) : (u?.promoterCommissionPercent ?? 10),
        )
      }
      if (body.note !== undefined && body.codeId) {
        await updatePromoterCode(body.codeId.toString(), { note: body.note })
      }
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      return NextResponse.json({ error: errMsg(e.message) }, { status: 400 })
    }
  }

  if (action === 'approveRequest') {
    const requestId = (body.requestId ?? '').toString()
    if (!requestId) return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 400 })
    try {
      const req = pendingCodeRequests().find(r => r.id === requestId)
      if (!req) return NextResponse.json({ error: 'درخواست پیدا نشد' }, { status: 404 })
      const code = await adminIssueCode(req.promoterUserId, adminId, {
        requestId,
        code: body.code?.toString(),
        note: body.note?.toString(),
      })
      return NextResponse.json({ ok: true, code: { id: code.id, code: code.code } })
    } catch (e: any) {
      return NextResponse.json({ error: errMsg(e.message) }, { status: 400 })
    }
  }

  if (action === 'rejectRequest') {
    const requestId = (body.requestId ?? '').toString()
    if (!requestId) return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 400 })
    try {
      await rejectCodeRequest(requestId, adminId, body.reason?.toString())
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      return NextResponse.json({ error: errMsg(e.message) }, { status: 400 })
    }
  }

  if (action === 'deactivateCode') {
    const codeId = (body.codeId ?? '').toString()
    if (!codeId) return NextResponse.json({ error: 'کد نامعتبر' }, { status: 400 })
    try {
      await deactivatePromoterCode(codeId)
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      return NextResponse.json({ error: errMsg(e.message) }, { status: 400 })
    }
  }

  if (action === 'reactivateCode') {
    const codeId = (body.codeId ?? '').toString()
    if (!codeId) return NextResponse.json({ error: 'کد نامعتبر' }, { status: 400 })
    try {
      await reactivatePromoterCode(codeId)
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      return NextResponse.json({ error: errMsg(e.message) }, { status: 400 })
    }
  }

  if (action === 'createCode') {
    const userId = (body.promoterUserId ?? body.userId ?? '').toString()
    if (!userId) return NextResponse.json({ error: 'کاربر را انتخاب کن' }, { status: 400 })
    try {
      const code = await adminIssueCode(userId, adminId, {
        code: body.code?.toString(),
        note: body.note?.toString(),
        compId: body.compId?.toString(),
      })
      return NextResponse.json({ ok: true, code: { id: code.id, code: code.code } })
    } catch (e: any) {
      return NextResponse.json({ error: errMsg(e.message) }, { status: 400 })
    }
  }

  try {
    const userId = (body.promoterUserId ?? body.userId ?? '').toString()
    if (!userId) return NextResponse.json({ error: 'کاربر را انتخاب کن' }, { status: 400 })
    await activatePromoter(userId, body.discountPercent, body.commissionPercent)
    const hasCode = allPromoterCodes().some(c => c.promoterUserId === userId && c.active)
    let code = null
    if (!hasCode) {
      try {
        const c = await adminIssueCode(userId, adminId, {})
        code = { id: c.id, code: c.code }
      } catch (e) {
        // Don't leave a "promoter" with no durable code — reverse activation.
        await deactivatePromoter(userId)
        throw e
      }
    }
    return NextResponse.json({ ok: true, code })
  } catch (e: any) {
    const msg = [e?.message, e?.cause?.message, e?.code].filter(Boolean).join(' | ')
    console.error('[promoter] activate failed', msg)
    return NextResponse.json({ error: errMsg(msg) }, { status: 400 })
  }
}
