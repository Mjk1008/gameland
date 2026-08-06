import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getEventConfig, setEventConfig, type PrelimVenue } from '@/lib/store'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId, groupKey, venue } = await req.json().catch(() => ({}))
  if (!compId || !getEvent(compId)) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })
  if (typeof groupKey !== 'string' || !groupKey.includes(':')) {
    return NextResponse.json({ error: 'groupKey نامعتبر' }, { status: 400 })
  }

  const cur = getEventConfig(compId)
  const next = { ...(cur.prelimVenues ?? {}) }
  if (!venue) {
    delete next[groupKey]
  } else {
    const v = venue as PrelimVenue
    next[groupKey] = {
      gamenetId: v.gamenetId || undefined,
      venueName: v.venueName?.trim() || undefined,
      venueAddress: v.venueAddress?.trim() || undefined,
      mapUrl: v.mapUrl?.trim() || undefined,
      fromDate: v.fromDate?.trim() || undefined,
      toDate: v.toDate?.trim() || undefined,
      scheduleNote: v.scheduleNote?.trim() || undefined,
      contactPhone: v.contactPhone?.trim() || undefined,
    }
  }
  setEventConfig(compId, { prelimVenues: Object.keys(next).length ? next : undefined })
  return NextResponse.json({ ok: true })
}
