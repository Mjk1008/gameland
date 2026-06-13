import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createGamenet, getUserById } from '@/lib/store'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  if (!b.name || !b.city || !b.address) return NextResponse.json({ error: 'نام، شهر و آدرس الزامی' }, { status: 400 })

  const g = createGamenet({
    ownerId: uid, name: b.name, city: b.city, address: b.address,
    phone: b.phone || undefined,
    stations: Number(b.stations) || 0,
    disciplines: Array.isArray(b.disciplines) ? b.disciplines : [],
  })
  return NextResponse.json({ ok: true, gamenet: g })
}
