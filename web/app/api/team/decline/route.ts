import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { declineTeamInvite, getUserById, getTeam, whenReady } from '@/lib/store'

export async function POST(req: Request) {
  await whenReady()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const u = uid ? getUserById(uid) : null
  if (!uid || !u) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const teamId = (body.teamId ?? '').toString()
  if (!getTeam(teamId)) return NextResponse.json({ error: 'تیم پیدا نشد' }, { status: 404 })

  try {
    declineTeamInvite(uid, teamId)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const map: Record<string, string> = { NOT_INVITED: 'دعوتی برای تو پیدا نشد' }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
