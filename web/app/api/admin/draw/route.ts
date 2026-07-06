import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { approvedRegistrationsForComp, pushNotif } from '@/lib/store'
import { generatePrelims, isDrawn } from '@/lib/bracket'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId, groupMode } = await req.json().catch(() => ({}))
  if (!compId) return NextResponse.json({ error: 'compId الزامی' }, { status: 400 })
  const mode = groupMode === 'province' ? 'province' : 'city'

  const regs = approvedRegistrationsForComp(compId)
  if (regs.length === 0) return NextResponse.json({ error: 'هیچ ثبت‌نام تاییدشده‌ای نداریم' }, { status: 400 })

  const result = generatePrelims({ compId, registrations: regs, groupMode: mode })
  for (const r of regs) pushNotif(r.userId, 'draw', 'قرعه‌کشی مقدماتی انجام شد', 'براکت‌های شهرت چیده شد. مسابقه‌ات رو در صفحهٔ مسابقه ببین.')

  return NextResponse.json({ ok: true, ...result, redrawn: isDrawn(compId) })
}
