import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createGamenet, getUserById, markGamenetPhoto } from '@/lib/store'
import { persist } from '@/lib/db/persistence'

const MAX_PHOTO_CHARS = 2_000_000 // ~1.5MB decoded, client already compresses to a light JPEG

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  if (!b.attest) return NextResponse.json({ error: 'باید تایید کنی صاحب یا نمایندهٔ این مکانی' }, { status: 400 })
  if (!b.name || !b.province || !b.city || !b.address) return NextResponse.json({ error: 'نام، استان، شهر و آدرس الزامی' }, { status: 400 })
  const phone = (b.phone ?? '').toString().replace(/\D/g, '')
  if (!/^0\d{9,10}$/.test(phone)) return NextResponse.json({ error: 'شمارهٔ تماسِ کسب‌وکار رو درست وارد کن' }, { status: 400 })
  const photoData: string = (b.photoData ?? '').toString()
  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(photoData)) return NextResponse.json({ error: 'عکسِ محل الزامیه' }, { status: 400 })
  if (photoData.length > MAX_PHOTO_CHARS) return NextResponse.json({ error: 'حجم عکس زیاده — یه عکس سبک‌تر انتخاب کن' }, { status: 413 })
  const instagramUrl = (b.instagramUrl ?? '').toString().trim().slice(0, 200) || undefined
  const consoles = Array.isArray(b.consoles)
    ? b.consoles.map((c: any) => ({ kind: (c?.kind ?? '').toString(), count: Math.max(0, Number(c?.count) || 0) })).filter((c: any) => c.kind && c.count > 0)
    : []

  const g = createGamenet({
    ownerId: uid, name: b.name, province: b.province, city: b.city, address: b.address, phone, instagramUrl,
    consoles,
    disciplines: Array.isArray(b.disciplines) ? b.disciplines : [],
    games: Array.isArray(b.games) ? b.games : [],
    features: Array.isArray(b.features) ? b.features : [],
  })
  await persist.gamenetPhoto.upsertAsync(g.id, photoData)
  markGamenetPhoto(g.id)
  return NextResponse.json({ ok: true, gamenet: g })
}
