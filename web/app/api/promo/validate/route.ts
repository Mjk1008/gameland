import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, whenReady } from '@/lib/store'
import { validatePromoCode, promoErrorMessage, buyerTicketPricing } from '@/lib/promoter'

export async function POST(req: Request) {
  await whenReady()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const { code, compId } = await req.json().catch(() => ({}))
  if (!code || !compId) return NextResponse.json({ error: 'کد یا مسابقه نامعتبر' }, { status: 400 })

  try {
    const promo = validatePromoCode(String(code), uid, String(compId))
    const pricing = buyerTicketPricing(String(compId), promo.discountPercent)
    return NextResponse.json({
      ok: true,
      code: promo.code,
      discountPercent: pricing.totalOffPercent,
      promoDiscountPercent: promo.discountPercent,
      commissionPercent: promo.commissionPercent,
      unitPrice: pricing.unitPrice,
      original: pricing.original,
    })
  } catch (e: any) {
    return NextResponse.json({ error: promoErrorMessage(e.message) }, { status: 400 })
  }
}
