import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { applyCoinTxn, getUserById, pushNotif } from '@/lib/store'

// Topup endpoint. Real impl wires Shaparak (or ZarinPal/IDPay) gateway.
// For now: any logged-in user can request a topup of 100/500/1000/5000 coins
// instantly (dev stub). Production should redirect to a payment gateway,
// verify the callback, then call applyCoinTxn server-side.

const ALLOWED = new Set([100, 500, 1000, 5000])

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const amount = Number(body.amount)
  if (!ALLOWED.has(amount)) return NextResponse.json({ error: 'مقدار نامعتبر' }, { status: 400 })

  try {
    const t = applyCoinTxn(uid, amount, 'topup')
    pushNotif(uid, 'announcement', `${amount} سکه شارژ شد`, `موجودی کیف پول به‌روزرسانی شد. شناسه تراکنش: ${t.id}`)
    return NextResponse.json({ ok: true, txn: t })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
