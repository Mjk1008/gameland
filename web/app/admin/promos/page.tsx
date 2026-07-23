import { allPromos, allEvents } from '@/lib/store'
import PromosClient from './client'

export const dynamic = 'force-dynamic'

export default function PromosAdmin() {
  const events = allEvents().map(e => ({ id: e.id, title: e.title, disc: e.disc }))
  // previews go through /api/promo/[id] — passing raw base64 made this page's
  // payload several MB
  const initial = allPromos().map(p => ({ ...p, imageData: p.imageData.startsWith('data:') ? `/api/promo/${p.id}` : p.imageData }))
  return <PromosClient initial={initial} events={events} />
}
