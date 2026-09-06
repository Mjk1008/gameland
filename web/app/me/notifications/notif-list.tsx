'use client'
import { useState } from 'react'
import { C } from '@/components/ui'

interface NotifRow { id: string; type: string; title: string; body: string; createdAt: number; read: boolean }

const TYPE_META: Record<string, { color: string; label: string }> = {
  registration: { color: C.win,  label: 'ثبت‌نام' },
  draw:         { color: C.accent, label: 'قرعه‌کشی' },
  match_ready:  { color: C.gold,  label: 'بازی' },
  result:       { color: C.info,  label: 'نتیجه' },
  advance:      { color: C.win,   label: 'صعود' },
  announcement: { color: C.tbody, label: 'اطلاعیه' },
}

const COMPACT_COUNT = 3

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'الان'
  if (m < 60) return `${m} دقیقه پیش`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ساعت پیش`
  return `${Math.floor(h / 24)} روز پیش`
}

function Row({ n }: { n: NotifRow }) {
  const meta = TYPE_META[n.type] ?? { color: C.tbody, label: 'اعلان' }
  return (
    <div style={{ position: 'relative', display: 'flex', gap: 11, padding: '12px 14px', background: n.read ? C.sf1 : C.sf2, border: `1px solid ${n.read ? C.line : meta.color + '55'}`, borderRadius: 12, overflow: 'hidden' }}>
      {!n.read && <span style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 3, background: meta.color }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: meta.color + '1f', padding: '2px 8px', borderRadius: 6 }}>{meta.label}</span>
          {!n.read && <span style={{ fontSize: 10, color: meta.color }}>جدید</span>}
        </div>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: C.thi }}>{n.title}</div>
        <div style={{ fontSize: 12.5, color: C.tbody, marginTop: 3, lineHeight: 1.8 }}>{n.body}</div>
        <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 6 }}>{relativeTime(n.createdAt)}</div>
      </div>
    </div>
  )
}

// Ten notifications from one broadcast used to pile up as ten identical-
// looking cards. The newest few stay front and center; the rest sit behind
// one toggle instead of a long identical scroll.
export default function NotifList({ list }: { list: NotifRow[] }) {
  const [expanded, setExpanded] = useState(false)
  const head = list.slice(0, COMPACT_COUNT)
  const rest = list.slice(COMPACT_COUNT)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {head.map(n => <Row key={n.id} n={n} />)}

      {rest.length > 0 && (
        <>
          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rest.map(n => <Row key={n.id} n={n} />)}
            </div>
          )}
          <button onClick={() => setExpanded(v => !v)} style={{
            all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '10px 0', borderRadius: 11,
            background: C.sf1, border: `1px solid ${C.line}`, color: C.tbody, fontWeight: 700, fontSize: 12.5,
          }}>
            {expanded ? 'بستن' : `${rest.length} اعلانِ دیگر ›`}
          </button>
        </>
      )}
    </div>
  )
}
