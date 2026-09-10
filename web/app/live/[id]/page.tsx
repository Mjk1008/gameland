// Watch page for one live stream — just a framed embed of the broadcaster's
// Aparat live player. Gameland never touches the video itself.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLiveStream } from '@/lib/live'
import { DISC, type Disc } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export default async function WatchLivePage({ params }: { params: { id: string } }) {
  const stream = getLiveStream(params.id)
  if (!stream) notFound()

  const discLabel = DISC[stream.disc as Disc]?.short

  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 30px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/" style={{ all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 10, background: '#1D1913', border: '1px solid #2A241C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9BFAF' }} aria-label="خانه">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF3B3B', flexShrink: 0 }} />
          <h1 style={{ fontSize: 15, fontWeight: 800, color: '#F2EDE4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stream.eventTitle}</h1>
        </div>
        {discLabel && <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 700, color: '#A89A88' }}>{discLabel}</span>}
      </div>

      <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 14, overflow: 'hidden', background: '#000' }}>
        <iframe
          src={stream.embedUrl}
          allow="autoplay; fullscreen"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      </div>
    </div>
  )
}
