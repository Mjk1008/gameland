'use client'
import { C, DISP } from '@/components/ui'
import {
  type Jalali, J_MONTHS, J_WEEKDAYS, faDigits,
  jalaliMonthLength, jalaliWeekday, todayJalali,
} from '@/lib/jalali'

export type DayPaint = { isEnd?: boolean; inRange?: boolean; isToday?: boolean }

const sel: React.CSSProperties = {
  flex: 1, minWidth: 0, minHeight: 36, borderRadius: 9, border: `1px solid ${C.line}`,
  background: C.sf2, color: C.thi, fontSize: 12, fontWeight: 700, padding: '0 8px',
  fontFamily: 'inherit', cursor: 'pointer',
}

export default function JalaliCalendarPanel({
  viewY, viewM, setViewY, setViewM,
  onPickDay, dayState, hint, footer,
  yearMin, yearMax,
}: {
  viewY: number; viewM: number
  setViewY: (y: number) => void; setViewM: (m: number) => void
  onPickDay: (d: number) => void
  dayState: (d: number) => DayPaint
  hint?: string
  footer?: React.ReactNode
  yearMin?: number; yearMax?: number
}) {
  const t = todayJalali()
  const y0 = yearMin ?? t.jy - 4
  const y1 = yearMax ?? t.jy + 3
  const years = Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i)

  const monthLen = jalaliMonthLength(viewY, viewM)
  const lead = jalaliWeekday(viewY, viewM, 1)
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: monthLen }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const cell: React.CSSProperties = {
    minHeight: 40, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: DISP, fontSize: 14, cursor: 'pointer',
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <select value={viewM} onChange={e => setViewM(+e.target.value)} style={sel} aria-label="ماه">
          {J_MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
        </select>
        <select value={viewY} onChange={e => setViewY(+e.target.value)} style={{ ...sel, flex: '0 0 auto', minWidth: 88 }} aria-label="سال">
          {years.map(y => <option key={y} value={y}>{faDigits(y)}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {J_WEEKDAYS.map(w => <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.tmut, padding: '4px 0' }}>{w}</div>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((d, i) => {
          if (d == null) return <div key={i} />
          const s = dayState(d)
          return (
            <button key={i} type="button" onClick={() => onPickDay(d)} style={{
              all: 'unset', ...cell, boxSizing: 'border-box',
              background: s.isEnd ? C.accent : s.inRange ? C.accentSoft : C.sf2,
              color: s.isEnd ? C.ink : s.inRange ? C.accent : C.thi,
              fontWeight: s.isEnd ? 800 : 600,
              border: s.isToday && !s.isEnd ? `1px solid ${C.accent}` : `1px solid ${C.line}`,
            }}>{faDigits(d)}</button>
          )
        })}
      </div>

      {footer}
      {hint && <div style={{ fontSize: 10.5, color: C.tmut, textAlign: 'center', marginTop: 8 }}>{hint}</div>}
    </>
  )
}

export function JalaliCalendarFooter({ onClear, onToday }: { onClear: () => void; onToday: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
      <button type="button" onClick={onClear}
        style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, fontSize: 12, fontWeight: 700, color: C.tbody, border: `1px solid ${C.line2}` }}>
        پاک کردن
      </button>
      <button type="button" onClick={onToday}
        style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, fontSize: 12, fontWeight: 700, color: C.accent, background: C.accentSoft }}>
        امروز
      </button>
    </div>
  )
}

export function jumpToToday(setViewY: (y: number) => void, setViewM: (m: number) => void) {
  const t = todayJalali()
  setViewY(t.jy); setViewM(t.jm)
}
