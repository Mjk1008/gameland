import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, whenReady } from '@/lib/store'
import { validatePromoCode, promoErrorMessage } from '@/lib/promoter'
import { ticketPriceFor } from '@/lib/ticket-price'

export async function POST(req: Request) {
  await whenReady()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const { code, compId } = await req.json().catch(() => ({}))
  if (!code || !compId) return NextResponse.json({ error: 'کد یا مسابقه نامعتبر' }, { status: 400 })

  try {
    const promo = validatePromoCode(String(code), uid, String(compId))
    const base = ticketPriceFor(String(compId)).price
    const unitPrice = Math.round(base * (1 - promo.discountPercent / 100))
    return NextResponse.json({
      ok: true,
      code: promo.code,
      discountPercent: promo.discountPercent,
      commissionPercent: promo.commissionPercent,
      unitPrice,
    })
  } catch (e: any) {
    return NextResponse.json({ error: promoErrorMessage(e.message) }, { status: 400 })
  }
}
