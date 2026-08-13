'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { C, DISP } from '@/components/ui'
import { toman } from '@/lib/payment'
import { toJalali, faDigits, J_MONTHS } from '@/lib/jalali'
import type { PromoterAnalyticsRow, PromoterAnalyticsRequestRow } from '@/lib/promoter'

const fa = (n: number | string) => faDigits(n)
const dayKey = (ms: number) => { const d = new Date(ms); const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()); return `${j.jy}/${j.jm}/${j.jd}` }
const dayShort = (ms: number) => { const d = new Date(ms); const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()); return `${fa(j.jd)} ${J_MONTHS[j.jm - 1].slice(0, 3)}` }

const TIMES = [
  { key: 'all', label: 'کل زمان', days: 0 },
  { key: '90', label: '۹۰ روز', days: 90 },
  { key: '30', label: '۳۰ روز', days: 30 },
  { key: '7', label: '۷ روز', days: 7 },
] as const

const VIEWS = [
  { key: 'overview', label: 'خلاصه' },
  { key: 'promoters', label: 'پروموترها' },
  { key: 'codes', label: 'کدها' },
  { key: 'trend', label: 'روند' },
] as const

export default function PromoterAnalyticsContent({ snap }: {
  snap: {
    activePromoters: number
    activeCodes: number
    pendingCodeRequests: number
    rows: PromoterAnalyticsRow[]
    requestRows: PromoterAnalyticsRequestRow[]
  }
}) {
  const [now] = useState(() => Date.now())
  const [time, setTime] = useState<(typeof TIMES)[number]['key']>('all')
  const [view, setView] = useState<(typeof VIEWS)[number]['key']>('overview')

  const cutoff = useMemo(() => {
    const t = TIMES.find(x => x.key === time)!
    return t.days ? now - t.days * 86400000 : 0
  }, [time, now])

  const rows = useMemo(() => snap.rows.filter(r => r.at >= cutoff && r.status !== 'rejected'), [snap.rows, cutoff])
  const reqRows = useMemo(() => snap.requestRows.filter(r => r.at >= cutoff), [snap.requestRows, cutoff])

  const uses = rows.length
  const approved = rows.filter(r => r.status === 'approved').length
  const pending = rows.filter(r => r.status === 'pending').length
  const conversion = (approved + pending) > 0 ? Math.round(approved / (approved + pending) * 100) : 0
  const revenue = rows.reduce((s, r) => s + r.revenue, 0)
  const commissionTotal = rows.reduce((s, r) => s + r.commission, 0)
  const commissionPending = rows.filter(r => r.commissionStatus === 'pending').reduce((s, r) => s + r.commission, 0)
  const commissionPaid = rows.filter(r => r.commissionStatus === 'paid').reduce((s, r) => s + r.commission, 0)
  const tickets = rows.reduce((s, r) => s + r.attempts, 0)

  const reqPending = reqRows.filter(r => r.status === 'pending').length
  const reqApproved = reqRows.filter(r => r.status === 'approved').length
  const reqRejected = reqRows.filter(r => r.status === 'rejected').length

  const byPromoter = useMemo(() => {
    const m = new Map<string, { name: string; tag: string; uses: number; approved: number; pending: number; revenue: number; commission: number }>()
    for (const r of rows) {
      if (!r.promoterUserId) continue
      let b = m.get(r.promoterUserId)
      if (!b) b = { name: r.promoterName, tag: r.promoterTag, uses: 0, approved: 0, pending: 0, revenue: 0, commission: 0 }
      b.uses += 1
      if (r.status === 'approved') { b.approved += 1; b.revenue += r.revenue }
      if (r.status === 'pending') b.pending += 1
      b.commission += r.commission
      m.set(r.promoterUserId, b)
    }
    return [...m.entries()]
      .map(([id, b]) => ({
        id,
        ...b,
        conversion: (b.approved + b.pending) > 0 ? Math.round(b.approved / (b.approved + b.pending) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue || b.uses - a.uses)
  }, [rows])

  const byCode = useMemo(() => {
    const m = new Map<string, { code: string; promoter: string; uses: number; approved: number; pending: number; revenue: number; commission: number }>()
    for (const r of rows) {
      let b = m.get(r.codeId)
      if (!b) b = { code: r.code, promoter: r.promoterName, uses: 0, approved: 0, pending: 0, revenue: 0, commission: 0 }
      b.uses += 1
      if (r.status === 'approved') { b.approved += 1; b.revenue += r.revenue }
      if (r.status === 'pending') b.pending += 1
      b.commission += r.commission
      m.set(r.codeId, b)
    }
    return [...m.entries()]
      .map(([id, b]) => ({
        id,
        ...b,
        conversion: (b.approved + b.pending) > 0 ? Math.round(b.approved / (b.approved + b.pending) * 100) : 0,
      }))
      .sort((a, b) => b.uses - a.uses)
  }, [rows])

  const daily = useMemo(() => {
    const m = new Map<string, { at: number; uses: number; approved: number }>()
    for (const r of rows) {
      const k = dayKey(r.at)
      const b = m.get(k)
      if (b) {
        b.uses += 1
        if (r.status === 'approved') b.approved += 1
      } else {
        m.set(k, { at: r.at, uses: 1, approved: r.status === 'approved' ? 1 : 0 })
      }
    }
    return [...m.values()].sort((a, b) => a.at - b.at)
  }, [rows])

  return (
    <div style={{ padding: '0 16px 30px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>آنالیتیکس پروموتر</div>
          <div style={{ fontSize: 11, color: C.tmut, marginTop: 3 }}>کد، تبدیل، درآمد و کمیسیون</div>
        </div>
        <Link href="/admin/promoters" style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: C.accent, background: C.accentSoft, border: `1px solid ${C.accent}55`, borderRadius: 9, padding: '8px 12px', whiteSpace: 'nowrap' }}>
          مدیریت ›
        </Link>
      </div>

      <ChipRow>
        {TIMES.map(t => <Chip key={t.key} on={time === t.key} onClick={() => setTime(t.key)}>{t.label}</Chip>)}
      </ChipRow>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
        <Tile label="پروموتر فعال" value={fa(snap.activePromoters)} color={C.accent} sub="الان" />
        <Tile label="کد فعال" value={fa(snap.activeCodes)} color={C.gold} sub="الان" />
        <Tile label="درخواست کد" value={fa(snap.pendingCodeRequests)} color={snap.pendingCodeRequests ? C.live : C.tmut} sub="منتظر تأیید" />
        <Tile label="استفاده از کد" value={fa(uses)} color={C.thi} sub={`${fa(tickets)} سهم`} />
        <Tile label="نرخ تبدیل" value={`${fa(conversion)}٪`} color={C.win} sub={`${fa(approved)} تأیید / ${fa(pending)} انتظار`} />
        <Tile label="درآمد promo" value={<span className="gl-num">{toman(revenue)}</span>} color={C.accent} sub="تأییدشده" small />
        <Tile label="کمیسیون کل" value={<span className="gl-num">{toman(commissionTotal)}</span>} color={C.gold} sub="تأییدشده" small />
        <Tile label="کمیسیون معوق" value={<span className="gl-num">{toman(commissionPending)}</span>} color={C.gold} small />
        <Tile label="کمیسیون پرداخت" value={<span className="gl-num">{toman(commissionPaid)}</span>} color={C.win} small />
      </div>

      {(reqPending + reqApproved + reqRejected) > 0 && (
        <Section title="قیف درخواست کد">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
            <MiniStat label="منتظر" value={reqPending} color={C.gold} />
            <MiniStat label="تأییدشده" value={reqApproved} color={C.win} />
            <MiniStat label="ردشده" value={reqRejected} color={C.live} />
          </div>
        </Section>
      )}

      <ChipRow>
        <span style={{ fontSize: 11, color: C.tmut, alignSelf: 'center', paddingInlineEnd: 2 }}>نمایش:</span>
        {VIEWS.map(v => <Chip key={v.key} on={view === v.key} onClick={() => setView(v.key)}>{v.label}</Chip>)}
      </ChipRow>

      {rows.length === 0 ? (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: '30px 20px', textAlign: 'center', color: C.tmut, fontSize: 13 }}>
          {snap.activePromoters > 0
            ? 'هنوز کسی با کد پروموتر ثبت‌نام نکرده — یا فیلتر زمانی خیلی تنگه.'
            : 'هنوز پروموتری فعال نیست. از مدیریت پروموتر شروع کن.'}
        </div>
      ) : (
        <>
          {view === 'overview' && (
            <>
              <Section title="برترین پروموترها (درآمد)">
                {byPromoter.slice(0, 5).map((p, i) => (
                  <LeaderRow key={p.id} rank={i + 1} title={p.name} sub={`@${p.tag} · ${fa(p.conversion)}٪ تبدیل`} value={toman(p.revenue)} hint={`${fa(p.uses)} استفاده`} />
                ))}
              </Section>
              <Section title="پرکاربردترین کدها">
                {byCode.slice(0, 5).map((c, i) => (
                  <LeaderRow key={c.id} rank={i + 1} title={c.code} sub={c.promoter} value={`${fa(c.uses)} بار`} hint={toman(c.revenue)} ltr />
                ))}
              </Section>
            </>
          )}

          {view === 'promoters' && (
            <Section title="همهٔ پروموترها">
              {byPromoter.map((p, i) => (
                <LeaderRow key={p.id} rank={i + 1} title={p.name} sub={`@${p.tag} · ${fa(p.approved)} تأیید · ${fa(p.pending)} انتظار · ${fa(p.conversion)}٪`}
                  value={toman(p.commission)} hint={`درآمد ${toman(p.revenue)}`} />
              ))}
            </Section>
          )}

          {view === 'codes' && (
            <Section title="همهٔ کدها">
              {byCode.map((c, i) => (
                <LeaderRow key={c.id} rank={i + 1} title={c.code} sub={`${c.promoter} · ${fa(c.conversion)}٪ تبدیل`}
                  value={`${fa(c.uses)} استفاده`} hint={toman(c.revenue)} ltr />
              ))}
            </Section>
          )}

          {view === 'trend' && (
            <Section title="روند استفاده از کد">
              <DailyBars data={daily} />
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function DailyBars({ data }: { data: { at: number; uses: number; approved: number }[] }) {
  if (data.length === 0) return <div style={{ fontSize: 12, color: C.tmut, padding: '8px 0' }}>داده‌ای برای نمودار نیست.</div>
  const max = Math.max(...data.map(d => d.uses), 1)
  const show = data.slice(-30)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110, overflowX: 'auto', paddingBottom: 2 }}>
        {show.map((d, i) => (
          <div key={i} title={`${dayShort(d.at)}: ${fa(d.uses)} استفاده · ${fa(d.approved)} تأیید`} style={{ flex: '1 0 14px', minWidth: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span className="gl-num" style={{ fontSize: 9, color: C.tmut }}>{fa(d.uses)}</span>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 80, gap: 2 }}>
              <div style={{ width: '100%', height: `${(d.approved / max) * 72}px`, minHeight: d.approved ? 3 : 0, background: C.win, borderRadius: 3 }} />
              <div style={{ width: '100%', height: `${((d.uses - d.approved) / max) * 72}px`, minHeight: d.uses - d.approved ? 3 : 0, background: C.gold, borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 10.5, color: C.tbody }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: C.win, marginInlineEnd: 4 }} />تأیید</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: C.gold, marginInlineEnd: 4 }} />انتظار</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: C.tmut }}>
        <span>{dayShort(show[0].at)}</span>
        {show.length > 2 && <span>{dayShort(show[show.length - 1].at)}</span>}
      </div>
    </div>
  )
}

function LeaderRow({ rank, title, sub, value, hint, ltr }: { rank: number; title: string; sub: string; value: string; hint?: string; ltr?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0' }}>
      <span className="gl-num" style={{ width: 18, textAlign: 'center', fontWeight: 800, color: rank === 1 ? C.gold : C.tmut }}>{fa(rank)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div dir={ltr ? 'ltr' : undefined} style={{ fontFamily: ltr ? DISP : undefined, fontSize: 13, fontWeight: 700, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ textAlign: 'left' }}>
        <div className="gl-num" style={{ fontSize: 12.5, fontWeight: 800, color: C.thi }}>{value}</div>
        {hint && <div style={{ fontSize: 10, color: C.tmut, marginTop: 2 }}>{hint}</div>}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 16, padding: '14px 15px' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.thi, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function Tile({ label, value, color, sub, small }: { label: string; value: React.ReactNode; color: string; sub?: string; small?: boolean }) {
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: '13px 10px', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', textAlign: 'center' }}>
      <span className="gl-num" style={{ fontFamily: DISP, fontSize: small ? 15 : 22, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</span>
      <span style={{ fontSize: 10.5, color: C.tbody, fontWeight: 600 }}>{label}</span>
      {sub && <span style={{ fontSize: 9, color: C.tmut }}>{sub}</span>}
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
      <div className="gl-num" style={{ fontFamily: DISP, fontSize: 20, fontWeight: 800, color }}>{fa(value)}</div>
      <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 2 }}>{label}</div>
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
