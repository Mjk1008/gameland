'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TodaySnapshot } from '@/lib/today-snapshot'
import type { NewsSlide } from '../news-slider'
import HeroCard from './hero-card'
import AdminAnnouncementBanner from './admin-announcement-banner'
import TodayNewsRail from './today-news-rail'
import LiveFeed from './live-feed'
import ProvincePulseStrip from './province-pulse'
import FollowingList from './following-list'
import MatchDetailSheet from './match-detail-sheet'

export default function TodayClient({ initial, news }: { initial: TodaySnapshot; news: NewsSlide[] }) {
  const router = useRouter()
  const [snapshot, setSnapshot] = useState(initial)
  const [openMatchId, setOpenMatchId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    try {
      const res = await fetch('/api/today')
      if (res.ok) setSnapshot(await res.json())
    } catch {}
  }

  async function onAction(matchId: string, action: 'here' | 'ready' | 'ref') {
    setBusy(true)
    try {
      const res = await fetch('/api/today/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId, action }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'ثبت نشد')
      await refresh()
      router.refresh()
    } catch (e: any) { alert(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <HeroCard hero={snapshot.hero} onOpenMatch={setOpenMatchId} onAction={onAction} busy={busy} />
      <AdminAnnouncementBanner announcement={snapshot.announcement} />
      <TodayNewsRail items={news} />
      <LiveFeed feed={snapshot.feed} />
      <ProvincePulseStrip items={snapshot.provincePulse} />
      <FollowingList rows={snapshot.following} onOpenMatch={setOpenMatchId} />

      {openMatchId && (
        <MatchDetailSheet matchId={openMatchId} busy={busy} onAction={onAction} onClose={() => setOpenMatchId(null)} />
      )}
    </div>
  )
}
