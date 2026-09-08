'use client'
import { C } from '@/components/ui'
import ImgWithFallback from '@/components/img-fallback'
import type { StoryItem } from '@/lib/today-snapshot'

// Ring bar — newest-first (docs/37 §4.2/§9.6), color carries seen/unseen,
// tap opens the viewer starting at that exact story. Absent entirely when
// there are no active stories (no empty placeholder, matches IG).
export default function StoryBar({ stories, onOpen }: { stories: StoryItem[]; onOpen: (index: number) => void }) {
  if (stories.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 2, direction: 'ltr' }}>
      {stories.map((s, i) => (
        <button key={s.id} type="button" onClick={() => onOpen(i)}
          style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, width: 60, height: 60 }}>
          <span className={s.seen ? undefined : 'gl-story-ring'} style={{
            display: 'flex', width: 60, height: 60, borderRadius: '50%', padding: 2, alignItems: 'center', justifyContent: 'center',
            background: s.seen ? C.line2 : `conic-gradient(from 0deg, ${C.gold}, ${C.accent}, ${C.gold})`,
          }}>
            <span style={{ display: 'block', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${C.sf1}`, background: C.sf2 }}>
              <ImgWithFallback src={`/api/story-media/${s.id}/thumb`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} fallback={null} />
            </span>
          </span>
        </button>
      ))}
      <style>{`
        @keyframes glStoryRingSpin { to { transform: rotate(360deg) } }
        .gl-story-ring { animation: glStoryRingSpin 3.5s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .gl-story-ring { animation: none; } }
      `}</style>
    </div>
  )
}
