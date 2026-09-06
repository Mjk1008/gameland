import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, isSuperAdmin, getEvent, updateEventStatus } from '@/lib/store'

const LABEL: Record<string, string> = {
  soon: 'به‌زودی', open: 'ثبت‌نام باز', live: 'در حال برگزاری', done: 'پایان‌یافته',
}

// Super-admin only, mirrors event-cancel. Brings a cancelled event back —
// everything (registrations, matches, receipts) was never touched, so this
// is a plain status flip.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const u = uid ? getUserById(uid) : undefined
  if (!isSuperAdmin(u)) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId, status } = await req.json().catch(() => ({}))
  if (!compId || !LABEL[status]) return NextResponse.json({ error: 'پارامتر نامعتبر' }, { status: 400 })
  const c = getEvent(compId)
  if (!c) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  if (c.status !== 'cancelled') return NextResponse.json({ error: 'این مسابقه لغو نشده' }, { status: 400 })

  updateEventStatus(compId, status as any, LABEL[status])
  return NextResponse.json({ ok: true, status })
}
