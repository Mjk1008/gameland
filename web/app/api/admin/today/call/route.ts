import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMatch, pushNotif } from '@/lib/store'
import { callToStation } from '@/lib/match-desk'

function guard(session: any) {
  const role = session?.role
  return role === 'admin' || role === 'organizer'
}

// «صدا کن» — assigns/reassigns a station to a match and pings both players.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!guard(session as any)) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const matchId = (b.matchId ?? '').toString()
  const station = (b.station ?? '').toString().trim().slice(0, 20)
  if (!matchId || !station) return NextResponse.json({ error: 'ایستگاه و بازی الزامیه' }, { status: 400 })

  const m = getMatch(matchId)
  if (!m) return NextResponse.json({ error: 'بازی پیدا نشد' }, { status: 404 })

  callToStation(matchId, station)
  for (const uid of [m.p1UserId, m.p2UserId]) {
    if (uid) pushNotif(uid, 'match_ready', 'ایستگاهت مشخص شد', `برو ایستگاهِ ${station}.`)
  }
  return NextResponse.json({ ok: true })
}
