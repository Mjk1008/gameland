import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createGamenet, getUserById, addGamenetPhotoId, GAMENET_PHOTO_MAX } from '@/lib/store'
import { persist } from '@/lib/db/persistence'
import { isValidPhotoDataUrl } from '@/lib/gamenet-photos'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  if (!b.attest) return NextResponse.json({ error: 'باید تایید کنی صاحب یا نمایندهٔ این مکانی' }, { status: 400 })
  if (!b.name || !b.province || !b.city || !b.address) return NextResponse.json({ error: 'نام، استان، شهر و آدرس الزامی' }, { status: 400 })
  const phone = (b.phone ?? '').toString().replace(/\D/g, '')
  if (!/^0\d{9,10}$/.test(phone)) return NextResponse.json({ error: 'شمارهٔ تماسِ کسب‌وکار رو درست وارد کن' }, { status: 400 })

  const rawPhotos: string[] = Array.isArray(b.photos)
    ? b.photos.map((p: unknown) => String(p ?? ''))
    : b.photoData ? [String(b.photoData)] : []
  if (rawPhotos.length === 0) return NextResponse.json({ error: 'حداقل یک عکسِ محل الزامیه' }, { status: 400 })
  if (rawPhotos.length > GAMENET_PHOTO_MAX) return NextResponse.json({ error: `حداکثر ${GAMENET_PHOTO_MAX} عکس می‌تونی بفرستی` }, { status: 400 })
  for (const p of rawPhotos) {
    if (!isValidPhotoDataUrl(p)) return NextResponse.json({ error: 'یکی از عکس‌ها نامعتبره — دوباره انتخاب کن' }, { status: 400 })
  }

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
  for (let i = 0; i < rawPhotos.length; i++) {
    const photoId = await persist.gamenetPhoto.insertAsync(g.id, rawPhotos[i], i)
    if (photoId) addGamenetPhotoId(g.id, photoId)
  }
  return NextResponse.json({ ok: true, gamenet: g })
}
