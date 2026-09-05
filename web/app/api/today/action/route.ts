import { NextResponse } from 'next/server'
import { matchesForUser, getUserById, pushNotif } from '@/lib/store'
import { checkIn, markReady, requestRef, follow, unfollow } from '@/lib/match-desk'
import { liveEventIds } from '@/lib/today-snapshot'
import { withTodayUser } from '@/lib/today-hub-http'

type Body = {
  action?: 'here' | 'ready' | 'ref' | 'follow' | 'unfollow'
  matchId?: string
  targetUid?: string
}

export async function POST(req: Request) {
  return withTodayUser(async uid => {
    const b = (await req.json().catch(() => ({}))) as Body
    const action = b.action

    if (action === 'follow' || action === 'unfollow') {
      const targetUid = (b.targetUid ?? '').toString()
      if (!targetUid || !getUserById(targetUid)) return NextResponse.json({ error: 'بازیکن پیدا نشد' }, { status: 400 })
      if (action === 'follow') follow(uid, targetUid); else unfollow(uid, targetUid)
      return NextResponse.json({ ok: true })
    }

    if (action !== 'here' && action !== 'ready' && action !== 'ref') {
      return NextResponse.json({ error: 'عملیات نامعتبره' }, { status: 400 })
    }

    const matchId = (b.matchId ?? '').toString()
    const liveIds = liveEventIds()
    const m = matchesForUser(uid).find(x => x.id === matchId && liveIds.includes(x.compId) && !x.cancelled && x.status === 'ready')
    if (!m) return NextResponse.json({ error: 'بازی پیدا نشد یا فعال نیست' }, { status: 404 })

    const side: 'p1' | 'p2' = m.p1UserId === uid ? 'p1' : 'p2'
    const opponentId = side === 'p1' ? m.p2UserId : m.p1UserId
    const me = getUserById(uid)

    if (action === 'here') {
      checkIn(matchId, side)
      if (opponentId) pushNotif(opponentId, 'match_ready', 'حریفت حاضر شد', `${me?.name ?? 'حریفت'} تو سالن حاضر شد.`)
    } else if (action === 'ready') {
      markReady(matchId, side)
      if (opponentId) pushNotif(opponentId, 'match_ready', 'نوبتته', `${me?.name ?? 'حریفت'} اعلامِ آمادگی کرد.`)
    } else {
      requestRef(matchId, uid)
    }

    return NextResponse.json({ ok: true })
  })
}
