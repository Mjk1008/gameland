'use client'
import { useMemo, useState } from 'react'
import { C, DISP, BackHeader, DISC_DOT } from '@/components/ui'
import { DISC } from '@/lib/mock-data'
import type { Disc } from '@/lib/mock-data'
import { toman } from '@/lib/payment'
import { toJalali, faDigits, J_MONTHS } from '@/lib/jalali'

export type RegStatus = 'pending' | 'approved' | 'rejected'
export interface RegRec { uid: string; compId: string; comp: string; disc: Disc; city: string; province: string; status: RegStatus; tickets: number; price: number; at: number }
export interface UserRec { at: number; city: string; province: string; disc: Disc | null }

// Status is the only categorical encoding — three reserved status colors, never
// reused for anything else. approved = good, pending = warning, rejected = critical.
const ST = [
  { key: 'approved', label: 'تاییدشده', color: C.win },
  { key: 'pending', label: 'در انتظار', color: C.gold },
  { key: 'rejected', label: 'ردشده', color: C.live },
] as const

type StatusOn = Record<RegStatus, boolean>
const ALL_STATUS: StatusOn = { approved: true, pending: true, rejected: true }

const TIMES = [
  { key: 'all', label: 'کل زمان', days: 0 },
  { key: '90', label: '۹۰ روز', days: 90 },
  { key: '30', label: '۳۰ روز', days: 30 },
  { key: '7', label: '۷ روز', days: 7 },
] as const

const fa = (n: number | string) => faDigits(n)
const dayKey = (ms: number) => { const d = new Date(ms); const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()); return `${j.jy}/${j.jm}/${j.jd}` }
const dayShort = (ms: number) => { const d = new Date(ms); const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()); return `${fa(j.jd)} ${J_MONTHS[j.jm - 1].slice(0, 3)}` }

interface Bucket { label: string; sub?: string; approved: number; pending: number; rejected: number; total: number; dot?: string }

export interface ReferralSnap { invited: number; freeGranted: number; top: { uid: string; name: string; tag: string; count: number }[] }

type GeoScope = 'city' | 'province'
const VIEWS = [
  { key: 'comp',     label: 'مسابقه' },
  { key: 'city',     label: 'شهر' },
  { key: 'province', label: 'استان' },
  { key: 'disc',     label: 'رشته' },
  { key: 'trend',    label: 'روند' },
] as const
type ViewKey = (typeof VIEWS)[number]['key']

const selectStyle: React.CSSProperties = {
  background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10,
  padding: '10px 12px', color: C.thi, fontSize: 13, outline: 'none',
  fontFamily: 'inherit', width: '100%',
}

export default function AnalyticsClient({ regs, gamers, discOptions, cityOptions, provinceOptions = [], referral, showHeader = true }: {
  regs: RegRec[]; gamers: UserRec[]; discOptions: { key: Disc; name: string }[]; cityOptions: string[]; provinceOptions?: string[]; referral?: ReferralSnap; showHeader?: boolean
}) {
  const [now] = useState(() => Date.now())
  const [time, setTime] = useState<(typeof TIMES)[number]['key']>('all')
  const [disc, setDisc] = useState<Disc | 'all'>('all')
  const [geoScope, setGeoScope] = useState<GeoScope>('city')
  const [province, setProvince] = useState<string | 'all'>('all')
  const [city, setCity] = useState<string | 'all'>('all')
  const [statusOn, setStatusOn] = useState<StatusOn>(ALL_STATUS)
  const [table, setTable] = useState(false)
  const [view, setView] = useState<ViewKey>('comp')

  const cutoff = useMemo(() => { const t = TIMES.find(x => x.key === time)!; return t.days ? now - t.days * 86400000 : 0 }, [time, now])

  const anyStatusOff = !statusOn.approved || !statusOn.pending || !statusOn.rejected

  const citiesForDropdown = useMemo(() => {
    if (province === 'all') return cityOptions
    const inProv = new Set<string>()
    for (const r of regs) if (r.province === province && r.city !== 'نامشخص') inProv.add(r.city)
    for (const g of gamers) if (g.province === province && g.city !== 'نامشخص') inProv.add(g.city)
    return cityOptions.filter(c => inProv.has(c))
  }, [cityOptions, province, regs, gamers])

  const fReg = useMemo(() => regs.filter(r =>
    r.at >= cutoff
    && (disc === 'all' || r.disc === disc)
    && (province === 'all' || r.province === province)
    && (geoScope === 'province' || city === 'all' || r.city === city)
    && statusOn[r.status]
  ), [regs, cutoff, disc, province, city, geoScope, statusOn])

  const fGamers = useMemo(() => gamers.filter(g =>
    g.at >= cutoff
    && (disc === 'all' || g.disc === disc)
    && (province === 'all' || g.province === province)
    && (geoScope === 'province' || city === 'all' || g.city === city)
  ), [gamers, cutoff, disc, province, city, geoScope])

  // Headline metrics.
  const sum = (rs: RegRec[], st?: string) => rs.reduce((a, r) => a + (st ? (r.status === st ? r.tickets : 0) : r.tickets), 0)
  const totalTickets = sum(fReg)
  const approvedTickets = sum(fReg, 'approved')
  const pendingTickets = sum(fReg, 'pending')
  const rejectedTickets = sum(fReg, 'rejected')
  const activeUsers = new Set(fReg.map(r => r.uid)).size
  const compCount = new Set(fReg.map(r => r.compId)).size
  // Per-event price (ticketPriceFor), never a single global constant — an
  // event can be priced differently from the platform default.
  const revenue = fReg.reduce((a, r) => a + (r.status === 'approved' ? r.tickets * r.price : 0), 0)

  // Grouped breakdowns (stacked by status).
  const group = (keyOf: (r: RegRec) => string, dotOf?: (r: RegRec) => string): Bucket[] => {
    const m = new Map<string, Bucket>()
    for (const r of fReg) {
      const k = keyOf(r)
      let b = m.get(k)
      if (!b) { b = { label: k, approved: 0, pending: 0, rejected: 0, total: 0, dot: dotOf?.(r) }; m.set(k, b) }
      b[r.status] += r.tickets; b.total += r.tickets
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total)
  }
  const byComp = group(r => r.comp)
  const byDisc = group(r => DISC[r.disc]?.name ?? r.disc, r => DISC_DOT[r.disc] ?? C.tmut)
  const cityGamers = useMemo(() => { const m = new Map<string, number>(); for (const g of fGamers) m.set(g.city, (m.get(g.city) ?? 0) + 1); return m }, [fGamers])
  const provinceGamers = useMemo(() => { const m = new Map<string, number>(); for (const g of fGamers) m.set(g.province, (m.get(g.province) ?? 0) + 1); return m }, [fGamers])
  const byCity = group(r => r.city).map(b => ({ ...b, sub: `${fa(cityGamers.get(b.label) ?? 0)} گیمر` }))
  const byProvince = group(r => r.province).map(b => ({ ...b, sub: `${fa(provinceGamers.get(b.label) ?? 0)} گیمر` }))

  // Tickets sold over time — daily buckets, oldest → newest, stacked by status.
  const daily = useMemo(() => {
    const m = new Map<string, { at: number; approved: number; pending: number; rejected: number }>()
    for (const r of fReg) {
      const k = dayKey(r.at)
      let b = m.get(k)
      if (!b) { b = { at: r.at, approved: 0, pending: 0, rejected: 0 }; m.set(k, b) }
      b[r.status] += r.tickets
    }
    return Array.from(m.values()).sort((a, b) => a.at - b.at)
  }, [fReg])

  const geoFilterCount = (province !== 'all' ? 1 : 0) + (geoScope === 'city' && city !== 'all' ? 1 : 0)
  const activeFilters = (time !== 'all' ? 1 : 0) + (disc !== 'all' ? 1 : 0) + geoFilterCount + (anyStatusOff ? 1 : 0)

  const setScope = (next: GeoScope) => {
    setGeoScope(next)
    if (next === 'province') setCity('all')
    if (view === 'city' || view === 'province') setView(next)
  }

  const pickProvince = (value: string) => {
    setProvince(value)
    setCity('all')
  }

  const pickCity = (value: string) => {
    setCity(value)
    if (value !== 'all') {
      const hit = regs.find(r => r.city === value) ?? gamers.find(g => g.city === value)
      if (hit) setProvince(hit.province)
    }
  }

  const toggleStatus = (key: RegStatus) => {
    setStatusOn(s => {
      const next = { ...s, [key]: !s[key] }
      if (!next.approved && !next.pending && !next.rejected) return ALL_STATUS
      return next
    })
  }

  const clearFilters = () => {
    setTime('all'); setDisc('all'); setProvince('all'); setCity('all'); setStatusOn(ALL_STATUS)
  }

  const onGeoBar = (label: string, scope: GeoScope) => {
    if (scope === 'province') {
      if (province === label) { setProvince('all'); setCity('all'); return }
      setProvince(label)
      setCity('all')
      setGeoScope('city')
      setView('city')
      return
    }
    if (city === label) { setCity('all'); return }
    const hit = regs.find(r => r.city === label) ?? gamers.find(g => g.city === label)
    if (hit) setProvince(hit.province)
    setCity(label)
    setGeoScope('city')
  }

  const geoHint = geoScope === 'province'
    ? 'روی استان بزن تا شهرهایش را ببینی'
    : 'روی شهر بزن تا همان شهر فیلتر شود'

  return (
    <div className="animate-fade-up">
      {showHeader && <BackHeader title="آنالیتیکس" href="/admin" />}

      <div style={{ padding: showHeader ? '14px 16px 30px' : '0 16px 30px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Filters (one strip) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ChipRow>
            {TIMES.map(t => <Chip key={t.key} on={time === t.key} onClick={() => setTime(t.key)}>{t.label}</Chip>)}
          </ChipRow>
          <ChipRow>
            <Chip on={disc === 'all'} onClick={() => setDisc('all')}>همهٔ رشته‌ها</Chip>
            {discOptions.map(d => (
              <Chip key={d.key} on={disc === d.key} onClick={() => setDisc(d.key)}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: DISC_DOT[d.key] ?? C.tmut, display: 'inline-block', marginInlineEnd: 6 }} />{d.name}
              </Chip>
            ))}
          </ChipRow>

          <ChipRow>
            <span style={{ fontSize: 11, color: C.tmut, alignSelf: 'center', paddingInlineEnd: 2, flexShrink: 0 }}>اسکوپ:</span>
            <Chip on={geoScope === 'city'} onClick={() => setScope('city')}>شهر</Chip>
            <Chip on={geoScope === 'province'} onClick={() => setScope('province')}>استان</Chip>
          </ChipRow>

          {geoScope === 'province' ? (
            provinceOptions.length > 0 && (
              <select value={province} onChange={e => pickProvince(e.target.value)} style={selectStyle}>
                <option value="all">همهٔ استان‌ها</option>
                {provinceOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {provinceOptions.length > 0 && (
                <select value={province} onChange={e => pickProvince(e.target.value)} style={selectStyle}>
                  <option value="all">همهٔ استان‌ها</option>
                  {provinceOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
              {citiesForDropdown.length > 0 && (
                <select value={city} onChange={e => pickCity(e.target.value)} style={selectStyle}>
                  <option value="all">{province === 'all' ? 'همهٔ شهرها' : `همهٔ شهرهای ${province}`}</option>
                  {citiesForDropdown.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
          )}

          <ChipRow>
            <span style={{ fontSize: 11, color: C.tmut, alignSelf: 'center', paddingInlineEnd: 2, flexShrink: 0 }}>سهم:</span>
            {ST.map(s => (
              <Chip key={s.key} on={statusOn[s.key]} onClick={() => toggleStatus(s.key)}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: s.color, display: 'inline-block', marginInlineEnd: 6, opacity: statusOn[s.key] ? 1 : 0.35 }} />
                {s.label}
              </Chip>
            ))}
          </ChipRow>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: C.tmut }}>{activeFilters ? `${fa(activeFilters)} فیلتر فعال` : 'بدون فیلتر — همهٔ داده'}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {activeFilters > 0 && <button onClick={clearFilters} style={miniBtn(false)}>پاک‌کردن</button>}
              <button onClick={() => setTable(t => !t)} style={miniBtn(table)}>{table ? 'نمودار' : 'جدول'}</button>
            </div>
          </div>
        </div>

        {/* ── Stat tiles ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
          <Tile label="گیمرها" value={fa(fGamers.length)} color={C.accent} />
          <Tile label="کاربر فعال" value={fa(activeUsers)} color={C.win} sub="ثبت‌نام‌کرده" />
          <Tile label="مسابقات" value={fa(compCount)} color={C.gold} sub="با ثبت‌نام" />
          <Tile label="کل سهم" value={fa(totalTickets)} color={C.thi} onClick={() => setStatusOn(ALL_STATUS)} />
          <Tile label="سهمِ تاییدشده" value={fa(approvedTickets)} color={C.win} onClick={() => setStatusOn({ approved: true, pending: false, rejected: false })} />
          <Tile label="درآمدِ تاییدشده" value={<><span className="gl-num">{toman(revenue)}</span></>} color={C.accent} sub="تومان" small />
        </div>
        {(pendingTickets > 0 || rejectedTickets > 0) && anyStatusOff && (
          <div style={{ fontSize: 11, color: C.tmut, padding: '0 2px' }}>
            {statusOn.pending ? `${fa(pendingTickets)} در انتظار` : null}
            {statusOn.pending && statusOn.rejected ? ' · ' : null}
            {statusOn.rejected ? `${fa(rejectedTickets)} ردشده` : null}
          </div>
        )}

        {/* ── View-by dimension selector ── */}
        <ChipRow>
          <span style={{ fontSize: 11, color: C.tmut, alignSelf: 'center', paddingInlineEnd: 2, flexShrink: 0 }}>نمایش بر اساس:</span>
          {VIEWS.map(v => (
            <Chip key={v.key} on={view === v.key} onClick={() => {
              if (v.key === 'city' || v.key === 'province') setScope(v.key)
              setView(v.key)
            }}>{v.label}</Chip>
          ))}
        </ChipRow>

        {fReg.length === 0 ? (
          <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: '30px 20px', textAlign: 'center', color: C.tmut, fontSize: 13 }}>
            برای این فیلترها داده‌ای نیست.
          </div>
        ) : (
          <>
            {view === 'comp' && (
              <Section title="سهم به‌ازای هر مسابقه">
                {table ? <BTable rows={byComp} /> : byComp.map(b => <StackRow key={b.label} b={b} max={byComp[0].total} />)}
              </Section>
            )}
            {view === 'city' && (
              <Section title={province === 'all' ? 'سهم و گیمر به‌ازای هر شهر' : `شهرهای استان ${province}`} hint={geoHint}>
                {table
                  ? <BTable rows={byCity} extra="گیمر" extraOf={b => b.sub?.replace(' گیمر', '') ?? '۰'} onRow={label => onGeoBar(label, 'city')} activeLabel={city === 'all' ? undefined : city} />
                  : byCity.map(b => <StackRow key={b.label} b={b} max={byCity[0].total} active={city === b.label} onClick={() => onGeoBar(b.label, 'city')} />)}
              </Section>
            )}
            {view === 'province' && (
              <Section title="سهم و گیمر به‌ازای هر استان" hint={geoHint}>
                {table
                  ? <BTable rows={byProvince} extra="گیمر" extraOf={b => b.sub?.replace(' گیمر', '') ?? '۰'} onRow={label => onGeoBar(label, 'province')} activeLabel={province === 'all' ? undefined : province} />
                  : byProvince.map(b => <StackRow key={b.label} b={b} max={byProvince[0].total} active={province === b.label} onClick={() => onGeoBar(b.label, 'province')} />)}
              </Section>
            )}
            {view === 'disc' && (
              <Section title="سهم به‌ازای هر رشته">
                {table ? <BTable rows={byDisc} /> : byDisc.map(b => <StackRow key={b.label} b={b} max={byDisc[0].total} />)}
              </Section>
            )}
            {view === 'trend' && (
              <Section title="روند فروش سهم">
                <DailyBars data={daily} />
              </Section>
            )}
          </>
        )}

        {/* referral campaign — campaign-wide, unaffected by the filters above */}
        {referral && (
          <Section title="کمپین دعوت (کل کمپین)">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 10 }}>
              <Tile label="با کد دعوت اومدن" value={fa(referral.invited)} color={C.accent} />
              <Tile label="سهمِ جایزه" value={fa(referral.freeGranted)} color={C.gold} sub="کلِ اعطاشده" />
            </div>
            {referral.top.length === 0
              ? <div style={{ fontSize: 12, color: C.tmut, padding: '4px 0' }}>هنوز دعوتِ تاییدشده‌ای نیست.</div>
              : referral.top.map((t, i) => (
                <div key={t.uid} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0' }}>
                  <span className="gl-num" style={{ width: 18, textAlign: 'center', fontWeight: 800, color: i === 0 ? C.gold : C.tmut }}>{fa(i + 1)}</span>
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: C.thi }}>{t.name} <span dir="ltr" style={{ fontFamily: DISP, fontSize: 10.5, color: C.tmut }}>@{t.tag}</span></span>
                  <span className="gl-num" style={{ fontWeight: 800, color: C.thi }}>{fa(t.count)}</span>
                </div>
              ))}
          </Section>
        )}
      </div>
    </div>
  )
}

// ── Stacked horizontal bar (one entity, segmented by status) ──
function StackRow({ b, max, onClick, active }: { b: Bucket; max: number; onClick?: () => void; active?: boolean }) {
  const pct = max > 0 ? (b.total / max) * 100 : 0
  const segs = ST.filter(s => b[s.key] > 0)
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      style={{
        display: 'grid', gridTemplateColumns: '96px 1fr auto', alignItems: 'center', gap: 10,
        padding: '7px 8px', margin: '0 -8px', borderRadius: 10, cursor: onClick ? 'pointer' : 'default',
        background: active ? C.accentSoft : 'transparent', outline: 'none',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: active ? C.accent : C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
          {b.dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: b.dot, flexShrink: 0 }} />}{b.label}
        </div>
        {b.sub && <div style={{ fontSize: 10, color: C.tmut, marginTop: 1 }}>{b.sub}</div>}
      </div>
      <div style={{ height: 16, borderRadius: 8, background: C.sf2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', display: 'flex', gap: 2 }}>
          {segs.map((s, i) => (
            <div key={s.key} title={`${s.label}: ${fa(b[s.key])}`}
              style={{ flex: b[s.key], background: s.color, borderStartStartRadius: i === 0 ? 8 : 0, borderEndStartRadius: i === 0 ? 8 : 0, borderStartEndRadius: i === segs.length - 1 ? 8 : 0, borderEndEndRadius: i === segs.length - 1 ? 8 : 0 }} />
          ))}
        </div>
      </div>
      <span className="gl-num" style={{ fontFamily: DISP, fontSize: 13, fontWeight: 800, color: C.thi, minWidth: 22, textAlign: 'left' }}>{fa(b.total)}</span>
    </div>
  )
}

// ── Daily tickets-sold bars ──
function DailyBars({ data }: { data: { at: number; approved: number; pending: number; rejected: number }[] }) {
  if (data.length === 0) return <div style={{ fontSize: 12, color: C.tmut, padding: '8px 0' }}>هنوز فروشی ثبت نشده.</div>
  const totalOf = (d: (typeof data)[number]) => d.approved + d.pending + d.rejected
  const max = Math.max(...data.map(totalOf))
  const show = data.slice(-30) // keep it readable
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, overflowX: 'auto', paddingBottom: 2 }}>
        {show.map((d, i) => {
          const total = totalOf(d)
          const segs = ST.filter(s => d[s.key] > 0)
          return (
            <div key={i} title={`${dayShort(d.at)}: ${fa(total)} سهم`} style={{ flex: '1 0 14px', minWidth: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span className="gl-num" style={{ fontSize: 9, color: C.tmut }}>{fa(total)}</span>
              <div style={{ width: '100%', height: `${max > 0 ? (total / max) * 74 : 0}px`, minHeight: 3, display: 'flex', flexDirection: 'column-reverse', borderRadius: 4, overflow: 'hidden' }}>
                {segs.map(s => (
                  <div key={s.key} style={{ height: `${total > 0 ? (d[s.key] / total) * 100 : 0}%`, background: s.color, minHeight: d[s.key] > 0 ? 2 : 0 }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: C.tmut }}>
        <span>{dayShort(show[0].at)}</span>
        {show.length > 2 && <span>{dayShort(show[show.length - 1].at)}</span>}
      </div>
    </div>
  )
}

// ── Table fallback (accessibility / exact numbers) ──
function BTable({ rows, extra, extraOf, onRow, activeLabel }: {
  rows: Bucket[]; extra?: string; extraOf?: (b: Bucket) => string; onRow?: (label: string) => void; activeLabel?: string
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ color: C.tmut, textAlign: 'right' }}>
            <th style={th}>عنوان</th><th style={thN}>تایید</th><th style={thN}>انتظار</th><th style={thN}>رد</th><th style={thN}>کل</th>{extra && <th style={thN}>{extra}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(b => (
            <tr key={b.label} onClick={onRow ? () => onRow(b.label) : undefined}
              style={{ borderTop: `1px solid ${C.line}`, cursor: onRow ? 'pointer' : 'default', background: activeLabel === b.label ? C.accentSoft : 'transparent' }}>
              <td style={{ ...td, color: activeLabel === b.label ? C.accent : C.thi, fontWeight: 700 }}>{b.label}</td>
              <td style={tdN}>{fa(b.approved)}</td><td style={tdN}>{fa(b.pending)}</td><td style={tdN}>{fa(b.rejected)}</td>
              <td style={{ ...tdN, color: C.thi, fontWeight: 800 }}>{fa(b.total)}</td>
              {extra && <td style={tdN}>{extraOf ? extraOf(b) : ''}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── small building blocks ──
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 16, padding: '14px 15px' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.thi, marginBottom: hint ? 4 : 12 }}>{title}</div>
      {hint && <div style={{ fontSize: 11, color: C.tmut, marginBottom: 12 }}>{hint}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</div>
    </div>
  )
}
function Tile({ label, value, color, sub, small, onClick }: { label: string; value: React.ReactNode; color: string; sub?: string; small?: boolean; onClick?: () => void }) {
  return (
    <div role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: '13px 10px', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', textAlign: 'center', cursor: onClick ? 'pointer' : 'default' }}>
      <span className="gl-num" style={{ fontFamily: DISP, fontSize: small ? 15 : 23, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</span>
      <span style={{ fontSize: 10.5, color: C.tbody, fontWeight: 600 }}>{label}</span>
      {sub && <span style={{ fontSize: 9, color: C.tmut }}>{sub}</span>}
    </div>
  )
}
function ChipRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2 }}>{children}</div>
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ all: 'unset', cursor: 'pointer', whiteSpace: 'nowrap', flex: '0 0 auto', fontSize: 12, fontWeight: 700, padding: '8px 13px', borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}`, display: 'inline-flex', alignItems: 'center' }}>{children}</button>
  )
}
const miniBtn = (on: boolean): React.CSSProperties => ({ all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, padding: '6px 12px', borderRadius: 9, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}` })
const th: React.CSSProperties = { padding: '6px 4px', fontWeight: 700, fontSize: 11 }
const thN: React.CSSProperties = { ...th, textAlign: 'center' }
const td: React.CSSProperties = { padding: '8px 4px' }
const tdN: React.CSSProperties = { ...td, textAlign: 'center', fontFamily: DISP, color: C.tbody }
