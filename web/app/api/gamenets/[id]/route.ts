import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGamenet, getUserById, updateGamenet } from '@/lib/store'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const g = getGamenet(params.id)
  if (!g) return NextResponse.json({ error: 'گیم‌نت پیدا نشد' }, { status: 404 })
  if (g.ownerId !== uid) return NextResponse.json({ error: 'فقط صاحب گیم‌نت می‌تونه ویرایش کنه' }, { status: 403 })

  const wasVerified = g.status === 'verified'
  const b = await req.json().catch(() => ({}))
  const phone = b.phone != null ? String(b.phone).replace(/\D/g, '') : undefined
  if (phone !== undefined && phone && !/^0\d{9,10}$/.test(phone)) {
    return NextResponse.json({ error: 'شمارهٔ تماس رو درست وارد کن' }, { status: 400 })
  }

  const consoles = Array.isArray(b.consoles)
    ? b.consoles.map((c: any) => ({ kind: (c?.kind ?? '').toString(), count: Math.max(0, Number(c?.count) || 0) })).filter((c: any) => c.kind && c.count > 0)
    : undefined

  const updated = updateGamenet(params.id, {
    ...(b.name != null ? { name: String(b.name).trim() } : {}),
    ...(b.province != null ? { province: String(b.province).trim() || undefined } : {}),
    ...(b.city != null ? { city: String(b.city).trim() } : {}),
    ...(b.address != null ? { address: String(b.address).trim() } : {}),
    ...(phone !== undefined ? { phone: phone || undefined } : {}),
    ...(b.instagramUrl != null ? { instagramUrl: String(b.instagramUrl).trim().slice(0, 200) || undefined } : {}),
    ...(b.mapUrl != null ? { mapUrl: String(b.mapUrl).trim().slice(0, 300) || undefined } : {}),
    ...(b.openHours != null ? { openHours: String(b.openHours).trim().slice(0, 240) || undefined } : {}),
    ...(consoles ? { consoles } : {}),
    ...(Array.isArray(b.disciplines) ? { disciplines: b.disciplines } : {}),
    ...(Array.isArray(b.games) ? { games: b.games } : {}),
    ...(Array.isArray(b.features) ? { features: b.features } : {}),
  })
  if (!updated) return NextResponse.json({ error: 'ذخیره نشد' }, { status: 500 })
  return NextResponse.json({ ok: true, gamenet: updated, reReview: wasVerified && updated.status === 'pending' })
}
