import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPromo, deletePromo, updatePromo, reorderPromo, getEvent } from '@/lib/store'

function isAdmin(session: any) {
  return session?.role === 'admin' || session?.role === 'organizer'
}

const MAX_IMAGE_CHARS = 3_500_000   // ~2.6MB decoded — keep the row + payload sane

// Create a slide.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  const b = await req.json().catch(() => ({}))

  const imageData: string = (b.imageData ?? '').toString()
  if (!imageData) return NextResponse.json({ error: 'عکس الزامیه' }, { status: 400 })
  if (imageData.length > MAX_IMAGE_CHARS) return NextResponse.json({ error: 'حجم عکس زیاده — یه عکس سبک‌تر انتخاب کن' }, { status: 413 })

  const linkType = b.linkType === 'event' || b.linkType === 'url' ? b.linkType : 'none'
  let eventId: string | undefined
  let url: string | undefined
  if (linkType === 'event') {
    if (!b.eventId || !getEvent(b.eventId)) return NextResponse.json({ error: 'مسابقهٔ انتخابی معتبر نیست' }, { status: 400 })
    eventId = b.eventId
  } else if (linkType === 'url') {
    const u = (b.url ?? '').toString().trim()
    if (!/^(https?:\/\/|\/)/.test(u)) return NextResponse.json({ error: 'لینک باید با http(s):// یا / شروع شه' }, { status: 400 })
    url = u
  }

  const promo = createPromo({ imageData, linkType, eventId, url, active: b.active !== false })
  return NextResponse.json({ ok: true, promo })
}

// Delete / reorder / toggle a slide.
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'id الزامیه' }, { status: 400 })
  try {
    if (b.action === 'reorder' && (b.dir === 'up' || b.dir === 'down')) reorderPromo(b.id, b.dir)
    else if (b.action === 'toggle') updatePromo(b.id, { active: !!b.active })
    else if (b.action === 'edit') {
      const patch: any = {}
      // link target
      if (b.linkType === 'event' || b.linkType === 'url' || b.linkType === 'none') {
        patch.linkType = b.linkType
        if (b.linkType === 'event') {
          if (!b.eventId || !getEvent(b.eventId)) return NextResponse.json({ error: 'مسابقهٔ انتخابی معتبر نیست' }, { status: 400 })
          patch.eventId = b.eventId; patch.url = undefined
        } else if (b.linkType === 'url') {
          const u = (b.url ?? '').toString().trim()
          if (!/^(https?:\/\/|\/)/.test(u)) return NextResponse.json({ error: 'لینک باید با http(s):// یا / شروع شه' }, { status: 400 })
          patch.url = u; patch.eventId = undefined
        } else { patch.eventId = undefined; patch.url = undefined }
      }
      // optional image replacement
      if (typeof b.imageData === 'string' && b.imageData) {
        if (b.imageData.length > MAX_IMAGE_CHARS) return NextResponse.json({ error: 'حجم عکس زیاده' }, { status: 413 })
        patch.imageData = b.imageData
      }
      updatePromo(b.id, patch)
    }
    else return NextResponse.json({ error: 'action نامعتبر' }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id الزامیه' }, { status: 400 })
  deletePromo(id)
  return NextResponse.json({ ok: true })
}
