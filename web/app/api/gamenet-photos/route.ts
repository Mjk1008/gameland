import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, getGamenet, addGamenetPhotoId, gamenetPhotoCount, GAMENET_PHOTO_MAX } from '@/lib/store'
import { persist } from '@/lib/db/persistence'
import { isValidPhotoDataUrl } from '@/lib/gamenet-photos'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  const gamenetId = (b.gamenetId ?? '').toString()
  const photoData = (b.photoData ?? '').toString()
  const g = getGamenet(gamenetId)
  if (!g) return NextResponse.json({ error: 'گیم‌نت پیدا نشد' }, { status: 404 })
  if (g.ownerId !== uid) return NextResponse.json({ error: 'فقط صاحب گیم‌نت می‌تونه عکس اضافه کنه' }, { status: 403 })
  if (!isValidPhotoDataUrl(photoData)) return NextResponse.json({ error: 'عکس نامعتبره — دوباره انتخاب کن' }, { status: 400 })

  const count = gamenetPhotoCount(gamenetId)
  if (count >= GAMENET_PHOTO_MAX) return NextResponse.json({ error: `حداکثر ${GAMENET_PHOTO_MAX} عکس — اول یکی رو حذف کن` }, { status: 400 })

  const photoId = await persist.gamenetPhoto.insertAsync(gamenetId, photoData, count)
  if (!photoId) return NextResponse.json({ error: 'ذخیره نشد، دوباره امتحان کن' }, { status: 500 })
  addGamenetPhotoId(gamenetId, photoId)
  return NextResponse.json({ ok: true, photoId })
}
