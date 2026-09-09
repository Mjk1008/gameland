import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getEventConfig } from '@/lib/store'
import { assembleFinal } from '@/lib/bracket'
import { assembleTeamFinal } from '@/lib/bracket-team'

// Admin assembles (or re-assembles) the final bracket from the admin-curated
// final pool (see lib/bracket.ts assembleFinal/getFinalPool). Team events
// still assemble from computeTeamQualifiers (lib/bracket-team.ts) — untouched.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId } = await req.json().catch(() => ({}))
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })

  try {
    const r = getEventConfig(compId).teamSize === 2 ? await assembleTeamFinal(compId) : await assembleFinal(compId)
    return NextResponse.json({ ok: true, ...r })
  } catch (e: any) {
    const map: Record<string, string> = { EMPTY_POOL: 'استخر فینال خالیه — اول بازیکن اضافه کن' }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
