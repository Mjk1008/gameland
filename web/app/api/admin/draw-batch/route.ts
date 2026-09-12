import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  drawEligibleRegistrations, getEvent, getEventConfig, getRegistration,
  isTeamPartnerReg, seatableTeamsForComp, settledAttempts, type GroupMode,
} from '@/lib/store'
import { bracketModeOf, generatePrelimBatch, groupKeyForUser } from '@/lib/bracket'
import { generateTeamPrelimBatch, teamGroupKeyOf } from '@/lib/bracket-team'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { compId, groupMode, place, bracketCount, capacityPerBracket, userIds, mixed, batchLabel } = body
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  if (bracketModeOf(compId) !== 'prelims') return NextResponse.json({ error: 'فقط مسابقات مقدماتی' }, { status: 400 })

  const isMixed = mixed === true
  const isTeam = getEventConfig(compId).teamSize === 2
  let groupKey: string
  let mode: GroupMode = 'city'

  if (isMixed) {
    const label = (typeof batchLabel === 'string' ? batchLabel.trim() : '') || 'بازماندگان'
    groupKey = `mixed:${label}`
  } else {
    mode = groupMode === 'province' ? 'province' : 'city'
    const placeStr = typeof place === 'string' ? place.trim() : ''
    if (!placeStr) return NextResponse.json({ error: 'شهر یا استان الزامیه' }, { status: 400 })
    groupKey = `${mode}:${placeStr}`
  }

  const ids = Array.isArray(userIds) ? userIds.filter((id: unknown) => typeof id === 'string') : []
  if (ids.length === 0) return NextResponse.json({ error: 'حداقل یک بازیکن انتخاب کن' }, { status: 400 })

  const nBrackets = Math.min(6, Math.max(1, Math.floor(Number(bracketCount)) || 0))
  const nCap = Math.min(2048, Math.max(2, Math.floor(Number(capacityPerBracket)) || 0))
  if (!nBrackets || !nCap) return NextResponse.json({ error: 'تعداد براکت یا ظرفیت نامعتبره' }, { status: 400 })

  let players: { userId: string; attempts: number }[] = []
  if (isTeam) {
    const byId = new Map(seatableTeamsForComp(compId).map(t => [t.id, t]))
    for (const id of ids) {
      const t = byId.get(id)
      if (!t) return NextResponse.json({ error: 'تیم تأییدشده پیدا نشد' }, { status: 400 })
      if (!isMixed && teamGroupKeyOf(t, mode) !== groupKey) {
        return NextResponse.json({ error: 'تیم خارج از این گروهه' }, { status: 400 })
      }
      const cap = getRegistration(t.captainId, compId)
      const k = cap ? settledAttempts(cap) : 0
      if (k < 1) return NextResponse.json({ error: 'تیم تأییدشده پیدا نشد' }, { status: 400 })
      players.push({ userId: t.id, attempts: k })
    }
  } else {
    const regByUser = new Map(
      drawEligibleRegistrations(compId)
        .filter(r => !isTeamPartnerReg(r))
        .map(r => [r.userId, r]),
    )
    for (const uid of ids) {
      const r = regByUser.get(uid)
      if (!r) return NextResponse.json({ error: 'ثبت‌نام تأییدشده پیدا نشد' }, { status: 400 })
      if (!isMixed && groupKeyForUser(uid, mode) !== groupKey) {
        return NextResponse.json({ error: 'بازیکن خارج از این گروهه' }, { status: 400 })
      }
      players.push({ userId: uid, attempts: settledAttempts(r) })
    }
  }

  try {
    const result = isTeam
      ? await generateTeamPrelimBatch({ compId, groupKey, bracketCount: nBrackets, capacityPerBracket: nCap, players })
      : await generatePrelimBatch({ compId, groupKey, bracketCount: nBrackets, capacityPerBracket: nCap, players })
    return NextResponse.json({ ok: true, groupKey, mixed: isMixed, ...result })
  } catch (e: any) {
    const msg = e.message as string
    if (msg.startsWith('CAPACITY_EXCEEDED:')) {
      const [, n, c] = msg.split(':')
      return NextResponse.json({ error: `یک براکت ${n} سهم داره — ظرفیت ${c}` }, { status: 400 })
    }
    const map: Record<string, string> = {
      NO_PLAYERS: 'بازیکنی برای چیدن نیست',
    }
    return NextResponse.json({ error: map[msg] || msg }, { status: 400 })
  }
}
