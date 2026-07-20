import { allPromos, allEvents } from '@/lib/store'
import PromosClient from './client'

export const dynamic = 'force-dynamic'

export default function PromosAdmin() {
  const events = allEvents().map(e => ({ id: e.id, title: e.title, disc: e.disc }))
  return <PromosClient initial={allPromos()} events={events} />
}
