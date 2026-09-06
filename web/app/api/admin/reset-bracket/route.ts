import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getEventConfig, matchesForComp, clearMatchesForComp } from '@/lib/store'
import { bracketModeOf, syncFinalEntries } from '@/lib/bracket'

// Wipes a DIRECT-mode bracket entirely (no rebuild) so bracketLocked
// (matchesForComp(id).length > 0, see /admin/events/[id]/edit/page.tsx)
// releases and the admin can switch the discipline to prelims mode.
// Prelims-mode groups already have their own per-group clear
// (/api/admin/clear-brackets) — this route only covers the direct case,
// which that route explicitly refuses.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId } = await req.json().catch(() => ({}))
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  if (getEventConfig(compId).teamSize === 2) return NextResponse.json({ error: 'فقط رشتهٔ انفرادی' }, { status: 400 })
  if (bracketModeOf(compId) !== 'direct') return NextResponse.json({ error: 'فقط برای جدول مستقیم' }, { status: 400 })

  const deleted = matchesForComp(compId).length
  if (deleted === 0) return NextResponse.json({ error: 'جدولی برای پاک کردن نیست' }, { status: 400 })

  await clearMatchesForComp(compId)
  syncFinalEntries(compId)
  return NextResponse.json({ ok: true, deleted })
}
