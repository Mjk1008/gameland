import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getEventConfig, getUserById, getTeam, playerName } from '@/lib/store'
import { bracketQualifyCandidates } from '@/lib/bracket'
import { teamQualifyCandidates } from '@/lib/bracket-team'

// "بفرست به استخر" picker data for one prelim bracket — see
// bracketQualifyCandidates (solo) / teamQualifyCandidates (2v2) in lib for
// what "candidate" means here.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const url = new URL(req.url)
  const compId = url.searchParams.get('compId') ?? ''
  const groupKey = url.searchParams.get('groupKey') ?? ''
  const bracket = Number(url.searchParams.get('bracket'))
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  if (!Number.isFinite(bracket)) return NextResponse.json({ error: 'ورودی نامعتبر' }, { status: 400 })

  const isTeam = getEventConfig(compId).teamSize === 2
  const r = isTeam ? teamQualifyCandidates(compId, groupKey, bracket) : bracketQualifyCandidates(compId, groupKey, bracket)
  if (!r) return NextResponse.json({ error: 'براکت پیدا نشد' }, { status: 404 })
  const candidates = r.candidates.map(id => {
    if (isTeam) { const t = getTeam(id); return { userId: id, name: t?.name ?? id, tag: undefined } }
    const u = getUserById(id)
    return { userId: id, name: u ? playerName(u) : id, tag: u?.tag }
  })
  return NextResponse.json({ ...r, candidates })
}
