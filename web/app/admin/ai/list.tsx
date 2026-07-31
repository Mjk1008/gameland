'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { C } from '@/components/ui'
import { faDigits } from '@/lib/jalali'

export interface AiUserRow { uid: string; name: string; tag: string; q: number; qToday: number; usd: number; flag: string | null }

const money = (usd: number) => (usd < 0.01 ? '<$0.01' : `$${usd.toFixed(2)}`)
const fa = (n: number) => faDigits(n)

// Full, unclipped, searchable/sortable list — the old version hardcoded
// .slice(0, 15), silently hiding anyone past #15. See docs/25-data-platform-spec.md.
export default function AiUserList({ rows }: { rows: AiUserRow[] }) {
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState<'usd' | 'q'>('usd')

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const filtered = needle
      ? rows.filter(r => r.name.toLowerCase().includes(needle) || r.tag.toLowerCase().includes(needle))
      : rows
    return [...filtered].sort((a, b) => sortBy === 'usd' ? b.usd - a.usd : b.q - a.q)
  }, [rows, q, sortBy])

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="جست‌وجو بر اساس نام یا تگ…"
          style={{ flex: 1, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '9px 12px', color: C.thi, fontSize: 12.5, outline: 'none' }} />
        <button onClick={() => setSortBy('usd')} style={sortBtn(sortBy === 'usd')}>هزینه</button>
        <button onClick={() => setSortBy('q')} style={sortBtn(sortBy === 'q')}>سوال</button>
      </div>

      {shown.length === 0 ? (
        <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: '12px 0' }}>
          {rows.length === 0 ? 'هنوز کسی با دستیار حرف نزده.' : 'چیزی با این جست‌وجو پیدا نشد.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 520, overflowY: 'auto' }}>
          {shown.map((t, i) => (
            <Link key={t.uid} href={`/admin/ai/${t.uid}`}
              style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 11, padding: '9px 10px', background: t.flag ? C.goldSoft : 'transparent', border: `1px solid ${t.flag ? C.gold + '55' : C.line}` }}>
              <span className="gl-num" style={{ width: 22, textAlign: 'center', fontWeight: 800, fontSize: 13, color: C.tmut }}>{fa(i + 1)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name} <span dir="ltr" style={{ fontSize: 10, color: C.tmut }}>@{t.tag}</span></span>
                {t.flag && <span style={{ display: 'block', fontSize: 10, color: C.gold, marginTop: 2 }}>⚠ {t.flag}</span>}
              </span>
              <span style={{ textAlign: 'center', flexShrink: 0 }}>
                <span className="gl-num" style={{ display: 'block', fontSize: 14, fontWeight: 800, color: C.thi }}>{fa(t.q)}</span>
                <span style={{ fontSize: 9, color: C.tmut }}>سوال</span>
              </span>
              <span dir="ltr" className="gl-num" style={{ fontSize: 11, color: C.tbody, minWidth: 46, textAlign: 'left', flexShrink: 0 }}>{money(t.usd)}</span>
              <span style={{ color: C.tmut, fontSize: 13 }}>‹</span>
            </Link>
          ))}
        </div>
      )}
      <div style={{ fontSize: 10, color: C.tmut, marginTop: 10, lineHeight: 1.9 }}>
        {fa(shown.length)} از {fa(rows.length)} کاربر · روی هر کاربر بزن تا مکالمه‌هاش رو ببینی.
      </div>
    </div>
  )
}

function sortBtn(on: boolean): React.CSSProperties {
  return { all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, padding: '9px 12px', borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}` }
}
