import { Suspense } from 'react'
import { allUsers, allRegistrations, allEvents, getUserById, referralLeaderboard } from '@/lib/store'
import { ticketPriceFor } from '@/lib/ticket-price'
import { DISC } from '@/lib/mock-data'
import type { Disc } from '@/lib/mock-data'
import { BackHeader } from '@/components/ui'
import HubTabs from '@/components/admin-tabs'
import AnalyticsClient, { type RegRec, type UserRec } from './client'
import BehaviorContent, { type BehaviorBusiness } from '../behavior/content'
import MonitorContent from '../ai/monitor-content'
import PromoterAnalyticsContent from './promoter-content'
import { parseBehaviorRange } from '@/lib/behavior-range'
import { promoterAnalyticsSnap } from '@/lib/promoter'
import type { BehaviorView } from '../behavior/view-tabs'

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

export default function AnalyticsHubPage({ searchParams }: { searchParams: { bdays?: string; bfrom?: string; bto?: string; bcity?: string; bdisc?: string; bview?: string } }) {
  const events = allEvents()
  const eventTitle = new Map(events.map(e => [e.id, e.title]))
  const eventDisc = new Map<string, Disc>(events.map(e => [e.id, e.disc]))

  const priceCache = new Map<string, number>()
  const priceForComp = (compId: string) => {
    if (!priceCache.has(compId)) priceCache.set(compId, ticketPriceFor(compId).price)
    return priceCache.get(compId)!
  }

  const regs: RegRec[] = allRegistrations().map(r => {
    const u = getUserById(r.userId)
    return {
      uid: r.userId,
      compId: r.compId,
      comp: eventTitle.get(r.compId) ?? 'مسابقهٔ حذف‌شده',
      disc: (eventDisc.get(r.compId) ?? u?.primaryDisc ?? 'fc26') as Disc,
      city: (u?.city || '').trim() || 'نامشخص',
      status: r.status,
      tickets: r.attempts,
      price: priceForComp(r.compId),
      at: r.createdAt,
    }
  })

  const gamers: UserRec[] = allUsers()
    .filter(u => u.role === 'gamer')
    .map(u => ({
      at: u.createdAt,
      city: (u.city || '').trim() || 'نامشخص',
      disc: (u.primaryDisc ?? null) as Disc | null,
    }))

  const discOptions = (Object.keys(DISC) as Disc[]).map(d => ({ key: d, name: DISC[d].name }))
  const cityOptions = Array.from(new Set([...regs.map(r => r.city), ...gamers.map(g => g.city)]))
    .filter(c => c !== 'نامشخص')
    .sort((a, b) => a.localeCompare(b, 'fa'))

  const us = allUsers()
  const referral = {
    invited: us.filter(u => u.referredBy).length,
    freeGranted: us.reduce((a, u) => a + (u.freeTickets ?? 0), 0) + allRegistrations().reduce((a, r) => a + (r.freeAttempts ?? 0), 0),
    top: referralLeaderboard(5),
  }

  const range = parseBehaviorRange(searchParams)
  const bcity = searchParams.bcity ?? 'all'
  const bdisc = searchParams.bdisc ?? 'all'
  const bview = (VIEWS.includes(searchParams.bview as BehaviorView) ? searchParams.bview : 'overview') as BehaviorView
  const business = behaviorBusiness(regs, range, bcity, bdisc)
  const promoterSnap = promoterAnalyticsSnap()

  return (
    <div className="animate-fade-up">
      <BackHeader title="آنالیتیکس" href="/admin" />
      <Suspense>
        <HubTabs tabs={[
          { key: 'behavior', label: 'بیلبورد', content: <BehaviorContent range={range} view={bview} city={bcity} disc={bdisc} cityOptions={cityOptions} discOptions={discOptions} business={business} /> },
          { key: 'business', label: 'کسب‌وکار', content: <AnalyticsClient regs={regs} gamers={gamers} discOptions={discOptions} cityOptions={cityOptions} referral={referral} showHeader={false} /> },
          { key: 'promoter', label: 'پروموتر', content: <PromoterAnalyticsContent snap={promoterSnap} /> },
          { key: 'ai', label: 'دستیار AI', content: <MonitorContent /> },
        ]} />
      </Suspense>
    </div>
  )
}
