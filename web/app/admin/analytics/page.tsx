import { Suspense } from 'react'
import { allUsers, allRegistrations, allEvents, getUserById, getEventConfig, referralLeaderboard, isTeamPartnerReg } from '@/lib/store'
import { disciplineDisplayName, normalizeTeamSize } from '@/lib/discipline-format'
import { ticketPriceFor } from '@/lib/ticket-price'
import { DISC } from '@/lib/mock-data'
import type { Disc } from '@/lib/mock-data'
import { BackHeader } from '@/components/ui'
import HubTabs from '@/components/admin-tabs'
import AnalyticsClient, { type RegRec, type UserRec } from './client'
import GamersContent, { type GamerListRec } from './gamers-content'
import BehaviorContent, { type BehaviorBusiness } from '../behavior/content'
import MonitorContent from '../ai/monitor-content'
import PromoterAnalyticsContent from './promoter-content'
import { parseBehaviorRange } from '@/lib/behavior-range'
import { promoterAnalyticsSnap } from '@/lib/promoter'
import { resolveProvince } from '@/lib/iran-geo'
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

export default function AnalyticsHubPage({ searchParams }: { searchParams: { bdays?: string; bfrom?: string; bto?: string; bcity?: string; bdisc?: string; bview?: string; tab?: string } }) {
  const events = allEvents()
  const eventTitle = new Map(events.map(e => [e.id, e.title]))
  const eventDisc = new Map<string, Disc>(events.map(e => [e.id, e.disc]))

  const priceCache = new Map<string, number>()
  const priceForComp = (compId: string) => {
    if (!priceCache.has(compId)) priceCache.set(compId, ticketPriceFor(compId).price)
    return priceCache.get(compId)!
  }

  const regs: RegRec[] = allRegistrations().filter(r => !isTeamPartnerReg(r)).map(r => {
    const u = getUserById(r.userId)
    const city = (u?.city || '').trim() || 'نامشخص'
    return {
      uid: r.userId,
      compId: r.compId,
      comp: eventTitle.get(r.compId) ?? 'مسابقهٔ حذف‌شده',
      disc: (eventDisc.get(r.compId) ?? u?.primaryDisc ?? 'fc26') as Disc,
      city,
      province: resolveProvince(u?.province, city === 'نامشخص' ? '' : city),
      status: r.status,
      tickets: r.attempts,
      price: priceForComp(r.compId),
      at: r.createdAt,
    }
  })

  const gamers: UserRec[] = allUsers()
    .filter(u => u.role === 'gamer')
    .map(u => {
      const city = (u.city || '').trim() || 'نامشخص'
      return {
        at: u.createdAt,
        city,
        province: resolveProvince(u.province, city === 'نامشخص' ? '' : city),
        disc: (u.primaryDisc ?? null) as Disc | null,
      }
    })

  const gamerListById = new Map<string, GamerListRec>()
  for (const r of allRegistrations()) {
    const u = getUserById(r.userId)
    if (!u || u.deletedAt) continue
    const city = (u.city || '').trim() || 'نامشخص'
    let g = gamerListById.get(u.id)
    if (!g) {
      g = {
        id: u.id,
        name: u.name,
        tag: u.tag,
        phone: u.phone ?? '',
        city,
        province: resolveProvince(u.province, city === 'نامشخص' ? '' : city),
        regs: [],
      }
      gamerListById.set(u.id, g)
    }
    g.regs.push({
      event: eventTitle.get(r.compId) ?? 'مسابقهٔ حذف‌شده',
      disc: (eventDisc.get(r.compId) ?? u.primaryDisc ?? 'fc26') as Disc,
      teamSize: normalizeTeamSize(getEventConfig(r.compId).teamSize),
      status: r.status as GamerListRec['regs'][number]['status'],
      tickets: r.attempts,
    })
  }
  const gamerList = Array.from(gamerListById.values())

  const discOptions = (Object.keys(DISC) as Disc[]).map(d => ({ key: d, name: DISC[d].name }))
  const slotSeen = new Map<string, { key: string; name: string; disc: Disc }>()
  for (const e of events) {
    const teamSize = normalizeTeamSize(getEventConfig(e.id).teamSize)
    const key = `${e.disc}:${teamSize}`
    if (!slotSeen.has(key)) {
      slotSeen.set(key, {
        key,
        disc: e.disc,
        name: disciplineDisplayName(DISC[e.disc]?.name ?? e.disc, teamSize),
      })
    }
  }
  const discSlotOptions = Array.from(slotSeen.values()).sort((a, b) => a.name.localeCompare(b.name, 'fa') || a.key.localeCompare(b.key))
  const cityOptions = Array.from(new Set([...regs.map(r => r.city), ...gamers.map(g => g.city)]))
    .filter(c => c !== 'نامشخص')
    .sort((a, b) => a.localeCompare(b, 'fa'))
  const provinceOptions = Array.from(new Set([...regs.map(r => r.province), ...gamers.map(g => g.province)]))
    .filter(p => p !== 'نامشخص')
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
          { key: 'business', label: 'کسب‌وکار', content: <AnalyticsClient regs={regs} gamers={gamers} discOptions={discOptions} cityOptions={cityOptions} provinceOptions={provinceOptions} referral={referral} showHeader={false} /> },
          { key: 'gamers', label: 'گیمرها', content: <GamersContent players={gamerList} discOptions={discSlotOptions} cityOptions={cityOptions} provinceOptions={provinceOptions} /> },
          { key: 'promoter', label: 'پروموتر', content: <PromoterAnalyticsContent snap={promoterSnap} /> },
          { key: 'ai', label: 'دستیار AI', content: <MonitorContent /> },
        ]} />
      </Suspense>
    </div>
  )
}
