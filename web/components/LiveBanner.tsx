// Home-page rail of currently-live streams — cards link to /live/[id], which
// just embeds the broadcaster's Aparat player. Renders nothing when nothing
// is live, so this is invisible on every ordinary day.
import Link from 'next/link'
import { listLiveStreams } from '@/lib/live'
import { DISC, type Disc } from '@/lib/mock-data'

export default function LiveBanner() {
  const streams = listLiveStreams()
  if (!streams.length) return null

  return (
    <div className="gl-scroll animate-fade-up" style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '-4px -16px 0', padding: '4px 16px 2px' }}>
      {streams.map(s => (
        <Link
          key={s.id}
          href={`/live/${s.id}`}
          style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, width: 210, borderRadius: 14, border: '1px solid #E23B3B55', background: 'linear-gradient(150deg,#241214,#17110E)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start', background: 'rgba(226,59,59,.14)', border: '1px solid #E23B3B', color: '#FF6B6B', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 999 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF3B3B' }} /> زنده
          </span>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#F2EDE4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.eventTitle}</div>
          <div style={{ fontSize: 11, color: '#A89A88' }}>{DISC[s.disc as Disc]?.short ?? ''}</div>
        </Link>
      ))}
    </div>
  )
}
