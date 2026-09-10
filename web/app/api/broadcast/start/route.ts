import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isBroadcaster, normalizeAparatEmbed, startLiveStream } from '@/lib/live'
import { getEvent } from '@/lib/store'

export async function POST(req: Request) {
  if (!(await isBroadcaster())) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const session = await getServerSession(authOptions)
  const phone = ((session as any)?.phone ?? '').toString()

  const { eventId, embedUrl: raw } = await req.json().catch(() => ({}))
  if (!eventId || typeof eventId !== 'string' || typeof raw !== 'string') {
    return NextResponse.json({ error: 'ورودی ناقصه' }, { status: 400 })
  }

  const event = getEvent(eventId)
  if (!event) return NextResponse.json({ error: 'رویداد پیدا نشد' }, { status: 404 })

  const embedUrl = normalizeAparatEmbed(raw)
  if (!embedUrl) return NextResponse.json({ error: 'لینک/کد آپارات معتبر نیست' }, { status: 400 })

  const s = startLiveStream({ eventId, eventTitle: event.title, disc: event.disc, embedUrl, phone })
  return NextResponse.json({ ok: true, id: s.id })
}
