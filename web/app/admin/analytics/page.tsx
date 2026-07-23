import { allUsers, allRegistrations, allEvents, getUserById, referralLeaderboard } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import type { Disc } from '@/lib/mock-data'
import AnalyticsClient, { type RegRec, type UserRec } from './client'

export const dynamic = 'force-dynamic'

export default function AnalyticsPage() {
  const events = allEvents()
  const eventTitle = new Map(events.map(e => [e.id, e.title]))
  const eventDisc = new Map<string, Disc>(events.map(e => [e.id, e.disc]))

  // One record per registration, denormalised with the dimensions we slice by.
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

  // Gamers only (admins excluded) — the population behind "چند گیمر داریم".
  const gamers: UserRec[] = allUsers()
    .filter(u => u.role === 'gamer')
    .map(u => ({
      at: u.createdAt,
      city: (u.city || '').trim() || 'نامشخص',
      disc: (u.primaryDisc ?? null) as Disc | null,
    }))

  // Filter option lists.
  const discOptions = (Object.keys(DISC) as Disc[]).map(d => ({ key: d, name: DISC[d].name }))
  const cityOptions = Array.from(new Set([...regs.map(r => r.city), ...gamers.map(g => g.city)]))
    .filter(c => c !== 'نامشخص')
    .sort((a, b) => a.localeCompare(b, 'fa'))

  // referral campaign snapshot (unfiltered — campaign-wide truth)
  const us = allUsers()
  const referral = {
    invited: us.filter(u => u.referredBy).length,
    freeGranted: us.reduce((a, u) => a + (u.freeTickets ?? 0), 0) + allRegistrations().reduce((a, r) => a + (r.freeAttempts ?? 0), 0),
    top: referralLeaderboard(5),
  }

  return <AnalyticsClient regs={regs} gamers={gamers} discOptions={discOptions} cityOptions={cityOptions} referral={referral} />
}
