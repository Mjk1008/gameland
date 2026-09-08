'use client'
import { useState } from 'react'
import { C, DISP } from '@/components/ui'
import { timeAgoFa } from '@/lib/arena-ui'
import type { AnnouncementItem } from '@/lib/today-snapshot'

const COLLAPSED_COUNT = 3

// Historical, shared, text-only board (docs/37 §9.3) — replaces the old
// single-latest-for-3h AdminAnnouncementBanner, which read from each user's
// own notif inbox. Everyone sees the same list, newest first.
//
// Kept deliberately small: each row is a title only until tapped open (a
// long announcement used to take over the whole صفحه‌ی امروز by itself), and
// the board itself shows the latest few with a single "بیشتر" to reveal
// the rest — the board, not the page, is the scroll surface.
export default function AnnouncementBoard({ items }: { items: AnnouncementItem[] }) {
  const [expanded, setExpanded] = useState(false)
  if (items.length === 0) return null

  const shown = expanded ? items : items.slice(0, COLLAPSED_COUNT)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.thi }}>اعلانات</span>
        <span style={{ fontSize: 10, color: C.tmut, fontFamily: DISP, letterSpacing: '.1em', fontWeight: 700 }}>ANNOUNCEMENTS</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 6 }}>
        {shown.map((a, i) => (
          <AnnouncementRow key={a.id} item={a} last={i === shown.length - 1} />
        ))}
        {items.length > COLLAPSED_COUNT && (
          <button type="button" onClick={() => setExpanded(v => !v)} style={{
            all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '8px 0 4px', fontSize: 11.5, fontWeight: 700, color: C.accent,
          }}>
            {expanded ? 'بستن' : `${items.length - COLLAPSED_COUNT} تای دیگه`}
          </button>
        )}
      </div>
    </div>
  )
}

function AnnouncementRow({ item, last }: { item: AnnouncementItem; last: boolean }) {
  const [open, setOpen] = useState(false)
  const hasBody = !!item.body
  return (
    <div style={{ padding: '7px 7px', borderBottom: last ? 'none' : `1px solid ${C.sf2}` }}>
      <button type="button" onClick={() => hasBody && setOpen(o => !o)} style={{
        all: 'unset', cursor: hasBody ? 'pointer' : 'default', display: 'flex', width: '100%', boxSizing: 'border-box',
        alignItems: 'center', gap: 8,
      }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
        <span style={{ fontSize: 10.5, color: C.tmut, flexShrink: 0 }}>{timeAgoFa(item.createdAt)}</span>
        {hasBody && (
          <span style={{ fontSize: 10, color: C.accent, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
        )}
      </button>
      {hasBody && open && (
        <div style={{ fontSize: 12.5, color: C.tbody, lineHeight: 1.8, whiteSpace: 'pre-wrap', marginTop: 6 }}>{item.body}</div>
      )}
    </div>
  )
}
