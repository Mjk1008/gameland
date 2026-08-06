import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUserById, getEvent, getEventConfig, updateEventStatus, storePlacement,
  approvedRegistrationsForComp, pushNotif, getTeam, currentTeamMembers, seatableTeamsForComp,
} from '@/lib/store'

type SoloRow = { userId: string; rank: number }
type TeamRow = { teamId: string; rank: number }

// Finalize an event: record final placements → feeds ranking/leaderboard.
// Solo body:  { compId, placements: [{ userId, rank }] }
// Team body:  { compId, placements: [{ teamId, rank }] } → one placement row per member
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const compId: string = b.compId
  const rows: { userId?: string; teamId?: string; rank: number }[] = Array.isArray(b.placements) ? b.placements : []

  const c = getEvent(compId)
  if (!c) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })

  const isTeamEvent = getEventConfig(compId).teamSize === 2

  if (isTeamEvent) {
    const seatable = new Set(seatableTeamsForComp(compId).map(t => t.id))
    const seenRank = new Set<number>()
    const clean: TeamRow[] = []
    for (const row of rows) {
      const rank = Number(row.rank)
      const teamId = row.teamId?.trim()
      if (!teamId || !Number.isInteger(rank) || rank < 1) continue
      if (!getTeam(teamId)) continue
      if (!seatable.has(teamId)) return NextResponse.json({ error: 'تیم تأییدنشده یا ناقص در نتایج' }, { status: 400 })
      if (seenRank.has(rank)) return NextResponse.json({ error: `مقام ${rank} تکراری است` }, { status: 400 })
      seenRank.add(rank)
      clean.push({ teamId, rank })
    }
    if (clean.length === 0) return NextResponse.json({ error: 'حداقل یک مقام ثبت کن' }, { status: 400 })

    let placed = 0
    for (const row of clean) {
      for (const m of currentTeamMembers(row.teamId)) {
        if (!approvedRegistrationsForComp(compId).some(r => r.userId === m.userId && r.status === 'approved')) continue
        storePlacement(m.userId, compId, c.disc as any, row.rank)
        placed++
        const title = row.rank === 1 ? '🏆 قهرمان شدی!' : `مقام ${row.rank}`
        pushNotif(m.userId, 'result', title, `نتیجهٔ نهایی «${c.title}» ثبت شد: مقام ${row.rank}. امتیاز رنکینگت به‌روز شد.`)
      }
    }

    updateEventStatus(compId, 'done', 'پایان‌یافته')
    return NextResponse.json({ ok: true, placed, teams: clean.length })
  }

  const regIds = new Set(approvedRegistrationsForComp(compId).map(r => r.userId))
  const seenRank = new Set<number>()
  const clean: SoloRow[] = []
  for (const row of rows) {
    const rank = Number(row.rank)
    const userId = row.userId?.trim()
    if (!userId || !Number.isInteger(rank) || rank < 1) continue
    if (!getUserById(userId)) continue
    if (!regIds.has(userId)) return NextResponse.json({ error: 'بازیکن تاییدنشده در نتایج' }, { status: 400 })
    if (seenRank.has(rank)) return NextResponse.json({ error: `مقام ${rank} تکراری است` }, { status: 400 })
    seenRank.add(rank)
    clean.push({ userId, rank })
  }
  if (clean.length === 0) return NextResponse.json({ error: 'حداقل یک مقام ثبت کن' }, { status: 400 })

  for (const row of clean) {
    storePlacement(row.userId, compId, c.disc as any, row.rank)
  }

  updateEventStatus(compId, 'done', 'پایان‌یافته')
  for (const row of clean) {
    const title = row.rank === 1 ? '🏆 قهرمان شدی!' : `مقام ${row.rank}`
    pushNotif(row.userId, 'result', title, `نتیجهٔ نهایی «${c.title}» ثبت شد: مقام ${row.rank}. امتیاز رنکینگت به‌روز شد.`)
  }

  return NextResponse.json({ ok: true, placed: clean.length })
}
