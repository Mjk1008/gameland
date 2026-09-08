'use client'
import { useState } from 'react'
import { usePolling } from '@/components/use-polling'
import { Button } from '@/components/ui'
import type { TodaySnapshot } from '@/lib/today-snapshot'
import LivePulseBar from './live-pulse-bar'
import StoryBar from './story-bar'
import StoryViewer from './story-viewer'
import HeroCard from './hero-card'
import AnnouncementBoard from './announcement-board'
import LiveSection from './live-section'
import FollowingList from './following-list'
import MatchDetailSheet from './match-detail-sheet'

export default function TodayClient({ initial }: { initial: TodaySnapshot }) {
  // 8-10s live-feel polling with a hidden-tab backoff (per docs/35 §3),
  // beating the app's normal 30s notif-count cadence since this page is
  // meant to feel live.
  const { data } = usePolling<TodaySnapshot>('/api/today', { activeMs: 8000, initial })
  const snapshot = data ?? initial
  const [openMatchId, setOpenMatchId] = useState<string | null>(null)

  // The story viewer snapshots the list at open time (docs/37 §4.1) — a
  // background poll updating `snapshot.stories` mid-view must not shift the
  // index under the user, so we freeze our own copy here.
  const [viewerStories, setViewerStories] = useState<TodaySnapshot['stories'] | null>(null)
  const [viewerStart, setViewerStart] = useState(0)

  function openStoryAt(i: number) {
    setViewerStories(snapshot.stories)
    setViewerStart(i)
  }
  function closeViewer() { setViewerStories(null) }
  async function reportSeen(ids: string[]) {
    try { await fetch('/api/today/stories/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }) } catch {}
  }

  const hero = snapshot.hero
  const inCompetition = hero.kind !== 'none'
  const heroCompId = hero.kind !== 'none' ? hero.compId : undefined

  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <LivePulseBar live={snapshot.live} playingNow={snapshot.playingNow} />
      <StoryBar stories={snapshot.stories} onOpen={openStoryAt} />

      {inCompetition && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* No "next match" card once eliminated (nothing upcoming to
              show), but «مسیرِ من» stays below regardless — the final
              placement/path is still worth seeing (docs/37 §9.1 table).
              `hero.kind` is already narrowed to exclude 'none' here via
              TS's aliased-condition narrowing on `inCompetition` — an
              explicit `!== 'none'` check would be a no-overlap error. */}
          {hero.kind !== 'eliminated' && <HeroCard hero={hero} />}
          {heroCompId && <Button href={`/competitions/${heroCompId}/me`} kind="prestige">مسیرِ من ›</Button>}
        </div>
      )}

      <AnnouncementBoard items={snapshot.announcements} />
      <LiveSection liveEvents={snapshot.liveEvents} provincePulse={snapshot.provincePulse} feed={snapshot.feed} />
      <FollowingList rows={snapshot.following} onOpenMatch={setOpenMatchId} />

      {openMatchId && (
        <MatchDetailSheet matchId={openMatchId} onClose={() => setOpenMatchId(null)} />
      )}

      {viewerStories && (
        <StoryViewer stories={viewerStories} startIndex={viewerStart} onClose={closeViewer} onSeen={reportSeen} />
      )}
    </div>
  )
}
