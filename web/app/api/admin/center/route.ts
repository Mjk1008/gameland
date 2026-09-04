import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  followersOf, getMatch, getUserById, MATCH_CENTER_KEY, patchMatchDesk,
  playerName, pushNotif, setSetting, whenReady,
} from '@/lib/store'
import { callCopy, displayMatchNum } from '@/lib/match-center'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  await whenReady()
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { op, matchId, station, enabled } = await req.json().catch(() => ({}))

  if (op === 'toggle') {
    setSetting(MATCH_CENTER_KEY, enabled ? 'on' : 'off')
    return NextResponse.json({ ok: true, enabled: !!enabled })
  }

  if (!matchId) return NextResponse.json({ error: 'ورودی نامعتبر' }, { status: 400 })
  const m = getMatch(matchId)
  if (!m) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })

  if (op === 'call') {
    const n = Number(station)
    if (!Number.isFinite(n) || n < 1 || n > 999) return NextResponse.json({ error: 'شماره دستگاه نامعتبر' }, { status: 400 })
    patchMatchDesk(matchId, { station: n, calledAt: Date.now() })
    const num = displayMatchNum(matchId)
    const body = callCopy(num, n)
    const ids = [m.p1UserId, m.p2UserId].filter(Boolean) as string[]
    for (const uid of ids) {
      pushNotif(uid, 'match_ready', body, body)
      for (const f of followersOf(uid)) {
        const u = getUserById(uid)
        pushNotif(f, 'announcement', 'بازی شروع می‌شود', `${u ? playerName(u) : ''} · ${body}`)
      }
    }
    return NextResponse.json({ ok: true })
  }

  if (op === 'station') {
    const n = Number(station)
    if (!Number.isFinite(n) || n < 1 || n > 999) return NextResponse.json({ error: 'شماره دستگاه نامعتبر' }, { status: 400 })
    patchMatchDesk(matchId, { station: n })
    const ids = [m.p1UserId, m.p2UserId].filter(Boolean) as string[]
    for (const uid of ids) pushNotif(uid, 'announcement', `دستگاه ${n}`, `دستگاه ${n} برات مشخص شد.`)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'ورودی نامعتبر' }, { status: 400 })
}
