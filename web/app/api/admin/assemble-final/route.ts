import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent } from '@/lib/store'
import { assembleFinal } from '@/lib/bracket'

// Admin assembles (or re-assembles) the final 128 bracket from all qualifiers.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId } = await req.json().catch(() => ({}))
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })

  const r = assembleFinal(compId)
  return NextResponse.json({ ok: true, ...r })
}
