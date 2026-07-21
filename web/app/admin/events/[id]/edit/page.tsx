import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent } from '@/lib/store'
import EditEventForm, { type EventInit } from './form'

export const dynamic = 'force-dynamic'

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') redirect('/login?callbackUrl=/admin')
  const e = getEvent(params.id)
  if (!e) return notFound()

  const init: EventInit = {
    id: e.id, title: e.title, season: e.season, disc: e.disc as any,
    prize: e.prize, teams: e.teams, format: e.format, date: e.date,
    finalSize: e.finalSize ?? 128,
    tier: e.tier, status: e.status,
  }
  return <EditEventForm init={init} />
}
