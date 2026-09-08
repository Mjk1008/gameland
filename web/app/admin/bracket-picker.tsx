'use client'
import { useState } from 'react'
import Link from 'next/link'
import { C, Num, GameBadge } from '@/components/ui'

export interface PickerDisc {
  compId: string      // the Event (رشته) id — brackets live on the event
  title: string
  disc: string
  done: number
  total: number
}
export interface PickerGroup {
  key: string
  title: string
  date?: string
  discs: PickerDisc[]
  remaining: number   // matches still to play across the whole رویداد
}

// Drawn رویداد → its drawn رشته‌ها → that bracket. The old path to a bracket was
// مسابقات tab → scan a flat list of every event ever made → open the event page
// → find the link; this is the same trip in two taps, from the landing page,
// and it only ever lists brackets that actually exist.
export default function BracketPicker({ groups }: { groups: PickerGroup[] }) {
  // The first group is the one with matches left to play (server-sorted), so
  // for the common "we're running an event today" case the disciplines are
  // already on screen and reaching a bracket is a single tap.
  const [open, setOpen] = useState<string | null>(groups[0]?.key ?? null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {groups.map(g => {
        const on = open === g.key
        return (
          <div key={g.key} style={{ background: C.sf1, border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 14, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setOpen(o => (o === g.key ? null : g.key))}
              style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px' }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: g.remaining > 0 ? C.win : C.line2 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</span>
                <span className="gl-num" style={{ display: 'block', fontSize: 11, color: C.tmut, marginTop: 2 }}>
                  {g.discs.length} رشته{g.date ? ` · ${g.date}` : ''}
                </span>
              </span>
              <span style={{ color: C.tmut, fontSize: 12, flexShrink: 0 }}>{on ? '▲' : '▼'}</span>
            </button>

            {on && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '0 14px 14px' }}>
                {g.discs.map(d => (
                  <Link
                    key={d.compId}
                    href={`/competitions/${d.compId}/bracket`}
                    style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 11px', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11 }}
                  >
                    <GameBadge disc={d.disc} size={26} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</span>
                    <span className="gl-num" style={{ flexShrink: 0, fontSize: 11, color: d.done < d.total ? C.win : C.tmut }} dir="ltr">{d.done}/{d.total}</span>
                    <span style={{ color: C.tmut, flexShrink: 0 }}>›</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function BracketPickerHeader({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>براکت‌ها</span>
      <Num size={13} color={C.tmut}>{count}</Num>
    </div>
  )
}
