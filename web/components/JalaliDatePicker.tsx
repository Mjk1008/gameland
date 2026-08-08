'use client'
import { useEffect, useState } from 'react'
import { C } from '@/components/ui'
import JalaliCalendarPanel, { JalaliCalendarFooter, jumpToToday } from '@/components/JalaliCalendarPanel'
import {
  type Jalali, formatJalali, isoToJalali, jalaliToIso, jdn, todayJalali,
} from '@/lib/jalali'

// Single Jalali date — dropdown calendar with month/year selects.
// Emits ISO (YYYY-MM-DD) for filters + Persian display string for free-text fields.
export default function JalaliDatePicker({
  valueIso = '', valueDisplay = '', onChange, placeholder = 'انتخاب تاریخ',
  compact = false, yearMin, yearMax,
}: {
  valueIso?: string
  valueDisplay?: string
  onChange: (display: string, jalali: Jalali, iso: string) => void
  placeholder?: string
  compact?: boolean
  yearMin?: number; yearMax?: number
}) {
  const t = todayJalali()
  const init = valueIso ? isoToJalali(valueIso) : null
  const [open, setOpen] = useState(false)
  const [viewY, setViewY] = useState(init?.jy ?? t.jy)
  const [viewM, setViewM] = useState(init?.jm ?? t.jm)
  const [selected, setSelected] = useState<Jalali | null>(init)

  useEffect(() => {
    const j = valueIso ? isoToJalali(valueIso) : null
    setSelected(j)
    if (j) { setViewY(j.jy); setViewM(j.jm) }
  }, [valueIso])

  const label = valueDisplay || (selected ? formatJalali(selected) : '')

  function pick(d: number) {
    const day: Jalali = { jy: viewY, jm: viewM, jd: d }
    setSelected(day)
    onChange(formatJalali(day), day, jalaliToIso(day))
    setOpen(false)
  }

  const dayState = (d: number) => {
    const cur = jdn(viewY, viewM, d)
    const sel = selected ? jdn(selected.jy, selected.jm, selected.jd) : null
    return {
      isEnd: sel != null && cur === sel,
      isToday: viewY === t.jy && viewM === t.jm && d === t.jd,
    }
  }

  const h = compact ? 36 : 46
  const fs = compact ? 11 : 14

  return (
    <div>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        all: 'unset', boxSizing: 'border-box', cursor: 'pointer', width: '100%', minHeight: h,
        display: 'flex', alignItems: 'center', gap: compact ? 6 : 10, padding: compact ? '0 10px' : '0 14px',
        background: C.sf2, border: `1px solid ${open ? C.accent : C.line}`, borderRadius: compact ? 8 : 11,
      }}>
        {!compact && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.tmut} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
        )}
        <span style={{ flex: 1, fontSize: fs, color: label ? C.thi : C.tmut, textAlign: 'right' }}>{label || placeholder}</span>
        <span style={{ color: C.tmut, fontSize: compact ? 10 : 12, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
      </button>

      {open && (
        <div style={{ marginTop: 6, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: compact ? 10 : 14, padding: compact ? 10 : 12 }}>
          <JalaliCalendarPanel
            viewY={viewY} viewM={viewM} setViewY={setViewY} setViewM={setViewM}
            onPickDay={pick} dayState={dayState} yearMin={yearMin} yearMax={yearMax}
            footer={
              <JalaliCalendarFooter
                onClear={() => { setSelected(null); onChange('', { jy: 0, jm: 0, jd: 0 }, ''); setOpen(false) }}
                onToday={() => jumpToToday(setViewY, setViewM)}
              />
            }
          />
        </div>
      )}
    </div>
  )
}
