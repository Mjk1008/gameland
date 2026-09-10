import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getEventConfig } from '@/lib/store'
import { assembleFinalExact } from '@/lib/bracket'

// Admin mirrors a bracket that was drawn outside the app (e.g. on Challonge)
// into the final stage, seat-for-seat — see assembleFinalExact in lib/bracket.ts.
// Team events keep using the normal استخر فینال flow.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId, seats } = await req.json().catch(() => ({} as any))
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  if (getEventConfig(compId).teamSize === 2) return NextResponse.json({ error: 'برای رشته‌های دوبه‌دو پشتیبانی نمی‌شه' }, { status: 400 })
  if (!Array.isArray(seats) || seats.length < 2) return NextResponse.json({ error: 'چیدمان نامعتبره' }, { status: 400 })

  try {
    const r = await assembleFinalExact(compId, seats.map((s: any) => (typeof s === 'string' ? s : '')))
    return NextResponse.json({ ok: true, ...r })
  } catch (e: any) {
    const map: Record<string, string> = {
      TOO_FEW_PLAYERS: 'حداقل ۲ نفر لازمه',
      CAPACITY_EXCEEDED: 'تعداد از ظرفیت براکت فینال بیشتره — اول ظرفیت رو زیاد کن',
    }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
