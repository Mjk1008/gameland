import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createEvent, getUserById } from '@/lib/store'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  if (!b.title || !b.disc) return NextResponse.json({ error: 'عنوان و رشته الزامی' }, { status: 400 })

  const tier = ['S', 'A', 'B', 'C'].includes(b.tier) ? b.tier : 'A'
  const e = createEvent({
    title: b.title, season: b.season || 'فصل ۱', disc: b.disc, tier,
    prize: Number(b.prize) || 0, teams: Number(b.teams) || 32,
    maxPlayers: b.maxPlayers ? Number(b.maxPlayers) : undefined,
    status: b.status || 'open', statusLabel: b.statusLabel || 'ثبت‌نام باز',
    format: b.format || 'حذفی تک', date: b.date || '',
    organizerId: uid,
  })
  return NextResponse.json({ ok: true, event: e })
}
