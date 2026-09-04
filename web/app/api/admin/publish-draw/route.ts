import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent } from '@/lib/store'
import { isDrawn, publishDrawGroup } from '@/lib/bracket'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId, groupKey } = await req.json().catch(() => ({}))
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  if (!isDrawn(compId)) return NextResponse.json({ error: 'هنوز قرعه‌کشی نشده' }, { status: 400 })
  const gk = typeof groupKey === 'string' ? groupKey : ''
  const result = publishDrawGroup(compId, gk)
  return NextResponse.json({ ok: true, ...result })
}
