import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getEventConfig, setEventConfig, qualifyKey } from '@/lib/store'

// Admin sets a per-bracket date/time/note (MD-7). Label only + drives the
// "not-started" check for re-entry. Body: { compId, groupKey, bracket, date?, time?, note? }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId, groupKey, bracket, date, time, note } = await req.json().catch(() => ({}))
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  if (typeof groupKey !== 'string' || typeof bracket !== 'number') return NextResponse.json({ error: 'ورودی نامعتبر' }, { status: 400 })

  const key = qualifyKey(groupKey, bracket)
  const cur = { ...(getEventConfig(compId).bracketSchedule ?? {}) }
  const entry = {
    date: typeof date === 'string' && date.trim() ? date.trim() : undefined,
    time: typeof time === 'string' && time.trim() ? time.trim() : undefined,
    note: typeof note === 'string' && note.trim() ? note.trim().slice(0, 120) : undefined,
  }
  if (!entry.date && !entry.time && !entry.note) delete cur[key]
  else cur[key] = entry
  setEventConfig(compId, { bracketSchedule: cur })
  return NextResponse.json({ ok: true })
}
