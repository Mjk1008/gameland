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
  if (code === 'CODE_EXISTS') return 'کد تکراری است'
  if (code === 'USER_NOT_FOUND') return 'کاربر پیدا نشد'
  if (code === 'NOT_ACTIVE') return 'پروموتر فعال نیست'
  if (code === 'NOT_FOUND') return 'درخواست پیدا نشد'
  if (code === 'ALREADY_REVIEWED') return 'این درخواست قبلاً بررسی شده'
  if (code === 'CODE_LIMIT') return 'سقف کد فعال برای این پروموتر پر است'
  if (code === 'DISCOUNT_RANGE') return 'تخفیف باید ۱ تا ۹۰٪ باشد'
  if (code === 'COMMISSION_RANGE') return 'کمیسیون باید ۰ تا ۵۰٪ باشد'
  if (code === 'CODE_LENGTH') return 'کد باید ۳ تا ۲۴ کاراکتر باشد'
  return 'عملیات انجام نشد'
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
      deactivatePromoter(userId)
      return NextResponse.json({ ok: true })
    } catch { return NextResponse.json({ error: 'غیرفعال نشد' }, { status: 400 }) }
  }

  if (action === 'update') {
    const userId = (body.userId ?? body.id ?? '').toString()
    if (!userId) return NextResponse.json({ error: 'کاربر نامعتبر' }, { status: 400 })
    try {
      if (body.discountPercent != null || body.commissionPercent != null) {
        const u = getUserById(userId)
        updatePromoterTerms(
          userId,
          body.discountPercent != null ? Number(body.discountPercent) : (u?.promoterDiscountPercent ?? 20),
          body.commissionPercent != null ? Number(body.commissionPercent) : (u?.promoterCommissionPercent ?? 10),
        )
      }
      if (body.note !== undefined && body.codeId) {
        updatePromoterCode(body.codeId.toString(), { note: body.note })
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
      const code = adminIssueCode(req.promoterUserId, adminId, {
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
      rejectCodeRequest(requestId, adminId, body.reason?.toString())
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      return NextResponse.json({ error: errMsg(e.message) }, { status: 400 })
    }
  }

  if (action === 'deactivateCode') {
    const codeId = (body.codeId ?? '').toString()
    if (!codeId) return NextResponse.json({ error: 'کد نامعتبر' }, { status: 400 })
    try {
      deactivatePromoterCode(codeId)
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      return NextResponse.json({ error: errMsg(e.message) }, { status: 400 })
    }
  }

  if (action === 'reactivateCode') {
    const codeId = (body.codeId ?? '').toString()
    if (!codeId) return NextResponse.json({ error: 'کد نامعتبر' }, { status: 400 })
    try {
      reactivatePromoterCode(codeId)
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      return NextResponse.json({ error: errMsg(e.message) }, { status: 400 })
    }
  }

  if (action === 'createCode') {
    const userId = (body.promoterUserId ?? body.userId ?? '').toString()
    if (!userId) return NextResponse.json({ error: 'کاربر را انتخاب کن' }, { status: 400 })
    try {
      const code = adminIssueCode(userId, adminId, {
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
    activatePromoter(userId, Number(body.discountPercent), Number(body.commissionPercent))
    const hasCode = allPromoterCodes().some(c => c.promoterUserId === userId && c.active)
    let code = null
    if (!hasCode) {
      const c = adminIssueCode(userId, adminId, {})
      code = { id: c.id, code: c.code }
    }
    return NextResponse.json({ ok: true, code })
  } catch (e: any) {
    return NextResponse.json({ error: errMsg(e.message) }, { status: 400 })
  }
}
