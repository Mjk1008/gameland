import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRegistration, getUserById, pushNotif, getEvent, whenReady, saveUploadedReceipt } from '@/lib/store'
import { trackServer, trackUserProps } from '@/lib/track-server'
import { parseReceiptImage } from '@/lib/receipt-image'

// Gamer uploads their payment receipt (فیش) for a competition they registered in.
// Each upload is kept — a resent or top-up فیش does not erase the previous one.
export async function POST(req: Request) {
  await whenReady()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  const compId = (b.compId ?? '').toString()
  const parsed = parseReceiptImage((b.imageData ?? '').toString())
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })

  const reg = getRegistration(uid, compId)
  if (!reg) return NextResponse.json({ error: 'اول در این مسابقه ثبت‌نام کن' }, { status: 404 })

  const u = getUserById(uid)!
  const c = getEvent(compId)

  await saveUploadedReceipt(reg.id, parsed.data)
  trackServer({
    userId: uid,
    name: 'receipt_submit',
    path: `/competitions/${compId}/pay`,
    props: trackUserProps(u, { compId, disc: c?.disc }),
  })
  // let admin know a receipt arrived (in-app; SMS if enabled)
  pushNotif(uid, 'registration', 'فیش دریافت شد', `فیشِ پرداختِ «${getEvent(compId)?.title ?? 'مسابقه'}» رسید و در انتظار تأیید ادمینه.`)
  return NextResponse.json({ ok: true })
}
