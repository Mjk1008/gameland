import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { approvedRegistrationsForComp, pushNotif } from '@/lib/store'
import { generateBracketDraw, isDrawn } from '@/lib/bracket'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId } = await req.json().catch(() => ({}))
  if (!compId) return NextResponse.json({ error: 'compId الزامی' }, { status: 400 })

  const regs = approvedRegistrationsForComp(compId)
  if (regs.length === 0) return NextResponse.json({ error: 'هیچ ثبت‌نام تاییدشده‌ای نداریم' }, { status: 400 })

  const result = generateBracketDraw({ compId, registrations: regs })
  // notify all participants
  for (const r of regs) pushNotif(r.userId, 'draw', 'قرعه‌کشی انجام شد', `براکت‌ها چیده شد. مسابقهٔ خودت رو در صفحهٔ روندنما ببین.`)

  return NextResponse.json({ ok: true, ...result, redrawn: isDrawn(compId) })
}
