'use client'
import { Suspense, useCallback, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { C } from '@/components/ui'
import JalaliDatePicker from '@/components/JalaliDatePicker'
import { formatIsoRangeJalali } from '@/lib/jalali'
import type { Disc } from '@/lib/mock-data'
import { BEHAVIOR_VIEWS, type BehaviorView } from './view-tabs'

const TIMES = [
  { key: '7', label: '۷ روز' },
  { key: '30', label: '۳۰ روز' },
  { key: '90', label: '۹۰ روز' },
  { key: 'all', label: 'از اول' },
  { key: 'custom', label: 'تاریخ دلخواه' },
] as const

function chip(on: boolean): React.CSSProperties {
  return {
    all: 'unset',
    cursor: 'pointer',
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 700,
    minHeight: 44,
    padding: '0 14px',
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    background: on ? C.accentSoft : C.sf1,
    border: `1px solid ${on ? C.accent : C.line}`,
    color: on ? C.accent : C.tbody,
  }
}

function CommandBarInner({
  cityOptions,
  discOptions,
  rangeLabel,
  compare,
}: {
  cityOptions: string[]
  discOptions: { key: Disc; name: string }[]
  rangeLabel: string
  compare: boolean
}) {
  const pathname = usePathname()
  const search = useSearchParams()
  const time = search.get('bdays') ?? 'all'
  const city = search.get('bcity') ?? 'all'
  const disc = search.get('bdisc') ?? 'all'
  const view = (search.get('bview') ?? 'overview') as BehaviorView
  const bfrom = search.get('bfrom') ?? ''
  const bto = search.get('bto') ?? ''
  const [from, setFrom] = useState(bfrom)
  const [to, setTo] = useState(bto)
  const showCustom = time === 'custom' || Boolean(bfrom && bto)

  const withTab = useCallback((p: URLSearchParams) => {
    if (!p.get('tab')) p.set('tab', 'behavior')
    return p
  }, [])

  const qs = () => withTab(new URLSearchParams(search.toString())).toString()
  const exportHref = `/api/admin/behavior-export?${qs()}`

  const applyCustom = useCallback(() => {
    if (!from || !to) return
    const p = withTab(new URLSearchParams(search.toString()))
    p.set('bdays', 'custom')
    p.set('bfrom', from)
    p.set('bto', to)
    window.location.href = `${pathname}?${p.toString()}`
  }, [from, to, search, pathname, withTab])

  const rangeHint = bfrom && bto
    ? formatIsoRangeJalali(bfrom, bto)
    : time === 'all'
      ? 'کل دوره'
      : time === 'custom'
        ? 'بازهٔ سفارشی'
        : `${time} روز اخیر`

  return (
    <div className="gl-behavior-cmd">
      <div className="gl-behavior-cmd-inner">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <span className="gl-label" style={{ fontSize: 9, color: C.gold, letterSpacing: '.14em' }}>ADMIN · DATA</span>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.thi, marginTop: 2 }}>بیلبورد داده</div>
          </div>
          <span style={{ fontSize: 10, color: C.tmut }}>به‌روز · همین الان</span>
        </div>

        <div style={{ background: C.sf2, border: `1px solid ${C.line2}`, borderRadius: 12, padding: 10, marginBottom: 8 }}>
          <div className="gl-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: showCustom ? 8 : 0 }}>
            {TIMES.map(t => {
              const p = withTab(new URLSearchParams(search.toString()))
              p.set('bdays', t.key)
              if (t.key !== 'custom') { p.delete('bfrom'); p.delete('bto') }
              const href = `${pathname}?${p.toString()}`
              const on = t.key === 'custom' ? showCustom : time === t.key && !(bfrom && bto)
              if (t.key === 'custom') {
                return (
                  <button key={t.key} type="button" onClick={() => {
                    const q = withTab(new URLSearchParams(search.toString()))
                    q.set('bdays', 'custom')
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

          {showCustom && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, alignItems: 'end', marginBottom: 8 }}>
              <label style={{ fontSize: 9, color: C.tmut, display: 'flex', flexDirection: 'column', gap: 3 }}>
                از
                <JalaliDatePicker compact valueIso={from} onChange={(_, __, iso) => setFrom(iso)} placeholder="از تاریخ" yearMin={1400} />
              </label>
              <label style={{ fontSize: 9, color: C.tmut, display: 'flex', flexDirection: 'column', gap: 3 }}>
                تا
                <JalaliDatePicker compact valueIso={to} onChange={(_, __, iso) => setTo(iso)} placeholder="تا تاریخ" yearMin={1400} />
              </label>
              <button type="button" onClick={applyCustom}
                style={{ minHeight: 44, border: 'none', borderRadius: 8, background: C.accent, color: C.ink, fontWeight: 800, fontSize: 11, padding: '0 16px', cursor: 'pointer' }}>
                اعمال
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
            <FilterSelect label="شهر" value={city} param="bcity" options={[{ v: 'all', l: 'همه' }, ...cityOptions.map(c => ({ v: c, l: c }))]} search={search} pathname={pathname} withTab={withTab} />
            <FilterSelect label="رشته" value={disc} param="bdisc" options={[{ v: 'all', l: 'همه' }, ...discOptions.map(d => ({ v: d.key, l: d.name }))]} search={search} pathname={pathname} withTab={withTab} />
            <a href={exportHref} style={{ marginRight: 'auto', minHeight: 44, display: 'inline-flex', alignItems: 'center', border: `1px solid ${C.line2}`, background: 'transparent', color: C.gold, borderRadius: 8, padding: '0 14px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
              ↓ خروجی CSV
            </a>
          </div>

          <div style={{ fontSize: 10, color: C.tmut, marginTop: 8, lineHeight: 1.6 }}>
            {rangeHint}{compare ? ' · مقایسه با دوره قبل' : ''}{rangeLabel !== rangeHint ? ` · ${rangeLabel}` : ''}
          </div>
        </div>

        <div className="gl-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {BEHAVIOR_VIEWS.map(v => {
            const p = withTab(new URLSearchParams(search.toString()))
            p.set('bview', v.key)
            const on = view === v.key
            return (
              <a key={v.key} href={`${pathname}?${p.toString()}`}
                style={{
                  ...chip(on),
                  borderRadius: 9,
                  textDecoration: 'none',
                }}>
                {v.label}
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FilterSelect({ label, value, param, options, search, pathname, withTab }: {
  label: string; value: string; param: string
  options: { v: string; l: string }[]
  search: ReturnType<typeof useSearchParams>
  pathname: string
  withTab: (p: URLSearchParams) => URLSearchParams
}) {
  const onChange = useCallback((v: string) => {
    const p = withTab(new URLSearchParams(search.toString()))
    p.set(param, v)
    window.location.href = `${pathname}?${p.toString()}`
  }, [search, pathname, param, withTab])

  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 9, color: C.tmut, minWidth: 100 }}>
      {label}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ minHeight: 44, borderRadius: 8, border: `1px solid ${C.line2}`, background: C.sf2, color: C.thi, fontSize: 11, padding: '0 10px' }}>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  )
}

export default function BehaviorCommandBar(props: {
  cityOptions: string[]
  discOptions: { key: Disc; name: string }[]
  rangeLabel: string
  compare: boolean
}) {
  return (
    <Suspense fallback={<div style={{ padding: '12px 16px', fontSize: 11, color: C.tmut }}>…</div>}>
      <CommandBarInner {...props} />
    </Suspense>
  )
}
