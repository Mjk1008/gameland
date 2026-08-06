'use client'
import { useMemo, useState } from 'react'
import { C, DISP, BackHeader, DISC_DOT } from '@/components/ui'
import { DISC } from '@/lib/mock-data'
import type { Disc } from '@/lib/mock-data'
import { toman } from '@/lib/payment'
import { toJalali, faDigits, J_MONTHS } from '@/lib/jalali'

export interface RegRec { uid: string; compId: string; comp: string; disc: Disc; city: string; status: 'pending' | 'approved' | 'rejected'; tickets: number; price: number; at: number }
export interface UserRec { at: number; city: string; disc: Disc | null }

// Status is the only categorical encoding — three reserved status colors, never
// reused for anything else. approved = good, pending = warning, rejected = critical.
const ST = [
  { key: 'approved', label: 'تاییدشده', color: C.win },
  { key: 'pending', label: 'در انتظار', color: C.gold },
  { key: 'rejected', label: 'ردشده', color: C.live },
] as const

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

const VIEWS = [
  { key: 'comp',  label: 'مسابقه' },
  { key: 'city',  label: 'شهر' },
  { key: 'disc',  label: 'رشته' },
  { key: 'trend', label: 'روند' },
] as const

export default function AnalyticsClient({ regs, gamers, discOptions, cityOptions, referral, showHeader = true }: {
  regs: RegRec[]; gamers: UserRec[]; discOptions: { key: Disc; name: string }[]; cityOptions: string[]; referral?: ReferralSnap; showHeader?: boolean
}) {
  const [now] = useState(() => Date.now())
  const [time, setTime] = useState<(typeof TIMES)[number]['key']>('all')
  const [disc, setDisc] = useState<Disc | 'all'>('all')
  const [city, setCity] = useState<string | 'all'>('all')
  const [table, setTable] = useState(false)
  const [view, setView] = useState<(typeof VIEWS)[number]['key']>('comp')

  const cutoff = useMemo(() => { const t = TIMES.find(x => x.key === time)!; return t.days ? now - t.days * 86400000 : 0 }, [time, now])

  const fReg = useMemo(() => regs.filter(r =>
    r.at >= cutoff && (disc === 'all' || r.disc === disc) && (city === 'all' || r.city === city)
  ), [regs, cutoff, disc, city])

  const fGamers = useMemo(() => gamers.filter(g =>
    g.at >= cutoff && (disc === 'all' || g.disc === disc) && (city === 'all' || g.city === city)
  ), [gamers, cutoff, disc, city])

  // Headline metrics.
  const sum = (rs: RegRec[], st?: string) => rs.reduce((a, r) => a + (st ? (r.status === st ? r.tickets : 0) : r.tickets), 0)
  const totalTickets = sum(fReg)
  const approvedTickets = sum(fReg, 'approved')
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
  const byCity = group(r => r.city).map(b => ({ ...b, sub: `${fa(cityGamers.get(b.label) ?? 0)} گیمر` }))

  // Tickets sold over time — daily buckets, oldest → newest.
  const daily = useMemo(() => {
    const m = new Map<string, { at: number; total: number }>()
    for (const r of fReg) { const k = dayKey(r.at); const b = m.get(k); if (b) b.total += r.tickets; else m.set(k, { at: r.at, total: r.tickets }) }
    return Array.from(m.values()).sort((a, b) => a.at - b.at)
  }, [fReg])

  const activeFilters = (time !== 'all' ? 1 : 0) + (disc !== 'all' ? 1 : 0) + (city !== 'all' ? 1 : 0)

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
          {cityOptions.length > 0 && (
            <select value={city} onChange={e => setCity(e.target.value)} style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px', color: C.thi, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
              <option value="all">همهٔ شهرها</option>
              {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: C.tmut }}>{activeFilters ? `${fa(activeFilters)} فیلتر فعال` : 'بدون فیلتر — همهٔ داده'}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {activeFilters > 0 && <button onClick={() => { setTime('all'); setDisc('all'); setCity('all') }} style={miniBtn(false)}>پاک‌کردن</button>}
              <button onClick={() => setTable(t => !t)} style={miniBtn(table)}>{table ? 'نمودار' : 'جدول'}</button>
            </div>
          </div>
        </div>

        {/* ── Stat tiles ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
          <Tile label="گیمرها" value={fa(fGamers.length)} color={C.accent} />
          <Tile label="کاربر فعال" value={fa(activeUsers)} color={C.win} sub="ثبت‌نام‌کرده" />
          <Tile label="مسابقات" value={fa(compCount)} color={C.gold} sub="با ثبت‌نام" />
          <Tile label="کل سهم" value={fa(totalTickets)} color={C.thi} />
          <Tile label="سهمِ تاییدشده" value={fa(approvedTickets)} color={C.win} />
          <Tile label="درآمدِ تاییدشده" value={<><span className="gl-num">{toman(revenue)}</span></>} color={C.accent} sub="تومان" small />
        </div>

        {/* ── Legend (status) ── */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', padding: '0 2px' }}>
          {ST.map(s => (
            <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: C.tbody }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />{s.label}
            </span>
          ))}
        </div>

        {/* ── View-by dimension selector — pick ONE breakdown, no scrolling past the others ── */}
        <ChipRow>
          <span style={{ fontSize: 11, color: C.tmut, alignSelf: 'center', paddingInlineEnd: 2, flexShrink: 0 }}>نمایش بر اساس:</span>
          {VIEWS.map(v => <Chip key={v.key} on={view === v.key} onClick={() => setView(v.key)}>{v.label}</Chip>)}
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
              <Section title="سهم و گیمر به‌ازای هر شهر">
                {table ? <BTable rows={byCity} extra="گیمر" extraOf={b => b.sub?.replace(' گیمر', '') ?? '۰'} /> : byCity.map(b => <StackRow key={b.label} b={b} max={byCity[0].total} />)}
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
function StackRow({ b, max }: { b: Bucket; max: number }) {
  const pct = max > 0 ? (b.total / max) * 100 : 0
  const segs = ST.filter(s => b[s.key] > 0)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr auto', alignItems: 'center', gap: 10, padding: '5px 0' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
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
function DailyBars({ data }: { data: { at: number; total: number }[] }) {
  if (data.length === 0) return <div style={{ fontSize: 12, color: C.tmut, padding: '8px 0' }}>هنوز فروشی ثبت نشده.</div>
  const max = Math.max(...data.map(d => d.total))
  const show = data.slice(-30) // keep it readable
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, overflowX: 'auto', paddingBottom: 2 }}>
        {show.map((d, i) => (
          <div key={i} title={`${dayShort(d.at)}: ${fa(d.total)} سهم`} style={{ flex: '1 0 14px', minWidth: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span className="gl-num" style={{ fontSize: 9, color: C.tmut }}>{fa(d.total)}</span>
            <div style={{ width: '100%', height: `${max > 0 ? (d.total / max) * 74 : 0}px`, minHeight: 3, background: C.accent, borderRadius: 4 }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: C.tmut }}>
        <span>{dayShort(show[0].at)}</span>
        {show.length > 2 && <span>{dayShort(show[show.length - 1].at)}</span>}
      </div>
    </div>
  )
}

// ── Table fallback (accessibility / exact numbers) ──
function BTable({ rows, extra, extraOf }: { rows: Bucket[]; extra?: string; extraOf?: (b: Bucket) => string }) {
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
            <tr key={b.label} style={{ borderTop: `1px solid ${C.line}` }}>
              <td style={{ ...td, color: C.thi, fontWeight: 700 }}>{b.label}</td>
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
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 16, padding: '14px 15px' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.thi, marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</div>
    </div>
  )
}
function Tile({ label, value, color, sub, small }: { label: string; value: React.ReactNode; color: string; sub?: string; small?: boolean }) {
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: '13px 10px', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', textAlign: 'center' }}>
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
