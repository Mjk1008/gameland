import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getEventConfig, registrationsForComp } from '@/lib/store'
import EditEventForm, { type EventInit } from './form'

export const dynamic = 'force-dynamic'

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') redirect('/login?callbackUrl=/admin')
  const e = getEvent(params.id)
  if (!e) return notFound()
  const cfg = getEventConfig(e.id)

  const init: EventInit = {
    id: e.id, title: e.title, season: e.season, disc: e.disc as any,
    prize: e.prize, teams: e.teams, format: e.format, date: e.date,
    finalSize: e.finalSize ?? 128,
    tier: e.tier, status: e.status,
    teamSize: cfg.teamSize === 2 ? 2 : 1,
    ticketPrice: cfg.ticketPrice, ticketOriginal: cfg.ticketOriginal,
    // Format is frozen once anyone has registered (docs/27 §1.5) — the form
    // disables the selector using this, never re-derived on the client.
    formatLocked: registrationsForComp(e.id).length > 0,
  }
  return <EditEventForm init={init} />
}
