import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { allEvents, allMatches, getUserById, playerName, hasPermission } from '@/lib/store'
import { isRealPlayer } from '@/lib/bracket-slots'

export const dynamic = 'force-dynamic'

// "Where else is this name playing right now?" — a player holds سهم in more
// than one رشته, so a name an admin is hunting in one bracket is very often
// seated in another one too. Answers with one entry per OTHER drawn event,
// plus a matchId so the caller can deep-link straight onto that seat
// (BracketView's ?match= handler).
//
// Scope is every drawn, non-cancelled event — not just the ones under the
// same رویداد: registrations aren't confined to one competition, and the
// wider set is a superset of the narrower one.
const MAX_EVENTS = 8

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const role = (session as any)?.role
  const staff = role === 'admin' || role === 'organizer'
  // Same audience as the bracket's own result-entry surface.
  if (!staff && !hasPermission(uid ? getUserById(uid) : undefined, 'result_entry')) {
    return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })
  }

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const exclude = url.searchParams.get('exclude') ?? ''
  if (q.length < 2) return NextResponse.json({ events: [] })

  const events = new Map(allEvents().filter(e => e.status !== 'cancelled').map(e => [e.id, e]))
  // uid → searchable haystack, built once per player rather than per seat.
  const hay = new Map<string, string>()
  const nameOf = (id: string): string => {
    let h = hay.get(id)
    if (h == null) {
      const u = getUserById(id)
      h = u ? `${playerName(u)} ${u.tag}`.toLowerCase() : ''
      hay.set(id, h)
    }
    return h
  }

  const found = new Map<string, { compId: string; title: string; count: number; matchId: string }>()
  for (const m of allMatches()) {
    if (m.compId === exclude || m.cancelled) continue
    const e = events.get(m.compId)
    if (!e) continue
    let seats = 0
    for (const seat of [m.p1UserId, m.p2UserId]) {
      if (isRealPlayer(seat) && nameOf(seat).includes(q)) seats++
    }
    if (seats === 0) continue
    const row = found.get(m.compId)
    // First hit wins as the jump target: matches come out of the store in
    // creation order, so that's the earliest round the name appears in.
    if (row) row.count += seats
    else found.set(m.compId, { compId: m.compId, title: e.title, count: seats, matchId: m.id })
  }

  return NextResponse.json({
    events: [...found.values()].sort((a, b) => b.count - a.count).slice(0, MAX_EVENTS),
  })
}
