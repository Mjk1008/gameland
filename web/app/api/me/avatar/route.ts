import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { whenReady, markAvatar, unmarkAvatar } from '@/lib/store'
import { persist } from '@/lib/db/persistence'

const MAX_CHARS = 2_000_000   // ~1.5MB decoded — profile photos are small

// Upload / replace own profile photo (client compresses to a small JPEG first).
export async function POST(req: Request) {
  await whenReady()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  const imageData: string = (b.imageData ?? '').toString()
  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(imageData)) return NextResponse.json({ error: 'عکس معتبر نیست' }, { status: 400 })
  if (imageData.length > MAX_CHARS) return NextResponse.json({ error: 'حجم عکس زیاده — یه عکس سبک‌تر انتخاب کن' }, { status: 413 })

  await persist.avatar.upsertAsync(uid, imageData)
  markAvatar(uid)
  return NextResponse.json({ ok: true })
}

// Remove own profile photo.
export async function DELETE() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  persist.avatar.delete(uid)
  unmarkAvatar(uid)
  return NextResponse.json({ ok: true })
}
