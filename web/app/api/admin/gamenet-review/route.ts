import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGamenet, setGamenetStatus } from '@/lib/store'

const REJECT_PRESETS = ['اطلاعات ناقص', 'عکس نامعتبر یا غیرواقعی', 'آدرس یا تماس نامعتبر', 'تکراری یا جعلی']

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if ((session as any)?.role !== 'admin') return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })

  const { id, action, reason } = await req.json().catch(() => ({}))
  if (!id || !getGamenet(id)) return NextResponse.json({ error: 'گیم‌نت پیدا نشد' }, { status: 404 })
  if (action !== 'approve' && action !== 'reject') return NextResponse.json({ error: 'عمل نامعتبر' }, { status: 400 })
  if (action === 'reject' && !(reason ?? '').toString().trim()) {
    return NextResponse.json({ error: 'دلیل رد الزامیه' }, { status: 400 })
  }

  setGamenetStatus(id, action === 'approve' ? 'verified' : 'rejected', action === 'reject' ? String(reason).trim() : undefined)
  return NextResponse.json({ ok: true, presets: REJECT_PRESETS })
}
