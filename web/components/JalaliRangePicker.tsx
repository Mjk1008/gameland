'use client'
import { useState } from 'react'
import { C } from '@/components/ui'
import JalaliCalendarPanel, { JalaliCalendarFooter, jumpToToday } from '@/components/JalaliCalendarPanel'
import {
  type Jalali, faDigits, formatJalaliRange,
  jdn, todayJalali,
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

  function pick(d: number) {
    const day: Jalali = { jy: viewY, jm: viewM, jd: d }
    if (!from || (from && to)) { setFrom(day); setTo(null); return }
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

  const hint = from && !to
    ? 'حالا روزِ پایانِ بازه رو بزن (یا همون روز برای تک‌روز)'
    : 'روزِ شروع رو انتخاب کن'

  return (
    <div>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', width: '100%', minHeight: 46, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', background: C.sf2, border: `1px solid ${open ? C.accent : C.line}`, borderRadius: 11 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.tmut} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
        <span style={{ flex: 1, fontSize: 14, color: value ? C.thi : C.tmut, textAlign: 'right' }}>{value || 'انتخاب تاریخ / بازه'}</span>
        <span style={{ color: C.tmut, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
      </button>

      {open && (
        <div style={{ marginTop: 8, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 12 }}>
          <JalaliCalendarPanel
            viewY={viewY} viewM={viewM} setViewY={setViewY} setViewM={setViewM}
            onPickDay={pick} dayState={dayState} hint={hint}
            yearMin={t.jy - 1} yearMax={t.jy + 5}
            footer={
              <JalaliCalendarFooter
                onClear={() => { setFrom(null); setTo(null); onChange('', { from: t }) }}
                onToday={() => jumpToToday(setViewY, setViewM)}
              />
            }
          />
        </div>
      )}
    </div>
  )
}
