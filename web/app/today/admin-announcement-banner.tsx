'use client'
import { C } from '@/components/ui'
import { timeAgoFa } from '@/lib/arena-ui'
import type { AnnouncementBanner } from '@/lib/today-snapshot'

export default function AdminAnnouncementBanner({ announcement }: { announcement?: AnnouncementBanner }) {
  if (!announcement) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, background: C.goldSoft, border: `1px solid ${C.gold}`, borderRadius: 13, padding: '12px 13px' }}>
      <span style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(245,166,35,.16)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
      </span>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.gold }}>اعلانِ برگزارکننده</span>
          <span style={{ fontSize: 10.5, color: C.tbody }}>{timeAgoFa(announcement.at)}</span>
        </div>
        <span style={{ fontSize: 13, color: C.thi, lineHeight: '20px' }}>{announcement.body || announcement.title}</span>
      </div>
    </div>
  )
}
