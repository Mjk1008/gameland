import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCompetition, setCompetitionCover, removeCompetitionCover } from '@/lib/store'

const MAX_IMAGE_CHARS = 2_800_000

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const id = (b.id ?? '').toString()
  if (!id || !getCompetition(id)) return NextResponse.json({ error: 'رویداد پیدا نشد' }, { status: 404 })

  if (b.action === 'remove') {
    removeCompetitionCover(id)
    return NextResponse.json({ ok: true })
  }

  const imageData = (b.imageData ?? '').toString()
  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(imageData)) {
    return NextResponse.json({ error: 'عکس معتبر نیست' }, { status: 400 })
  }
  if (imageData.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: 'حجم عکس زیاده — سبک‌ترش کن' }, { status: 413 })
  }

  try {
    await setCompetitionCover(id, imageData)
    return NextResponse.json({ ok: true, cover: `/api/competition-cover/${id}` })
  } catch {
    return NextResponse.json({ error: 'ذخیره نشد' }, { status: 400 })
  }
}
