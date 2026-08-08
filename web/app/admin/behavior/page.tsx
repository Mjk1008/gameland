import { allUsers, allRegistrations, allEvents, getUserById } from '@/lib/store'
import { ticketPriceFor } from '@/lib/ticket-price'
import { DISC } from '@/lib/mock-data'
import type { Disc } from '@/lib/mock-data'
import { BackHeader } from '@/components/ui'
import BehaviorContent, { type BehaviorBusiness } from './content'
import type { RegRec } from '../analytics/client'
import { parseBehaviorRange } from '@/lib/behavior-range'
import type { BehaviorView } from './view-tabs'

export const dynamic = 'force-dynamic'

function behaviorBusiness(regs: RegRec[], range: ReturnType<typeof parseBehaviorRange>, city: string, disc: string): BehaviorBusiness {
  const f = regs.filter(r =>
    r.at >= range.sinceMs && (range.untilMs ? r.at < range.untilMs : true)
    && (city === 'all' || r.city === city) && (disc === 'all' || r.disc === disc)
  )
  const pending = f.filter(r => r.status === 'pending').reduce((a, r) => a + r.tickets, 0)
  const approvedTickets = f.filter(r => r.status === 'approved').reduce((a, r) => a + r.tickets, 0)
  const revenue = f.filter(r => r.status === 'approved').reduce((a, r) => a + r.tickets * r.price, 0)
  return { pending, approvedTickets, revenueM: Math.round(revenue / 1_000_000) }
}

const VIEWS: BehaviorView[] = ['overview', 'funnel', 'retention', 'paths', 'raw']

export default function BehaviorPage({ searchParams }: { searchParams: { bdays?: string; bfrom?: string; bto?: string; bcity?: string; bdisc?: string; bview?: string } }) {
  const events = allEvents()
  const eventDisc = new Map(events.map(e => [e.id, e.disc]))

  const regs: RegRec[] = allRegistrations().map(r => {
    const u = getUserById(r.userId)
    return {
      uid: r.userId,
      compId: r.compId,
      comp: r.compId,
      disc: (eventDisc.get(r.compId) ?? u?.primaryDisc ?? 'fc26') as Disc,
      city: (u?.city || '').trim() || 'نامشخص',
      status: r.status,
      tickets: r.attempts,
      price: ticketPriceFor(r.compId).price,
      at: r.createdAt,
    }
  })

  const gamers = allUsers().filter(u => u.role === 'gamer')
  const cityOptions = Array.from(new Set([...regs.map(r => r.city), ...gamers.map(g => (g.city || '').trim())].filter(c => c && c !== 'نامشخص'))).sort((a, b) => a.localeCompare(b, 'fa'))
  const discOptions = (Object.keys(DISC) as Disc[]).map(d => ({ key: d, name: DISC[d].name }))

  const range = parseBehaviorRange(searchParams)
  const city = searchParams.bcity ?? 'all'
  const disc = searchParams.bdisc ?? 'all'
  const view = (VIEWS.includes(searchParams.bview as BehaviorView) ? searchParams.bview : 'overview') as BehaviorView

  return (
    <div className="animate-fade-up">
      <BackHeader title="بیلبورد داده" href="/admin" />
      <BehaviorContent range={range} view={view} city={city} disc={disc} cityOptions={cityOptions} discOptions={discOptions} business={behaviorBusiness(regs, range, city, disc)} />
    </div>
  )
}
