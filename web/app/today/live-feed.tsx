'use client'
import { useState } from 'react'
import { C, DISP } from '@/components/ui'
import { timeAgoFa } from '@/lib/arena-ui'
import { feedSentence } from '@/lib/feed-templates'
import type { FeedItem } from '@/lib/today-snapshot'

const INITIAL_COUNT = 5
const PAGE_SIZE = 20

export default function LiveFeed({ feed }: { feed: FeedItem[] }) {
  const [visible, setVisible] = useState(INITIAL_COUNT)
  if (feed.length === 0) return <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: '14px 0' }}>هنوز نتیجه‌ای ثبت نشده</div>

  const shown = feed.slice(0, visible)
  const expanded = visible > INITIAL_COUNT

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {shown.map((f, i) => (
        <div key={f.matchId} style={{
          display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0',
          borderBottom: i < shown.length - 1 ? `1px solid ${C.sf2}` : 'none',
          animation: 'todayFeedIn .3s ease-out',
        }}>
          {/* competition badge — its cover when it has one, else a
              title-initial tile, instead of a bare player-initial letter */}
          {f.hasCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/competition-cover/${f.compId}`} alt="" style={{ width: 34, height: 34, borderRadius: 10, objectFit: 'cover', border: `1px solid ${C.line2}`, flexShrink: 0 }} />
          ) : (
            <span style={{ width: 34, height: 34, borderRadius: 10, background: C.sf2, border: `1px solid ${C.line2}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISP, fontWeight: 700, fontSize: 14, color: C.thi, flexShrink: 0 }}>
              {f.compTitle[0]?.toUpperCase()}
            </span>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: C.accent, background: C.accentSoft, alignSelf: 'flex-start', borderRadius: 6, padding: '2px 7px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{f.compTitle}</span>
            {/* <bdi> isolates each name's own script direction without
                disturbing the Persian sentence around it. */}
            <span style={{ fontSize: 13, color: C.thi, lineHeight: '19px' }}>
              {sentenceParts(f).map((part, j) => typeof part === 'string'
                ? <span key={j}>{part}</span>
                : <b key={j} style={{ fontWeight: 700 }}><bdi>{part.name}</bdi></b>)}
              {f.score ? ` (${f.score})` : ''}
            </span>
            <span style={{ fontSize: 10.5, color: C.tmut }}>{f.bracketLabel} · {timeAgoFa(f.completedAt)}</span>
          </div>
        </div>
      ))}

      {(feed.length > INITIAL_COUNT || expanded) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {visible < feed.length && (
            <button onClick={() => setVisible(v => Math.min(feed.length, v + PAGE_SIZE))} style={{
              all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 10,
              background: C.sf2, border: `1px solid ${C.line}`, color: C.tbody, fontWeight: 700, fontSize: 12,
            }}>
              {Math.min(PAGE_SIZE, feed.length - visible)} تای بعدی
            </button>
          )}
          {expanded && (
            <button onClick={() => setVisible(INITIAL_COUNT)} style={{
              all: 'unset', cursor: 'pointer', flex: visible < feed.length ? 'none' : 1, textAlign: 'center', padding: '9px 14px', borderRadius: 10,
              background: 'transparent', border: `1px solid ${C.line}`, color: C.tmut, fontWeight: 700, fontSize: 12,
            }}>
              بستن
            </button>
          )}
        </div>
      )}

      <style>{'@keyframes todayFeedIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }'}</style>
    </div>
  )
}

// Splits the templated sentence into plain-text / player-name parts so each
// name gets its own <bdi> without re-parsing the sentence in JSX above.
function sentenceParts(f: FeedItem): (string | { name: string })[] {
  const sentence = feedSentence(f.matchId, f.winnerName, f.loserName)
  const idxW = sentence.indexOf(f.winnerName)
  const idxL = sentence.indexOf(f.loserName)
  if (idxW === -1 || idxL === -1) return [sentence]
  const parts: (string | { name: string })[] = []
  const points = [
    { at: idxW, len: f.winnerName.length, name: f.winnerName },
    { at: idxL, len: f.loserName.length, name: f.loserName },
  ].sort((a, b) => a.at - b.at)
  let cursor = 0
  for (const p of points) {
    if (p.at > cursor) parts.push(sentence.slice(cursor, p.at))
    parts.push({ name: p.name })
    cursor = p.at + p.len
  }
  if (cursor < sentence.length) parts.push(sentence.slice(cursor))
  return parts
}
