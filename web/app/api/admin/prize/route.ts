import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, updateEvent, setEventConfig } from '@/lib/store'

// Admin sets a competition's total prize + a fully custom per-place split
// (how many places get paid and how much each). Amounts are in تومان.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if ((session as any)?.role !== 'admin' && (session as any)?.role !== 'organizer') {
    return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  }
  const b = await req.json().catch(() => ({}))
  const compId = (b.compId ?? '').toString()
  if (!getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })

  const split: number[] = Array.isArray(b.prizeSplit)
    ? b.prizeSplit.map((n: any) => Math.max(0, Math.round(Number(n) || 0))).filter((n: number) => n > 0)
    : []
  // headline total (میلیون تومان) — explicit, else derived from the split sum
  const sum = split.reduce((a, c) => a + c, 0)
  const prizeM = b.prize != null && b.prize !== '' ? Math.max(0, Math.round(Number(b.prize))) : Math.round(sum / 1_000_000)

  updateEvent(compId, { prize: prizeM })
  setEventConfig(compId, { prizeSplit: split })
  return NextResponse.json({ ok: true, prize: prizeM, prizeSplit: split })
}
