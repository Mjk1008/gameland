import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, hasPermission, playerName, registrationsForUser, getEvent } from '@/lib/store'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  const staff = role === 'admin' || role === 'organizer'
  const resultOnly = !staff && hasPermission(uid ? getUserById(uid) : undefined, 'result_entry')
  if (!staff && !resultOnly) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const u = getUserById(params.id)
  if (!u) return NextResponse.json({ error: 'پیدا نشد' }, { status: 404 })

  // 'result_entry' gets the name + phone (for coordinating the match) but
  // never the سهم breakdown — that stays staff-only, per the original ask.
  const events = staff
    ? registrationsForUser(u.id).map(r => ({ title: getEvent(r.compId)?.title || r.compId, attempts: r.attempts }))
    : []
  return NextResponse.json({ name: playerName(u), phone: u.phone || '', events })
}
