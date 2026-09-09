import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent } from '@/lib/store'
import { bracketModeOf, clearAllPrelimGroups, clearPrelimGroup } from '@/lib/bracket'

// clearPrelimGroup/clearAllPrelimGroups (lib/bracket.ts) only touch generic
// Match rows by stage/groupKey — team-agnostic under the hood, so this route
// works for a 2v2 event's province groups exactly like a solo one's.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId, groupKey, all } = await req.json().catch(() => ({}))
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  if (bracketModeOf(compId) !== 'prelims') return NextResponse.json({ error: 'فقط مسابقات مقدماتی' }, { status: 400 })

  try {
    if (all === true) {
      const result = await clearAllPrelimGroups(compId)
      return NextResponse.json({ ok: true, ...result })
    }
    const gk = typeof groupKey === 'string' ? groupKey.trim() : ''
    if (!gk || !/^(province|city|mixed):/.test(gk)) {
      return NextResponse.json({ error: 'گروه نامعتبره' }, { status: 400 })
    }
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
