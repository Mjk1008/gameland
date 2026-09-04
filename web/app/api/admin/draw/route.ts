import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { drawEligibleRegistrations, getEventConfig, seatableTeamsForComp } from '@/lib/store'
import { generatePrelims, generateProvincePrelims, generateDirectBracket, bracketModeOf, isDrawn } from '@/lib/bracket'
import { generateTeamPrelims } from '@/lib/bracket-team'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { compId, groupMode, destProvince, sourceProvince, nBrackets, bracketSize } = body
  if (!compId) return NextResponse.json({ error: 'compId الزامی' }, { status: 400 })
  const mode = groupMode === 'province' ? 'province' : 'city'

  if (getEventConfig(compId).teamSize === 2) {
    const teams = seatableTeamsForComp(compId)
    if (teams.length === 0) return NextResponse.json({ error: 'هیچ تیمِ کاملی نداریم' }, { status: 400 })
    const result = await generateTeamPrelims({ compId, teams, groupMode: mode })
    return NextResponse.json({ ok: true, ...result, redrawn: isDrawn(compId) })
  }

  const regs = drawEligibleRegistrations(compId)
  if (regs.length === 0) return NextResponse.json({ error: 'هیچ ثبت‌نام تاییدشده‌ای نداریم' }, { status: 400 })

  // Direct disciplines (everything except EA FC 26) → one bracket, no grouping.
  if (bracketModeOf(compId) === 'direct') {
    const result = await generateDirectBracket({ compId, registrations: regs })
    return NextResponse.json({ ok: true, mode: 'direct', ...result, redrawn: isDrawn(compId) })
  }

  if (typeof destProvince === 'string' && destProvince.trim()) {
    try {
      const result = await generateProvincePrelims({
        compId,
        destProvince,
        sourceProvince: typeof sourceProvince === 'string' ? sourceProvince : destProvince,
        nBrackets: Number(nBrackets),
        bracketSize: Number(bracketSize),
      })
      return NextResponse.json({ ok: true, mode: 'prelims', ...result, redrawn: isDrawn(compId) })
    } catch (e: any) {
      const map: Record<string, string> = {
        BRACKET_COUNT: 'تعداد براکت نامعتبره',
        BRACKET_SIZE: 'ظرفیت براکت نامعتبره',
        NO_TICKETS: 'هیچ سهمی در این استان نیست',
        TOO_MANY_BRACKETS: 'تعداد براکت از تعداد سهم بیشتره',
        CAPACITY: 'ظرفیت براکت‌ها برای این سهم‌ها کمه',
      }
      return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
    }
  }

  const result = await generatePrelims({ compId, registrations: regs, groupMode: mode })
  return NextResponse.json({ ok: true, mode: 'prelims', ...result, redrawn: isDrawn(compId) })
}
