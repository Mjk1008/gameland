import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, whenReady } from '@/lib/store'
import {
  allPromoterCodes, updatePromoterCode, getPromoterCode,
  pendingEarningsTotal, allPromoterEarnings, activatePromoter, deactivatePromoter,
  updatePromoterTerms, listActivePromoters, primaryCodeForPromoter,
} from '@/lib/promoter'

async function adminOnly() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return null
  if (role !== 'admin' && role !== 'organizer') return null
  return uid
}

export async function GET() {
  await whenReady()
  if (!await adminOnly()) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const partners = listActivePromoters().map(u => {
    const code = primaryCodeForPromoter(u.id)
    return {
      userId: u.id,
      name: u.name,
      tag: u.tag,
      phone: u.phone ?? '',
      discountPercent: u.promoterDiscountPercent ?? code?.discountPercent ?? 0,
      commissionPercent: u.promoterCommissionPercent ?? code?.commissionPercent ?? 0,
      code: code?.code ?? '',
      codeId: code?.id,
      useCount: code?.useCount ?? 0,
      active: !!u.promoterActive,
      note: code?.note,
      pendingCommission: allPromoterEarnings()
        .filter(e => e.promoterUserId === u.id && e.status === 'pending')
        .reduce((s, e) => s + e.commissionAmount, 0),
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

  return NextResponse.json({ partners, earnings, pendingTotal: pendingEarningsTotal() })
}

export async function POST(req: Request) {
  await whenReady()
  if (!await adminOnly()) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

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
      const msg = e.message === 'DISCOUNT_RANGE' ? 'تخفیف باید ۱ تا ۹۰٪ باشد'
        : e.message === 'COMMISSION_RANGE' ? 'کمیسیون باید ۰ تا ۵۰٪ باشد'
        : 'به‌روزرسانی نشد'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  }

  try {
    const userId = (body.promoterUserId ?? body.userId ?? '').toString()
    if (!userId) return NextResponse.json({ error: 'کاربر را انتخاب کن' }, { status: 400 })
    const code = activatePromoter(
      userId,
      Number(body.discountPercent),
      Number(body.commissionPercent),
      body.note,
    )
    return NextResponse.json({ ok: true, code })
  } catch (e: any) {
    const msg = e.message === 'CODE_EXISTS' ? 'کد تکراری — تگ این کاربر قبلاً استفاده شده'
      : e.message === 'USER_NOT_FOUND' ? 'کاربر پیدا نشد'
      : e.message === 'DISCOUNT_RANGE' ? 'تخفیف باید ۱ تا ۹۰٪ باشد'
      : e.message === 'COMMISSION_RANGE' ? 'کمیسیون باید ۰ تا ۵۰٪ باشد'
      : 'فعال‌سازی نشد'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
