'use client'
import { C, DISP } from '@/components/ui'
import { timeAgoFa } from '@/lib/arena-ui'
import type { AnnouncementItem } from '@/lib/today-snapshot'

// Historical, shared, text-only board (docs/37 §9.3) — replaces the old
// single-latest-for-3h AdminAnnouncementBanner, which read from each user's
// own notif inbox. Everyone sees the same list, newest first.
export default function AnnouncementBoard({ items }: { items: AnnouncementItem[] }) {
  if (items.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.thi }}>اعلانات</span>
        <span style={{ fontSize: 10, color: C.tmut, fontFamily: DISP, letterSpacing: '.1em', fontWeight: 700 }}>ANNOUNCEMENTS</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(a => (
          <div key={a.id} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 13, color: C.thi, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{a.text}</span>
            <span style={{ fontSize: 10.5, color: C.tmut }}>{timeAgoFa(a.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
