import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getEventConfig } from '@/lib/store'
import { bracketModeOf, clearPrelimGroup } from '@/lib/bracket'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId, groupKey } = await req.json().catch(() => ({}))
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  if (getEventConfig(compId).teamSize === 2) return NextResponse.json({ error: 'فقط رشتهٔ انفرادی' }, { status: 400 })
  if (bracketModeOf(compId) !== 'prelims') return NextResponse.json({ error: 'فقط مسابقات مقدماتی' }, { status: 400 })

  const gk = typeof groupKey === 'string' ? groupKey.trim() : ''
  if (!gk || !/^(province|city|mixed):/.test(gk)) {
    return NextResponse.json({ error: 'گروه نامعتبره' }, { status: 400 })
  }

  try {
    const result = await clearPrelimGroup(compId, gk)
    return NextResponse.json({ ok: true, groupKey: gk, ...result })
  } catch (e: any) {
    const map: Record<string, string> = {
      GROUP_KEY: 'گروه الزامیه',
      NOT_FOUND: 'براکتی برای این گروه نیست',
    }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
