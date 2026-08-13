import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, whenReady } from '@/lib/store'
import { isPromoter, submitCodeRequest, requestsForPromoter } from '@/lib/promoter'

const ERR: Record<string, string> = {
  NOT_ACTIVE: 'پروموتر فعال نیست',
  CODE_LIMIT: 'به سقف کدهای فعال رسیدی',
  REQUEST_PENDING: 'یک درخواست در انتظار تأیید داری',
  CODE_LENGTH: 'کد باید ۳ تا ۲۴ کاراکتر باشد',
  CODE_EXISTS: 'این کد قبلاً ثبت شده',
}

export async function GET() {
  await whenReady()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'وارد شو' }, { status: 401 })
  if (!isPromoter(uid)) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const pending = requestsForPromoter(uid).find(r => r.status === 'pending') ?? null
  return NextResponse.json({
    pending: pending ? {
      id: pending.id,
      requestedCode: pending.requestedCode,
      note: pending.note,
      createdAt: pending.createdAt,
    } : null,
  })
}

export async function POST(req: Request) {
  await whenReady()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'وارد شو' }, { status: 401 })
  if (!isPromoter(uid)) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  try {
    const r = submitCodeRequest(uid, {
      code: body.code?.toString(),
      note: body.note?.toString(),
      compId: body.compId?.toString(),
    })
    return NextResponse.json({
      ok: true,
      request: {
        id: r.id,
        requestedCode: r.requestedCode,
        note: r.note,
        createdAt: r.createdAt,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: ERR[e.message] ?? 'درخواست ثبت نشد' }, { status: 400 })
  }
}
