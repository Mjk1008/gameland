'use client'
import { useState } from 'react'
import { C, DISP } from '@/components/ui'
import { timeAgoFa } from '@/lib/arena-ui'
import { feedSentence } from '@/lib/feed-templates'
import type { FeedItem } from '@/lib/today-snapshot'

// A fixed, always-latest-8 board, not a paginate-to-everything list — this
// panel sits on صفحه‌ی امروز to give a quick pulse, not to be the full
// results history (there's no "see everything" here on purpose).
const SHOWN_COUNT = 8

// Cover image with a graceful fallback: `hasCover` can be stale (the row was
// built at a moment the blob existed, upload later removed) or the fetch can
// just fail — either way we never want the browser's broken-image glyph, so
// a load error flips this to the same title-initial tile the no-cover path
// already uses.
function CoverBadge({ compId, compTitle }: { compId: string; compTitle: string }) {
  const [broken, setBroken] = useState(false)
  if (broken) {
    return (
      <span style={{ width: 34, height: 34, borderRadius: 10, background: C.sf2, border: `1px solid ${C.line2}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISP, fontWeight: 700, fontSize: 14, color: C.thi, flexShrink: 0 }}>
        {compTitle[0]?.toUpperCase()}
      </span>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/competition-cover/${compId}`} alt="" onError={() => setBroken(true)}
      style={{ width: 34, height: 34, borderRadius: 10, objectFit: 'cover', border: `1px solid ${C.line2}`, flexShrink: 0 }} />
  )
}

export default function LiveFeed({ feed }: { feed: FeedItem[] }) {
  if (feed.length === 0) {
    return (
      <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, fontSize: 12, color: C.tmut, textAlign: 'center', padding: '18px 0' }}>هنوز نتیجه‌ای ثبت نشده</div>
    )
  }

  const shown = feed.slice(0, SHOWN_COUNT)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: '2px 12px' }}>
      {shown.map((f, i) => (
        <div key={f.matchId} style={{
          display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0',
          borderBottom: i < shown.length - 1 ? `1px solid ${C.sf2}` : 'none',
          animation: 'todayFeedIn .3s ease-out',
        }}>
          {/* competition badge — its cover when it has one, else a
              title-initial tile, instead of a bare player-initial letter */}
          {f.hasCover ? (
            <CoverBadge compId={f.compId} compTitle={f.compTitle} />
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
