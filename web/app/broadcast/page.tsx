// «پخاش» panel — server-gated. Anyone not on BROADCASTER_PHONES (or everyone,
// when the feature is switched off) gets a plain 404, same pattern as /arcade.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isBroadcaster, listLiveStreams } from '@/lib/live'
import { allEvents } from '@/lib/store'
import BroadcastForm from './client'

export const dynamic = 'force-dynamic'

export default async function BroadcastPage() {
  if (!(await isBroadcaster())) notFound()

  const ACTIVE = new Set(['live', 'open', 'soon'])
  const events = allEvents()
    .filter(e => ACTIVE.has(e.status))
    .map(e => ({ id: e.id, title: e.title, disc: e.disc }))
  const live = listLiveStreams().map(s => ({ id: s.id, eventTitle: s.eventTitle, startedAt: s.startedAt }))

  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 30px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/" style={{ all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 10, background: '#1D1913', border: '1px solid #2A241C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9BFAF' }} aria-label="خانه">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </Link>
        <h1 style={{ fontSize: 16, fontWeight: 800, color: '#F2EDE4' }}>پخش زنده</h1>
      </div>

      <BroadcastForm events={events} live={live} />
    </div>
  )
}
