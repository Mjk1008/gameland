import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createEvent, updateEvent, getUserById, getEvent } from '@/lib/store'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  if (!b.title || !b.disc) return NextResponse.json({ error: 'عنوان و رشته الزامی' }, { status: 400 })

  const tier = ['S', 'A', 'B', 'C'].includes(b.tier) ? b.tier : 'A'
  // Final bracket size per discipline: FIFA/EA FC = 128, everything else = 32.
  const finalSize = b.finalSize != null && b.finalSize !== '' ? Number(b.finalSize) : (b.disc === 'fc26' ? 128 : 32)
  const e = createEvent({
    title: b.title, season: b.season || 'فصل ۱', disc: b.disc, tier,
    prize: Number(b.prize) || 0, teams: Number(b.teams) || 32,
    maxPlayers: b.maxPlayers ? Number(b.maxPlayers) : undefined,
    status: b.status || 'open', statusLabel: b.statusLabel || 'ثبت‌نام باز',
    format: b.format || 'حذفی تک', date: b.date || '',
    organizerId: uid,
    competitionId: b.competitionId ? String(b.competitionId) : undefined,
    finalSize,
  })
  return NextResponse.json({ ok: true, event: e })
}

// Edit an existing competition (admin/organizer). Accepts any editable field.
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const id = (b.id ?? '').toString()
  if (!id || !getEvent(id)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })

  const patch: any = {}
  if (b.title != null) patch.title = String(b.title)
  if (b.season != null) patch.season = String(b.season)
  if (b.disc != null) patch.disc = b.disc
  if (['S', 'A', 'B', 'C'].includes(b.tier)) patch.tier = b.tier
  if (b.prize != null) patch.prize = Number(b.prize) || 0
  if (b.teams != null) patch.teams = Number(b.teams) || 0
  if (b.maxPlayers != null && b.maxPlayers !== '') patch.maxPlayers = Number(b.maxPlayers)
  if (b.format != null) patch.format = String(b.format)
  if (b.date != null) patch.date = String(b.date)
  if (['open', 'soon', 'live', 'done'].includes(b.status)) patch.status = b.status
  if (b.statusLabel != null) patch.statusLabel = String(b.statusLabel)

  try {
    const e = updateEvent(id, patch)
    return NextResponse.json({ ok: true, event: e })
  } catch (err: any) {
    return NextResponse.json({ error: 'ذخیره نشد' }, { status: 400 })
  }
}
