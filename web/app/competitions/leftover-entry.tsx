'use client'
import { useState } from 'react'
import Link from 'next/link'
import { C, GameBadge } from '@/components/ui'

export type LeftoverEvent = { id: string; disc: string; label: string }

export default function LeftoverEntryBox({ events }: { events: LeftoverEvent[] }) {
  const [open, setOpen] = useState(false)
  if (events.length === 0) return null

  return (
    <div style={{ marginBottom: 14 }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        minHeight: 64, borderRadius: 18,
        background: 'linear-gradient(135deg, rgba(168,85,247,.22), rgba(245,200,75,.16))',
        border: `1.5px solid ${C.accent}77`, color: C.thi, fontWeight: 800, fontSize: 17,
        boxShadow: '0 10px 28px -16px rgba(168,85,247,.55)',
      }}>
        بازماندگان
        <span style={{ fontSize: 12, color: C.accent, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
      </button>

      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10, padding: 14, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 16 }}>
          {events.map(e => (
            <Link key={e.id} href={`/competitions/${e.id}/register?leftover=1`}
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
