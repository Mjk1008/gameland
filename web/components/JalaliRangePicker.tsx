'use client'
import { useState } from 'react'
import { C, DISP } from '@/components/ui'
import {
  type Jalali, J_MONTHS, J_WEEKDAYS, faDigits, formatJalaliRange,
  jalaliMonthLength, jalaliWeekday, jdn, todayJalali,
} from '@/lib/jalali'

// Self-contained Jalali date-RANGE picker (inline, mobile-first). Emits a Persian
// display string + the {from,to} range. No external calendar library.
export default function JalaliRangePicker({ value, onChange }: {
  value?: string
  onChange: (display: string, range: { from: Jalali; to?: Jalali }) => void
}) {
  const t = todayJalali()
  const [open, setOpen] = useState(false)
  const [viewY, setViewY] = useState(t.jy)
  const [viewM, setViewM] = useState(t.jm)
  const [from, setFrom] = useState<Jalali | null>(null)
  const [to, setTo] = useState<Jalali | null>(null)

  const monthLen = jalaliMonthLength(viewY, viewM)
  const lead = jalaliWeekday(viewY, viewM, 1)   // blanks before day 1
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: monthLen }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const stepMonth = (dir: 1 | -1) => {
    let m = viewM + dir, y = viewY
    if (m > 12) { m = 1; y += 1 } else if (m < 1) { m = 12; y -= 1 }
    setViewM(m); setViewY(y)
  }

  function pick(d: number) {
    const day: Jalali = { jy: viewY, jm: viewM, jd: d }
    if (!from || (from && to)) { setFrom(day); setTo(null); return }
    // second pick → order the range
    const a = jdn(from.jy, from.jm, from.jd), b = jdn(day.jy, day.jm, day.jd)
    const lo = b >= a ? from : day, hi = b >= a ? day : from
    setFrom(lo); setTo(hi)
    onChange(formatJalaliRange(lo, hi), { from: lo, to: hi })
    setOpen(false)
  }

  const dayState = (d: number) => {
    const cur = jdn(viewY, viewM, d)
    const f = from ? jdn(from.jy, from.jm, from.jd) : null
    const h = to ? jdn(to.jy, to.jm, to.jd) : null
    const isEnd = (f != null && cur === f) || (h != null && cur === h)
    const inRange = f != null && h != null && cur > f && cur < h
    const isToday = viewY === t.jy && viewM === t.jm && d === t.jd
    return { isEnd, inRange, isToday }
  }

  const cell: React.CSSProperties = { minHeight: 40, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISP, fontSize: 14, cursor: 'pointer' }

  return (
    <div>
      {/* trigger */}
      <button type="button" onClick={() => setOpen(o => !o)} style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', width: '100%', minHeight: 46, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', background: C.sf2, border: `1px solid ${open ? C.accent : C.line}`, borderRadius: 11 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.tmut} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
        <span style={{ flex: 1, fontSize: 14, color: value ? C.thi : C.tmut, textAlign: 'right' }}>{value || 'انتخاب تاریخ / بازه'}</span>
        <span style={{ color: C.tmut, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
      </button>

      {open && (
        <div style={{ marginTop: 8, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 12 }}>
          {/* header: month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={() => stepMonth(-1)} style={{ all: 'unset', cursor: 'pointer', width: 38, height: 38, borderRadius: 9, background: C.sf2, border: `1px solid ${C.line}`, color: C.tbody, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="ماه قبل">‹</button>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.thi }}>{J_MONTHS[viewM - 1]} {faDigits(viewY)}</span>
            <button type="button" onClick={() => stepMonth(1)} style={{ all: 'unset', cursor: 'pointer', width: 38, height: 38, borderRadius: 9, background: C.sf2, border: `1px solid ${C.line}`, color: C.tbody, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="ماه بعد">›</button>
          </div>

          {/* weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {J_WEEKDAYS.map(w => <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.tmut, padding: '4px 0' }}>{w}</div>)}
          </div>

          {/* day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {cells.map((d, i) => {
              if (d == null) return <div key={i} />
              const s = dayState(d)
              return (
                <button key={i} type="button" onClick={() => pick(d)} style={{
                  all: 'unset', ...cell, boxSizing: 'border-box',
                  background: s.isEnd ? C.accent : s.inRange ? C.accentSoft : C.sf2,
                  color: s.isEnd ? C.ink : s.inRange ? C.accent : C.thi,
                  fontWeight: s.isEnd ? 800 : 600,
                  border: s.isToday && !s.isEnd ? `1px solid ${C.accent}` : `1px solid ${C.line}`,
                }}>{faDigits(d)}</button>
              )
            })}
          </div>

          {/* quick actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
            <button type="button" onClick={() => { setFrom(null); setTo(null); onChange('', { from: t }) }} style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, fontSize: 12, fontWeight: 700, color: C.tbody, border: `1px solid ${C.line2}` }}>پاک کردن</button>
            <button type="button" onClick={() => { setViewY(t.jy); setViewM(t.jm) }} style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, fontSize: 12, fontWeight: 700, color: C.accent, background: C.accentSoft }}>امروز</button>
          </div>
          <div style={{ fontSize: 10.5, color: C.tmut, textAlign: 'center', marginTop: 8 }}>
            {from && !to ? 'حالا روزِ پایانِ بازه رو بزن (یا همون روز برای تک‌روز)' : 'روزِ شروع رو انتخاب کن'}
          </div>
        </div>
      )}
    </div>
  )
}
