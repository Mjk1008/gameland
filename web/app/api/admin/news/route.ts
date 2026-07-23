import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { allNews, createNews, updateNews, deleteNews } from '@/lib/store'

const MAX_IMG = 3_000_000   // ~2.2MB decoded — covers are compressed client-side

function guard(session: any) {
  const role = session?.role
  return role === 'admin' || role === 'organizer'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!guard(session as any)) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  return NextResponse.json({ news: allNews() })
}

// create / edit / delete news items (admin news manager)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!guard(session as any)) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const action = (b.action ?? 'create').toString()

  try {
    if (action === 'delete') {
      deleteNews((b.id ?? '').toString())
      return NextResponse.json({ ok: true })
    }

    const title = (b.title ?? '').toString().trim().slice(0, 120)
    const body = (b.body ?? '').toString().trim().slice(0, 4000)
    const tags = Array.isArray(b.tags) ? b.tags.map((t: any) => t.toString().trim()).filter(Boolean).slice(0, 6)
      : (b.tags ?? '').toString().split(/[،,]/).map((t: string) => t.trim()).filter(Boolean).slice(0, 6)
    const imageData = (b.imageData ?? '').toString()

    if (action === 'edit') {
      const patch: any = {}
      if (title) patch.title = title
      if (b.body !== undefined) patch.body = body
      if (b.tags !== undefined) patch.tags = tags
      if (b.active !== undefined) patch.active = !!b.active
      if (b.sort !== undefined) patch.sort = Number(b.sort) || 0
      if (imageData) {
        if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(imageData)) return NextResponse.json({ error: 'عکس معتبر نیست' }, { status: 400 })
        if (imageData.length > MAX_IMG) return NextResponse.json({ error: 'حجم عکس زیاده' }, { status: 413 })
        patch.imageData = imageData
      }
      return NextResponse.json({ ok: true, news: updateNews((b.id ?? '').toString(), patch) })
    }

    // create
    if (!title) return NextResponse.json({ error: 'تیتر خبر رو بنویس' }, { status: 400 })
    if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(imageData)) return NextResponse.json({ error: 'کاور خبر رو آپلود کن' }, { status: 400 })
    if (imageData.length > MAX_IMG) return NextResponse.json({ error: 'حجم عکس زیاده — سبک‌ترش کن' }, { status: 413 })
    const n = createNews({ imageData, title, body, tags })
    return NextResponse.json({ ok: true, news: n })
  } catch (e: any) {
    return NextResponse.json({ error: e.message === 'NEWS_NOT_FOUND' ? 'خبر پیدا نشد' : 'انجام نشد' }, { status: 400 })
  }
}
