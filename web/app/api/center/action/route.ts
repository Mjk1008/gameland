import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  followPlayer, getMatch, getMatchDesk, getUserById, isFollowing,
  notifyStaff, patchMatchDesk, playerName, pushNotif, unfollowPlayer, whenReady,
} from '@/lib/store'
import { isMatchCenterEnabled } from '@/lib/match-center-enabled'
import { displayMatchNum, matchSide } from '@/lib/match-center'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  await whenReady()
  if (!isMatchCenterEnabled()) return NextResponse.json({ error: 'off' }, { status: 404 })
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'ورود لازم است' }, { status: 401 })

  const { op, matchId, followeeId } = await req.json().catch(() => ({}))

  if (op === 'follow' || op === 'unfollow') {
    if (!followeeId || followeeId === uid) return NextResponse.json({ error: 'ورودی نامعتبر' }, { status: 400 })
    if (!getUserById(followeeId)) return NextResponse.json({ error: 'بازیکن پیدا نشد' }, { status: 404 })
    if (op === 'follow') followPlayer(uid, followeeId)
    else unfollowPlayer(uid, followeeId)
    return NextResponse.json({ ok: true, followed: isFollowing(uid, followeeId) })
  }

  if (!matchId) return NextResponse.json({ error: 'ورودی نامعتبر' }, { status: 400 })
  const m = getMatch(matchId)
  if (!m || m.status === 'done' || m.cancelled) return NextResponse.json({ error: 'این بازی در دسترس نیست' }, { status: 400 })
  const side = matchSide(m, uid)
  if (!side) return NextResponse.json({ error: 'این بازی مال تو نیست' }, { status: 403 })

  const desk = getMatchDesk(matchId)
  const oppId = side === 1 ? (m.p2UserId) : (m.p1UserId)
  const me = getUserById(uid)

  if (op === 'here') {
    const patch = side === 1 ? { p1Here: true } : { p2Here: true }
    patchMatchDesk(matchId, patch)
    if (oppId) pushNotif(oppId, 'announcement', 'حریفت حاضر شد', `${playerName(me!)} تو محل حاضر شد.`)
    return NextResponse.json({ ok: true })
  }
  if (op === 'ready') {
    const patch = side === 1
      ? { p1Here: true, p1Ready: true }
      : { p2Here: true, p2Ready: true }
    patchMatchDesk(matchId, patch)
    if (oppId) pushNotif(oppId, 'match_ready', 'حریفت آماده است', `${playerName(me!)} آمادهٔ بازی شد.`)
    return NextResponse.json({ ok: true })
  }
  if (op === 'ref') {
    if (desk.refAt && Date.now() - desk.refAt < 60_000) return NextResponse.json({ ok: true })
    patchMatchDesk(matchId, { refBy: uid, refAt: Date.now() })
    notifyStaff('درخواست داور', `${playerName(me!)} برای بازی شماره ${displayMatchNum(matchId)} درخواست داور داد.`)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'ورودی نامعتبر' }, { status: 400 })
}
