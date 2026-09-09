import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getUserById, playerName } from '@/lib/store'
import { bracketQualifyCandidates } from '@/lib/bracket'

// "بفرست به استخر" picker data for one prelim bracket — see
// bracketQualifyCandidates in lib/bracket.ts for what "candidate" means here.
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

  const r = bracketQualifyCandidates(compId, groupKey, bracket)
  if (!r) return NextResponse.json({ error: 'براکت پیدا نشد' }, { status: 404 })
  const candidates = r.candidates.map(uid => {
    const u = getUserById(uid)
    return { userId: uid, name: u ? playerName(u) : uid, tag: u?.tag }
  })
  return NextResponse.json({ ...r, candidates })
}
