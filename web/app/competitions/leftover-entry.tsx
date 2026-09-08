'use client'
import { useState } from 'react'
import Link from 'next/link'
import { C, GameBadge } from '@/components/ui'

export type LeftoverEvent = { id: string; disc: string; label: string }

type Tab = 'leftover' | 'bracket'

export default function LeftoverEntryBox({ events, bracketEvents }: { events: LeftoverEvent[]; bracketEvents: LeftoverEvent[] }) {
  const [tab, setTab] = useState<Tab | null>(null)
  if (events.length === 0 && bracketEvents.length === 0) return null

  const list = tab === 'bracket' ? bracketEvents : tab === 'leftover' ? events : []

  function toggle(t: Tab) {
    setTab(cur => cur === t ? null : t)
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {events.length > 0 && (
          <button type="button" onClick={() => toggle('leftover')} style={{
            all: 'unset', cursor: 'pointer', boxSizing: 'border-box', flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            minHeight: 64, borderRadius: 18,
            background: tab === 'leftover' ? 'linear-gradient(135deg, rgba(168,85,247,.32), rgba(245,200,75,.22))' : 'linear-gradient(135deg, rgba(168,85,247,.22), rgba(245,200,75,.16))',
            border: `1.5px solid ${C.accent}77`, color: C.thi, fontWeight: 800, fontSize: 17,
            boxShadow: '0 10px 28px -16px rgba(168,85,247,.55)',
          }}>
            بازماندگان
            <span style={{ fontSize: 12, color: C.accent, transform: tab === 'leftover' ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
          </button>
        )}
        {bracketEvents.length > 0 && (
          <button type="button" onClick={() => toggle('bracket')} style={{
            all: 'unset', cursor: 'pointer', boxSizing: 'border-box', flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            minHeight: 64, borderRadius: 18,
            background: tab === 'bracket' ? 'linear-gradient(135deg, rgba(245,200,75,.32), rgba(168,85,247,.22))' : 'linear-gradient(135deg, rgba(245,200,75,.16), rgba(168,85,247,.1))',
            border: `1.5px solid ${C.gold}77`, color: C.thi, fontWeight: 800, fontSize: 17,
            boxShadow: '0 10px 28px -16px rgba(245,200,75,.45)',
          }}>
            براکت‌ها
            <span style={{ fontSize: 12, color: C.gold, transform: tab === 'bracket' ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
          </button>
        )}
      </div>

      {tab && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10, padding: 14, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 16 }}>
          {list.map(e => (
            <Link key={e.id} href={tab === 'bracket' ? `/competitions/${e.id}/bracket` : `/competitions/${e.id}/register?leftover=1`}
              style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, width: 74 }}>
              <GameBadge disc={e.disc} size={58} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.thi, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 74 }}>{e.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
