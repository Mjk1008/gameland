'use client'
import { Suspense, useCallback, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { C } from '@/components/ui'
import type { Disc } from '@/lib/mock-data'

const TIMES = [
  { key: '7', label: '۷ روز' },
  { key: '30', label: '۳۰ روز' },
  { key: '90', label: '۹۰ روز' },
  { key: 'all', label: 'همه' },
  { key: 'custom', label: 'تاریخ' },
] as const

function BehaviorFiltersInner({ cityOptions, discOptions }: {
  cityOptions: string[]
  discOptions: { key: Disc; name: string }[]
}) {
  const pathname = usePathname()
  const search = useSearchParams()
  const time = search.get('bdays') ?? '30'
  const city = search.get('bcity') ?? 'all'
  const disc = search.get('bdisc') ?? 'all'
  const bfrom = search.get('bfrom') ?? ''
  const bto = search.get('bto') ?? ''
  const [from, setFrom] = useState(bfrom)
  const [to, setTo] = useState(bto)
  const showCustom = time === 'custom' || Boolean(bfrom && bto)

  const qs = () => {
    const p = new URLSearchParams(search.toString())
    if (!p.get('tab')) p.set('tab', 'behavior')
    return p.toString()
  }

  const exportHref = `/api/admin/behavior-export?${qs()}`

  const chip = (on: boolean): React.CSSProperties => ({
    all: 'unset', cursor: 'pointer', flexShrink: 0, fontSize: 11, fontWeight: 700,
    padding: '6px 11px', borderRadius: 999,
    background: on ? C.accentSoft : C.sf2,
    border: `1px solid ${on ? C.accent : C.line}`,
    color: on ? C.accent : C.tbody,
  })

  const applyCustom = useCallback(() => {
    if (!from || !to) return
    const p = new URLSearchParams(search.toString())
    p.set('bdays', 'custom')
    p.set('bfrom', from)
    p.set('bto', to)
    if (!p.get('tab')) p.set('tab', 'behavior')
    window.location.href = `${pathname}?${p.toString()}`
  }, [from, to, search, pathname])

  return (
    <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="gl-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1 }}>
          {TIMES.map(t => {
            const p = new URLSearchParams(search.toString())
            p.set('bdays', t.key)
            if (t.key !== 'custom') { p.delete('bfrom'); p.delete('bto') }
            if (!p.get('tab')) p.set('tab', 'behavior')
            const href = `${pathname}?${p.toString()}`
            const on = t.key === 'custom' ? showCustom : time === t.key && !(bfrom && bto)
            if (t.key === 'custom') {
              return (
                <button key={t.key} type="button" onClick={() => {
                  const q = new URLSearchParams(search.toString())
                  q.set('bdays', 'custom')
                  if (!q.get('tab')) q.set('tab', 'behavior')
                  window.location.href = `${pathname}?${q.toString()}`
                }} style={chip(on)}>
                  {t.label}
                </button>
              )
            }
            return (
              <a key={t.key} href={href} style={{ ...chip(on), textDecoration: 'none' }}>
                {t.label}
              </a>
            )
          })}
        </div>
        <a href={exportHref} style={{ flexShrink: 0, border: `1px solid ${C.line2}`, background: 'transparent', color: C.gold, borderRadius: 8, padding: '6px 12px', fontSize: 10, fontWeight: 700, textDecoration: 'none' }}>
          ↓ CSV
        </a>
      </div>

      {showCustom && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, alignItems: 'end' }}>
          <label style={{ fontSize: 9, color: C.tmut, display: 'flex', flexDirection: 'column', gap: 3 }}>
            از
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ minHeight: 36, borderRadius: 8, border: `1px solid ${C.line}`, background: C.sf2, color: C.thi, fontSize: 11, padding: '0 8px' }} />
          </label>
          <label style={{ fontSize: 9, color: C.tmut, display: 'flex', flexDirection: 'column', gap: 3 }}>
            تا
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ minHeight: 36, borderRadius: 8, border: `1px solid ${C.line}`, background: C.sf2, color: C.thi, fontSize: 11, padding: '0 8px' }} />
          </label>
          <button type="button" onClick={applyCustom}
            style={{ minHeight: 36, border: 'none', borderRadius: 8, background: C.accent, color: C.ink, fontWeight: 800, fontSize: 11, padding: '0 14px', cursor: 'pointer' }}>
            اعمال
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <FilterSelect label="شهر" value={city} param="bcity" options={[{ v: 'all', l: 'همه' }, ...cityOptions.map(c => ({ v: c, l: c }))]} search={search} pathname={pathname} />
        <FilterSelect label="رشته" value={disc} param="bdisc" options={[{ v: 'all', l: 'همه' }, ...discOptions.map(d => ({ v: d.key, l: d.name }))]} search={search} pathname={pathname} />
      </div>
      <div style={{ fontSize: 10, color: C.tmut }}>
        {bfrom && bto ? `${bfrom} تا ${bto}` : time === 'all' ? 'کل دوره' : `${time === 'custom' ? '…' : time} روز`}
      </div>
    </div>
  )
}

function FilterSelect({ label, value, param, options, search, pathname }: {
  label: string; value: string; param: string
  options: { v: string; l: string }[]
  search: ReturnType<typeof useSearchParams>
  pathname: string
}) {
  const onChange = useCallback((v: string) => {
    const p = new URLSearchParams(search.toString())
    p.set(param, v)
    if (!p.get('tab')) p.set('tab', 'behavior')
    window.location.href = `${pathname}?${p.toString()}`
  }, [search, pathname, param])

  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 9, color: C.tmut }}>
      {label}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ minHeight: 34, borderRadius: 8, border: `1px solid ${C.line}`, background: C.sf2, color: C.thi, fontSize: 11, padding: '0 8px' }}>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  )
}

export default function BehaviorFilters(props: { cityOptions: string[]; discOptions: { key: Disc; name: string }[] }) {
  return (
    <Suspense fallback={<div style={{ padding: '0 16px 12px', fontSize: 11, color: C.tmut }}>…</div>}>
      <BehaviorFiltersInner {...props} />
    </Suspense>
  )
}
