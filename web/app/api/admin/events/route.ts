import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createEvent, updateEvent, getUserById, getEvent, setEventConfig, registrationsForComp, isDisciplineSlotTaken, matchesForComp } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import { defaultBracketMode } from '@/lib/discipline-format'

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
  const teamSize = Number(b.teamSize) === 2 ? 2 : undefined
  const ticketPrice = b.ticketPrice != null && b.ticketPrice !== '' ? Number(b.ticketPrice) : undefined
  const ticketOriginal = b.ticketOriginal != null && b.ticketOriginal !== '' ? Number(b.ticketOriginal) : undefined

  const competitionId = b.competitionId ? String(b.competitionId) : undefined
  if (competitionId && isDisciplineSlotTaken(competitionId, b.disc, teamSize)) {
    const game = DISC[b.disc as keyof typeof DISC]?.name ?? b.disc
    const fmt = teamSize === 2 ? '۲به۲' : '۱به۱'
    return NextResponse.json({ error: `این رشته (${game} · ${fmt}) قبلاً به این رویداد اضافه شده` }, { status: 409 })
  }

  const e = createEvent({
    title: b.title, season: b.season || 'فصل ۱', disc: b.disc, tier,
    prize: Number(b.prize) || 0, teams: Number(b.teams) || 32,
    maxPlayers: b.maxPlayers ? Number(b.maxPlayers) : undefined,
    status: b.status || 'open', statusLabel: b.statusLabel || 'ثبت‌نام باز',
    format: b.format || 'حذفی تک', date: b.date || '',
    organizerId: uid,
    competitionId,
    finalSize,
  })
  const bracketMode = b.bracketMode === 'prelims' || b.bracketMode === 'direct'
    ? b.bracketMode
    : defaultBracketMode(b.disc)
  setEventConfig(e.id, {
    bracketMode,
    ...(teamSize !== undefined ? { teamSize } : {}),
    ...(ticketPrice !== undefined ? { ticketPrice } : {}),
    ...(ticketOriginal !== undefined ? { ticketOriginal } : {}),
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
  if (b.finalSize != null && b.finalSize !== '') patch.finalSize = Number(b.finalSize)
  if (b.date != null) patch.date = String(b.date)
  if (['open', 'soon', 'live', 'done'].includes(b.status)) patch.status = b.status
  if (b.statusLabel != null) patch.statusLabel = String(b.statusLabel)

  // teamSize is frozen once anyone has registered — a live event's format can
  // never flip under existing registrations (docs/27 §1.5). ticketPrice has
  // no such lock: changing an event's price mid-flight doesn't corrupt data,
  // it just changes what's charged going forward.
  if (b.teamSize !== undefined) {
    const nextTeamSize = Number(b.teamSize) === 2 ? 2 : undefined
    if (registrationsForComp(id).length > 0) {
      return NextResponse.json({ error: 'ثبت‌نامی برای این مسابقه وجود داره — فرمت دیگه قابل تغییر نیست' }, { status: 409 })
    }
    setEventConfig(id, { teamSize: nextTeamSize })
  }
  if (b.ticketPrice !== undefined || b.ticketOriginal !== undefined) {
    const ticketPrice = b.ticketPrice != null && b.ticketPrice !== '' ? Number(b.ticketPrice) : undefined
    const ticketOriginal = b.ticketOriginal != null && b.ticketOriginal !== '' ? Number(b.ticketOriginal) : undefined
    setEventConfig(id, { ticketPrice, ticketOriginal })
  }

  // bracketMode is frozen once the draw has run — a drawn tree's shape can't flip.
  if (b.bracketMode === 'prelims' || b.bracketMode === 'direct') {
    if (matchesForComp(id).length > 0) {
      return NextResponse.json({ error: 'قرعه‌کشی انجام شده — نوع جدول دیگه قابل تغییر نیست' }, { status: 409 })
    }
    setEventConfig(id, { bracketMode: b.bracketMode })
  }

  try {
    const e = updateEvent(id, patch)
    return NextResponse.json({ ok: true, event: e })
  } catch (err: any) {
    return NextResponse.json({ error: 'ذخیره نشد' }, { status: 400 })
  }
}
