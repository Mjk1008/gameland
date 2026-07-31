import { Suspense } from 'react'
import { allUsers, allRegistrations, allEvents, getUserById, referralLeaderboard } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import type { Disc } from '@/lib/mock-data'
import { BackHeader } from '@/components/ui'
import HubTabs from '@/components/admin-tabs'
import AnalyticsClient, { type RegRec, type UserRec } from './client'
import BehaviorContent from '../behavior/content'
import MonitorContent from '../ai/monitor-content'

export const dynamic = 'force-dynamic'

// One admin hub for everything data-shaped: business outcomes (کسب‌وکار),
// behavioral funnel/journeys (رفتار کاربران), and AI usage (AI) — previously
// three separate tiles scattered in the tools grid. See docs/25-data-platform-spec.md.
export default function AnalyticsHubPage() {
  const events = allEvents()
  const eventTitle = new Map(events.map(e => [e.id, e.title]))
  const eventDisc = new Map<string, Disc>(events.map(e => [e.id, e.disc]))

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

  return (
    <div className="animate-fade-up">
      <BackHeader title="آنالیتیکس" href="/admin" />
      <Suspense>
        <HubTabs tabs={[
          { key: 'business', label: 'کسب‌وکار', content: <AnalyticsClient regs={regs} gamers={gamers} discOptions={discOptions} cityOptions={cityOptions} referral={referral} showHeader={false} /> },
          { key: 'behavior', label: 'رفتار کاربران', content: <BehaviorContent /> },
          { key: 'ai', label: 'دستیار AI', content: <MonitorContent /> },
        ]} />
      </Suspense>
    </div>
  )
}
