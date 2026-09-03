import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, playerName, registrationsForUser, getEvent } from '@/lib/store'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const u = getUserById(params.id)
  if (!u) return NextResponse.json({ error: 'پیدا نشد' }, { status: 404 })

  const events = registrationsForUser(u.id).map(r => ({
    title: getEvent(r.compId)?.title || r.compId,
    attempts: r.attempts,
  }))
  return NextResponse.json({ name: playerName(u), phone: u.phone || '', events })
}
