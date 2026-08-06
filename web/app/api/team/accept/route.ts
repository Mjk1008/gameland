import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { acceptTeamInvite, consumeFreeTickets, pushNotif, getUserById, getTeam, whenReady } from '@/lib/store'
import { persist } from '@/lib/db/persistence'

export async function POST(req: Request) {
  await whenReady()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const u = uid ? getUserById(uid) : null
  if (!uid || !u) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const teamId = (body.teamId ?? '').toString()
  const t = getTeam(teamId)
  if (!t) return NextResponse.json({ error: 'تیم پیدا نشد' }, { status: 404 })

  try {
    const r = acceptTeamInvite(uid, teamId)
    const free = Math.min(u.freeTickets ?? 0, r.attempts)
    if (free > 0) consumeFreeTickets(uid, r.id, free)
    await persist.user.insertAsync(u)
    await persist.reg.insertAsync(r)
    const captain = getUserById(t.captainId)
    pushNotif(t.captainId, 'announcement', 'هم‌تیمی قبول کرد',
      `@${u.tag} دعوتِ تیمِ «${t.name}» رو قبول کرد — منتظرِ پرداخت و تاییدِ ادمین برای هر دو نفر.`)
    return NextResponse.json({ ok: true, registration: r, freeUsed: free, team: { ...t, captainTag: captain?.tag } })
  } catch (e: any) {
    const map: Record<string, string> = {
      TEAM_NOT_FOUND: 'تیم پیدا نشد',
      REG_LOCKED: 'ثبت‌نام بسته شده — قرعه‌کشی انجام شده',
      NOT_INVITED: 'دعوتی برای تو پیدا نشد',
      ATTEMPTS_OUT_OF_RANGE: 'تعداد سهم باید ۱ تا ۶ باشد',
    }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
