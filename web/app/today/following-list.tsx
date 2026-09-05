'use client'
import { C } from '@/components/ui'
import { GamerAvatar, DISP } from '@/components/ui'
import type { FollowingRow, HeroState } from '@/lib/today-snapshot'

function statusPill(hero: HeroState) {
  switch (hero.kind) {
    case 'playing': return { label: 'درحالِ بازی', color: C.live, bg: C.liveSoft, pulse: true }
    case 'ready': return { label: 'آماده', color: C.gold, bg: C.goldSoft, pulse: false }
    case 'advanced': return { label: 'صعود کرد', color: C.gold, bg: C.goldSoft, pulse: false }
    case 'eliminated': return { label: 'حذف شد', color: C.tbody, bg: C.sf2, pulse: false }
    case 'waiting': return { label: 'منتظر', color: C.tmut, bg: C.sf2, pulse: false }
    default: return null
  }
}

function matchIdOf(hero: HeroState): string | undefined {
  return hero.kind === 'none' || hero.kind === 'waiting' ? undefined : hero.matchId
}

export default function FollowingList({ rows, onOpenMatch }: { rows: FollowingRow[]; onOpenMatch: (matchId: string) => void }) {
  if (rows.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.thi }}>کسایی که فالو می‌کنی</span>
        <span style={{ fontSize: 11, color: C.tmut, fontFamily: DISP, letterSpacing: '.1em', fontWeight: 700 }}>FOLLOWING</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(r => {
          const pill = statusPill(r.hero)
          const matchId = matchIdOf(r.hero)
          return (
            <div key={r.uid} onClick={matchId ? () => onOpenMatch(matchId) : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 11, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '10px 12px', cursor: matchId ? 'pointer' : 'default' }}>
              <GamerAvatar uid={r.uid} tag={r.tag} hasPhoto={r.hasPhoto} size={36} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: C.thi }}>{r.name}</span>
                <span dir="ltr" style={{ fontSize: 10.5, color: C.tmut, fontFamily: DISP, letterSpacing: '.08em' }}>@{r.tag}</span>
              </div>
              {pill && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: pill.color, background: pill.bg, borderRadius: 999, padding: '5px 10px' }}>
                  {pill.pulse && <span style={{ width: 6, height: 6, borderRadius: '50%', background: pill.color }} />}
                  {pill.label}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
