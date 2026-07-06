import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent } from '@/lib/store'
import { setBracketQualify } from '@/lib/bracket'

// Admin sets how many players qualify from a given prelim bracket to the final.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId, groupKey, bracket, count } = await req.json().catch(() => ({}))
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  if (typeof groupKey !== 'string' || typeof bracket !== 'number') return NextResponse.json({ error: 'ورودی نامعتبر' }, { status: 400 })

  setBracketQualify(compId, groupKey, bracket, Math.max(0, Math.floor(Number(count) || 0)))
  return NextResponse.json({ ok: true })
}
