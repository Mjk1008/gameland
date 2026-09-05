import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildAdminToday } from '@/lib/today-snapshot'
import { resolveRef } from '@/lib/match-desk'

function guard(session: any) {
  const role = session?.role
  return role === 'admin' || role === 'organizer'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!guard(session as any)) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  return NextResponse.json(buildAdminToday())
}

// resolve-ref — clears a pending «درخواستِ داور» row from the queue once handled.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!guard(session as any)) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  if (b.action !== 'resolve-ref') return NextResponse.json({ error: 'عملیات نامعتبره' }, { status: 400 })
  const matchId = (b.matchId ?? '').toString()
  if (!matchId) return NextResponse.json({ error: 'matchId لازمه' }, { status: 400 })
  resolveRef(matchId)
  return NextResponse.json({ ok: true })
}
