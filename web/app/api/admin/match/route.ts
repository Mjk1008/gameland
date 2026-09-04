import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMatch, getUserById, hasPermission } from '@/lib/store'
import { setMatchWinner, correctMatchResult, cancelMatch, recordCancelledMatchResult } from '@/lib/bracket'
import { setTeamMatchWinner } from '@/lib/bracket-team'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  const staff = role === 'admin' || role === 'organizer'
  // A 'result_entry' grant lets a plain gamer account do full match-day ops
  // here — win/correct, cancel, announce — same as staff. What stays
  // staff-only is elsewhere: the draw itself, player peek, rest-fill.
  const resultOnly = !staff && hasPermission(uid ? getUserById(uid) : undefined, 'result_entry')
  if (!staff && !resultOnly) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { matchId, winnerUserId, score, correct, cancel } = await req.json().catch(() => ({}))
  if (!matchId) return NextResponse.json({ error: 'matchId الزامی' }, { status: 400 })

  const existing = getMatch(matchId)
  if (!existing) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 400 })
  const isTeamMatch = existing.p1TeamId != null || existing.p2TeamId != null

  try {
    if (cancel) {
      if (isTeamMatch) return NextResponse.json({ error: 'لغو برای تیم نیست' }, { status: 400 })
      const m = cancelMatch(matchId)
      return NextResponse.json({ ok: true, match: m })
    }
    if (!winnerUserId) return NextResponse.json({ error: 'matchId و winnerUserId الزامی' }, { status: 400 })
    const m = existing.cancelled
      ? recordCancelledMatchResult(matchId, winnerUserId, score)
      : correct
        ? correctMatchResult(matchId, winnerUserId)
        : isTeamMatch ? setTeamMatchWinner(matchId, winnerUserId, score) : setMatchWinner(matchId, winnerUserId, score)
    return NextResponse.json({ ok: true, match: m })
  } catch (e: any) {
    const map: Record<string, string> = {
      MATCH_NOT_FOUND: 'مسابقه پیدا نشد',
      MATCH_ALREADY_DONE: 'نتیجه قبلاً ثبت شده',
      MATCH_NOT_DONE: 'این مسابقه هنوز نتیجه نداره',
      NEXT_ROUND_PLAYED: 'راند بعدی این براکت بازی شده — اول اون نتیجه رو ویرایش کن',
      MATCH_NOT_CANCELLED: 'این مسابقه لغو نشده',
      INVALID_WINNER: 'بازیکن/تیمِ برنده در این مچ نیست',
    }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
