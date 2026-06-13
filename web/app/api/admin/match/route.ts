import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { setMatchWinner } from '@/lib/bracket'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { matchId, winnerUserId, score } = await req.json().catch(() => ({}))
  if (!matchId || !winnerUserId) return NextResponse.json({ error: 'matchId و winnerUserId الزامی' }, { status: 400 })

  try {
    const m = setMatchWinner(matchId, winnerUserId, score)
    return NextResponse.json({ ok: true, match: m })
  } catch (e: any) {
    const map: Record<string, string> = {
      MATCH_NOT_FOUND: 'مسابقه پیدا نشد',
      MATCH_ALREADY_DONE: 'نتیجه قبلاً ثبت شده',
      INVALID_WINNER: 'بازیکن برنده در این مچ نیست',
    }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
