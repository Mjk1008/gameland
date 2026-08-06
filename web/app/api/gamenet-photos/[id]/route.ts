import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, getGamenet, removeGamenetPhotoId, gamenetPhotoCount } from '@/lib/store'
import { persist } from '@/lib/db/persistence'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const photoId = params.id
  const gamenetId = await persist.gamenetPhoto.gamenetIdOf(photoId)
  if (!gamenetId) return NextResponse.json({ error: 'عکس پیدا نشد' }, { status: 404 })

  const g = getGamenet(gamenetId)
  if (!g) return NextResponse.json({ error: 'گیم‌نت پیدا نشد' }, { status: 404 })
  if (g.ownerId !== uid) return NextResponse.json({ error: 'فقط صاحب گیم‌نت می‌تونه عکس حذف کنه' }, { status: 403 })
  if (gamenetPhotoCount(gamenetId) <= 1) return NextResponse.json({ error: 'حداقل یک عکس باید بمونه' }, { status: 400 })

  await persist.gamenetPhoto.deleteAsync(photoId)
  removeGamenetPhotoId(gamenetId, photoId)
  return NextResponse.json({ ok: true })
}
