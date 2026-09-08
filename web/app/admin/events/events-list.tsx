'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { C, StatusChip, GameBadge, STATUS } from '@/components/ui'

export interface EventRow {
  id: string
  title: string
  disc: string
  discName: string
  status: string
  parentTitle?: string
  prize: number
  seats: number
  drawn: boolean
}

const PAGE_SIZE = 20
// Same four states the list actually contains, in the order an admin works
// through a season. Labels come from the StatusChip map, never re-typed.
const FILTERS = ['live', 'open', 'soon', 'done'] as const

export default function EventsList({ rows }: { rows: EventRow[] }) {
  // A season's worth of رشته‌ها rendered as one unbounded column was the
  // "hours of scrolling" — the list is already newest-first from the store,
  // so narrowing it is all that was missing.
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [visible, setVisible] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter(r => {
      if (status && r.status !== status) return false
      if (!needle) return true
      return [r.title, r.parentTitle, r.discName, r.disc].some(x => (x ?? '').toLowerCase().includes(needle))
    })
  }, [rows, q, status])

  const shown = filtered.slice(0, visible)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ position: 'relative' }}>
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setVisible(PAGE_SIZE) }}
          placeholder="جستجوی مسابقه…"
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, fontWeight: 600, color: C.thi, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, outline: 'none', padding: '10px 12px' }}
        />
        {q !== '' && (
          <button type="button" onClick={() => { setQ(''); setVisible(PAGE_SIZE) }} aria-label="پاک کردن جستجو" style={{ all: 'unset', cursor: 'pointer', position: 'absolute', insetInlineStart: 8, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: C.tmut, fontSize: 16, lineHeight: 1 }}>×</button>
        )}
      </div>

      <div className="gl-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
        {FILTERS.map(s => {
          const on = status === s
          return (
            <button key={s} type="button" onClick={() => { setStatus(on ? null : s); setVisible(PAGE_SIZE) }} style={{
              all: 'unset', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', fontSize: 11.5, fontWeight: 700,
              padding: '6px 11px', borderRadius: 999,
              color: on ? C.ink : C.tbody, background: on ? C.accent : C.sf1, border: `1px solid ${on ? C.accent : C.line2}`,
            }}>
              {STATUS[s]?.label ?? s}
            </button>
          )
        })}
      </div>

      {shown.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.tmut, textAlign: 'center', padding: '18px 0' }}>چیزی پیدا نشد</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {shown.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
              <Link href={`/admin/events/${c.id}`} style={{ all: 'unset', cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', background: C.sf1, border: `1px solid ${c.parentTitle ? C.accent + '33' : C.line}`, borderRadius: 13, minWidth: 0 }}>
                <GameBadge disc={c.disc} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                  <div className="gl-num" style={{ fontSize: 11, color: C.tmut, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.parentTitle ?? 'مستقل'} · {c.prize}M · {c.seats} نفر
                  </div>
                </div>
                <StatusChip status={c.status} />
              </Link>
              {/* The bracket had no route out of the admin panel at all — an
                  admin who lives in the tree view had to leave for the public
                  competition pages and find it there. */}
              {c.drawn && (
                <Link href={`/competitions/${c.id}/bracket`} style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 12px', background: C.accentSoft, border: `1px solid ${C.accent}`, borderRadius: 13, color: C.accent, fontSize: 12, fontWeight: 700 }}>
                  براکت
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {filtered.length > visible && (
        <button type="button" onClick={() => setVisible(v => v + PAGE_SIZE)} style={{
          all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '10px 0', borderRadius: 10,
          background: C.sf2, border: `1px solid ${C.line}`, color: C.tbody, fontWeight: 700, fontSize: 12,
        }}>
          {Math.min(PAGE_SIZE, filtered.length - visible)} تای بعدی ({filtered.length - visible} مونده)
        </button>
      )}
    </div>
  )
}
