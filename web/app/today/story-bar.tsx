'use client'
import { C } from '@/components/ui'
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
          <span style={{
            display: 'flex', width: 60, height: 60, borderRadius: '50%', padding: 2, alignItems: 'center', justifyContent: 'center',
            background: s.seen ? C.line2 : `linear-gradient(135deg, ${C.gold}, ${C.accent})`,
          }}>
            <span style={{ display: 'block', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${C.sf1}`, background: C.sf2 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/story-media/${s.id}/thumb`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
