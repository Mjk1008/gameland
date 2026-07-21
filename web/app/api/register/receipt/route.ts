import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRegistration, getUserById, markReceipt, pushNotif, getEvent, whenReady } from '@/lib/store'
import { persist } from '@/lib/db/persistence'

const MAX_CHARS = 3_000_000   // ~2.2MB decoded — a receipt photo

// Gamer uploads their payment receipt (فیش) for a competition they registered in.
export async function POST(req: Request) {
  await whenReady()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  const compId = (b.compId ?? '').toString()
  const imageData: string = (b.imageData ?? '').toString()
  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(imageData)) return NextResponse.json({ error: 'عکس معتبر نیست' }, { status: 400 })
  if (imageData.length > MAX_CHARS) return NextResponse.json({ error: 'حجم عکس زیاده — یه عکس سبک‌تر بفرست' }, { status: 413 })

  const reg = getRegistration(uid, compId)
  if (!reg) return NextResponse.json({ error: 'اول در این مسابقه ثبت‌نام کن' }, { status: 404 })

  await persist.receipt.upsertAsync(reg.id, imageData)
  markReceipt(reg.id)
  // let admin know a receipt arrived (in-app; SMS if enabled)
  pushNotif(uid, 'registration', 'فیش دریافت شد', `فیشِ پرداختِ «${getEvent(compId)?.title ?? 'مسابقه'}» رسید و در انتظار تأیید ادمینه.`)
  return NextResponse.json({ ok: true })
}
