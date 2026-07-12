import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, deleteEvent } from '@/lib/store'

// Admin-only: delete a competition and all its data (regs, matches, placements).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId } = await req.json().catch(() => ({}))
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })

  deleteEvent(compId)
  return NextResponse.json({ ok: true })
}
