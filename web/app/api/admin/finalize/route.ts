import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, getEvent, updateEventStatus, storePlacement, registrationsForComp, pushNotif } from '@/lib/store'

// Finalize an event: record final placements → feeds the ranking/leaderboard,
// mark the event done, and notify each ranked player.
// Body: { compId, placements: [{ userId, rank }] }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const compId: string = b.compId
  const rows: { userId: string; rank: number }[] = Array.isArray(b.placements) ? b.placements : []

  const c = getEvent(compId)
  if (!c) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })

  // Validate: ranks are positive ints, users are real & registered, no dup ranks.
  const regIds = new Set(registrationsForComp(compId).map(r => r.userId))
  const seenRank = new Set<number>()
  const clean: { userId: string; rank: number }[] = []
  for (const row of rows) {
    const rank = Number(row.rank)
    if (!row.userId || !Number.isInteger(rank) || rank < 1) continue
    if (!getUserById(row.userId)) continue
    if (!regIds.has(row.userId)) return NextResponse.json({ error: 'بازیکن ثبت‌نام‌نشده در نتایج' }, { status: 400 })
    if (seenRank.has(rank)) return NextResponse.json({ error: `مقام ${rank} تکراری است` }, { status: 400 })
    seenRank.add(rank)
    clean.push({ userId: row.userId, rank })
  }
  if (clean.length === 0) return NextResponse.json({ error: 'حداقل یک مقام ثبت کن' }, { status: 400 })

  // Persist placements (idempotent upsert on (user, comp)).
  for (const row of clean) {
    storePlacement(row.userId, compId, c.disc as any, row.rank)
  }

  // Mark done + notify each ranked player.
  updateEventStatus(compId, 'done', 'پایان‌یافته')
  for (const row of clean) {
    const title = row.rank === 1 ? '🏆 قهرمان شدی!' : `مقام ${row.rank}`
    pushNotif(row.userId, 'result', title, `نتیجهٔ نهایی «${c.title}» ثبت شد: مقام ${row.rank}. امتیاز رنکینگت به‌روز شد.`)
  }

  return NextResponse.json({ ok: true, placed: clean.length })
}
