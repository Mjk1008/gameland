import { persist } from '@/lib/db/persistence'
import { C, DISP, EmptyState } from '@/components/ui'
import { faDigits, toJalali, J_MONTHS } from '@/lib/jalali'
import type { Disc } from '@/lib/mock-data'
import { isArenaEnabled } from '@/lib/arena-enabled'
import type { BehaviorRange } from '@/lib/behavior-range'
import { buildBehaviorStory, buildFunnelInsights, deltaPct, type FunnelStep } from '@/lib/behavior-summary'
import BehaviorFilters from './filters'
import BehaviorViewTabs, { type BehaviorView } from './view-tabs'

const FUNNEL_STEPS = [
  { name: 'signup_start',     label: 'شروع ثبت‌نام' },
  { name: 'signup_complete',  label: 'ساخت حساب' },
  { name: 'profile_complete', label: 'تکمیل پروفایل' },
  { name: 'ticket_select',    label: 'انتخاب بلیط' },
  { name: 'pay_page_view',    label: 'صفحهٔ پرداخت' },
  { name: 'receipt_submit',   label: 'ارسال فیش' },
  { name: 'reg_approved',     label: 'تایید نهایی' },
  { name: 'reg_rejected',     label: 'رد شده' },
] as const

const ARENA_FUNNEL_STEPS = [
  { name: 'arena_tab_open',       label: 'باز کردن میدون' },
  { name: 'arena_feed_view',      label: 'دیدن فید' },
  { name: 'arena_request_create', label: 'درخواست جدید' },
  { name: 'arena_request_accept', label: 'قبول درخواست' },
  { name: 'arena_pair_confirm',   label: 'تأیید دوطرفه' },
  { name: 'arena_book_complete',  label: 'بوک کامل' },
  { name: 'arena_result_confirm', label: 'ثبت نتیجه' },
  { name: 'arena_points_awarded', label: 'امتیاز داده شد' },
] as const

export type BehaviorBusiness = { pending: number; approvedTickets: number; revenueM: number }

const fa = (n: number | string) => faDigits(n)
const dayShort = (isoOrDate: string) => {
  const d = new Date(isoOrDate)
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return `${fa(j.jd)} ${J_MONTHS[j.jm - 1].slice(0, 3)}`
}

export default async function BehaviorContent({
  range,
  view = 'overview',
  city = 'all',
  disc = 'all',
  cityOptions = [] as string[],
  discOptions = [] as { key: Disc; name: string }[],
  business = { pending: 0, approvedTickets: 0, revenueM: 0 } as BehaviorBusiness,
}: {
  range: BehaviorRange
  view?: BehaviorView
  city?: string
  disc?: string
  cityOptions?: string[]
  discOptions?: { key: Disc; name: string }[]
  business?: BehaviorBusiness
}) {
  const { sinceMs, untilMs, chartDays, compare, days, label } = range
  const filters = { city, disc }
  const funnelNames = FUNNEL_STEPS.map(s => s.name)

  const [
    funnelRows, prevFunnelRows, arenaFunnelRows, topPathRows, journeyRows,
    dauRows, prevDauRows, chat, retentionRows, rawRows,
  ] = await Promise.all([
    persist.track.funnelCounts(funnelNames, sinceMs, filters, untilMs),
    compare ? persist.track.funnelCounts(funnelNames, range.prevSince, filters, range.prevUntil) : Promise.resolve([]),
    isArenaEnabled() ? persist.track.funnelCounts(ARENA_FUNNEL_STEPS.map(s => s.name), sinceMs, filters, untilMs) : Promise.resolve([]),
    persist.track.topPaths(sinceMs, 10, filters, untilMs),
    persist.track.topJourneys(sinceMs, 8, filters, untilMs),
    persist.track.dau(sinceMs, chartDays, filters, untilMs),
    compare ? persist.track.dau(range.prevSince, chartDays, filters, range.prevUntil) : Promise.resolve([]),
    persist.track.chatCorrelation(sinceMs, filters),
    view === 'retention' || view === 'overview' ? persist.track.retentionGrid(sinceMs, filters, untilMs) : Promise.resolve([]),
    view === 'raw' ? persist.track.listEvents(sinceMs, 50, filters, untilMs) : Promise.resolve([]),
  ])

  const counts = new Map(funnelRows.map(r => [r.name, Number(r.n)]))
  const prevCounts = new Map(prevFunnelRows.map(r => [r.name, Number(r.n)]))
  const funnel: FunnelStep[] = FUNNEL_STEPS.map(s => ({ ...s, n: counts.get(s.name) ?? 0 }))
  const first = funnel[0]?.n ?? 0
  const approved = counts.get('reg_approved') ?? 0
  const prevApproved = prevCounts.get('reg_approved') ?? 0

  const arenaCounts = new Map(arenaFunnelRows.map(r => [r.name, Number(r.n)]))
  const arenaFunnel = ARENA_FUNNEL_STEPS.map(s => ({ ...s, n: arenaCounts.get(s.name) ?? 0 }))
  const arenaFirst = arenaFunnel[0]?.n ?? 0

  const hasData = funnel.some(f => f.n > 0) || topPathRows.length > 0 || dauRows.length > 0 || journeyRows.length > 0

  const rate = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null)
  const chatterRate = chat ? rate(Number(chat.chatters_approved), Number(chat.chatters_signed)) : null
  const nonChatterRate = chat ? rate(Number(chat.nonchatters_approved), Number(chat.nonchatters_signed)) : null

  const avgDau = dauRows.length ? Math.round(dauRows.reduce((a, d) => a + Number(d.n), 0) / dauRows.length) : 0
  const prevAvgDau = prevDauRows.length ? Math.round(prevDauRows.reduce((a, d) => a + Number(d.n), 0) / prevDauRows.length) : 0

  const story = buildBehaviorStory(funnel, days || chartDays, compare ? prevApproved : undefined)
  const insights = buildFunnelInsights(funnel)

  const kpis = [
    { label: 'کاربر فعال روزانه', val: avgDau, delta: compare ? deltaPct(avgDau, prevAvgDau) : null, say: 'میانگین هر روز', invert: false },
    { label: 'سهم تأییدشده', val: approved, delta: compare ? deltaPct(approved, prevApproved) : null, say: 'از track', invert: false },
    { label: 'درآمد (M ت)', val: business.revenueM, delta: null, say: 'سهم‌های تأییدشده', invert: false },
    { label: 'صف ادمین', val: business.pending, delta: null, say: 'منتظر تأیید', invert: true },
  ]

  return (
    <div style={{ padding: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <BehaviorFilters cityOptions={cityOptions} discOptions={discOptions} />
      <BehaviorViewTabs />

      {!hasData ? (
        <div style={{ margin: '0 16px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 16 }}>
          <EmptyState text="داده‌ای نیست — tracking از دیپلوی اخیر جمع می‌شه." />
        </div>
      ) : view === 'retention' ? (
        <div style={{ padding: '0 16px' }}>
          <Section title="برگشت کاربر (هفتگی)" sub={`کohort = هفته signup · ${label}`}>
            <RetentionGrid rows={retentionRows} />
          </Section>
        </div>
      ) : view === 'paths' ? (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Section title="مسیرهای پرتکرار (۲ قدم)" sub="ترتیب pageview داخل session">
            {journeyRows.length === 0 ? <Empty text="مسیر کافی نیست" /> : journeyRows.map(j => (
              <PathRow key={j.journey} path={j.journey} n={Number(j.n)} max={Math.max(...journeyRows.map(x => Number(x.n)))} />
            ))}
          </Section>
          <Section title="پربازدیدترین صفحه‌ها">
            {topPathRows.map(p => (
              <PathRow key={p.path} path={p.path || '/'} n={Number(p.n)} max={Math.max(...topPathRows.map(x => Number(x.n)))} />
            ))}
          </Section>
        </div>
      ) : view === 'raw' ? (
        <div style={{ padding: '0 16px' }}>
          <Section title="آخرین رویدادها" sub="۵۰ تا اخیر · CSV برای همه">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                  <tr>{['زمان', 'رویداد', 'کاربر', 'مسیر'].map(h => (
                    <th key={h} style={{ padding: '6px 4px', textAlign: 'right', color: C.tmut, borderBottom: `1px solid ${C.line}` }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {rawRows.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: '5px 4px', color: C.tmut, whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleString('fa-IR')}</td>
                      <td style={{ padding: '5px 4px', color: C.thi }}>{r.name}</td>
                      <td dir="ltr" style={{ padding: '5px 4px', color: C.tbody, fontSize: 9 }}>{r.user_id?.slice(0, 8) ?? r.session_id.slice(0, 8)}</td>
                      <td dir="ltr" style={{ padding: '5px 4px', color: C.tbody, textAlign: 'left' }}>{r.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      ) : (
        <>
          <div style={{ padding: '0 16px' }}><StoryCard text={story} /></div>
          <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {kpis.map(k => <KpiCard key={k.label} {...k} />)}
          </div>
          <div style={{ padding: '0 16px' }}>
            <Section title="قیف ثبت‌نام">
              <FunnelBars funnel={funnel} first={first} rate={rate} />
              {insights.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                  {insights.map(x => <Insight key={x.title} {...x} />)}
                </div>
              )}
            </Section>
          </div>
          {isArenaEnabled() && (
            <div style={{ padding: '0 16px' }}>
              <Section title="قیف میدون"><FunnelBars funnel={arenaFunnel} first={arenaFirst} rate={rate} barColor={C.gold} /></Section>
            </div>
          )}
          {chat && (Number(chat.chatters_signed) > 0 || Number(chat.nonchatters_signed) > 0) && (
            <div style={{ padding: '0 16px' }}>
              <Section title="دستیار و تأیید">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                  <ChatTile label="با دستیار" rate={chatterRate} n={Number(chat.chatters_signed)} color={C.accent} />
                  <ChatTile label="بدون دستیار" rate={nonChatterRate} n={Number(chat.nonchatters_signed)} color={C.tbody} />
                </div>
              </Section>
            </div>
          )}
          <div style={{ padding: '0 16px' }}>
            <Section title={`فعالیت روزانه (${fa(chartDays)} روز)`} sub={compare ? 'نسبت به دوره قبل در KPI' : undefined}>
              <DauBars data={dauRows} prev={prevDauRows} />
            </Section>
          </div>
          {retentionRows.length > 0 && (
            <div style={{ padding: '0 16px' }}>
              <Section title="ماندگاری (خلاصه)" sub="جزئیات در تب ماندگاری">
                <RetentionGrid rows={retentionRows.slice(0, 24)} compact />
              </Section>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StoryCard({ text }: { text: string }) {
  return (
    <div style={{ background: 'linear-gradient(135deg,rgba(168,85,247,.08),rgba(245,166,35,.06))', border: '1px solid rgba(168,85,247,.25)', borderRadius: 16, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: C.accent, marginBottom: 6 }}>خلاصه</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.85, color: C.thi }}>{text}</div>
    </div>
  )
}

function KpiCard({ label, val, delta, say, invert }: { label: string; val: number; delta: number | null; say: string; invert: boolean }) {
  const up = delta != null && delta >= 0
  const good = invert ? !up : up
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: '12px 10px' }}>
      <div style={{ fontSize: 10, color: C.tmut }}>{label}</div>
      <div className="gl-num" style={{ fontFamily: DISP, fontSize: 22, fontWeight: 800, color: C.thi }}>{fa(val)}</div>
      {delta != null && <div className="gl-num" style={{ fontSize: 10, fontWeight: 700, marginTop: 4, color: good ? C.win : C.live }}>{up ? '↑' : '↓'} {fa(Math.abs(delta))}٪</div>}
      <div style={{ fontSize: 10, color: C.tbody, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.line}` }}>{say}</div>
    </div>
  )
}

function FunnelBars({ funnel, first, rate, barColor = C.accent }: { funnel: FunnelStep[]; first: number; rate: (a: number, b: number) => number | null; barColor?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {funnel.map((s, i) => {
        const pctOfFirst = first > 0 ? (s.n / first) * 100 : 0
        const prev = i > 0 ? funnel[i - 1].n : null
        const pctOfPrev = prev ? rate(s.n, prev) : null
        const warn = pctOfPrev !== null && pctOfPrev < 50
        return (
          <div key={s.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12.5 }}>
              <span style={{ fontWeight: 700, color: C.thi }}>{s.label}</span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                {pctOfPrev !== null && <span className="gl-num" style={{ fontSize: 10.5, color: warn ? C.live : C.tmut }}>٪{fa(pctOfPrev)}</span>}
                <span className="gl-num" style={{ fontFamily: DISP, fontWeight: 800 }}>{fa(s.n)}</span>
              </span>
            </div>
            <div style={{ height: 14, borderRadius: 7, background: C.sf2, overflow: 'hidden' }}>
              <div style={{ width: `${pctOfFirst}%`, height: '100%', background: warn ? C.live : barColor, borderRadius: 7 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RetentionGrid({ rows, compact }: { rows: { w0: string; cohort_size: number; wk: number; active: number }[]; compact?: boolean }) {
  if (!rows.length) return <Empty text="signup کافی برای cohort نیست" />
  const cohorts = [...new Set(rows.map(r => r.w0))].sort().reverse()
  const weeks = [...new Set(rows.map(r => r.wk))].sort((a, b) => a - b)
  const cell = (w0: string, wk: number) => {
    const row = rows.find(r => r.w0 === w0 && r.wk === wk)
    const size = rows.find(r => r.w0 === w0)?.cohort_size ?? 0
    const active = row?.active ?? 0
    const pct = size > 0 ? Math.round((active / size) * 100) : 0
    return { pct, active, size }
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: compact ? 9 : 10 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'right', color: C.tmut, padding: 4 }}>هفته signup</th>
            {weeks.map(w => <th key={w} style={{ textAlign: 'center', color: C.tmut, padding: 4 }}>ه{fa(w)}</th>)}
          </tr>
        </thead>
        <tbody>
          {cohorts.map(w0 => (
            <tr key={w0}>
              <td style={{ padding: 4, color: C.thi, whiteSpace: 'nowrap' }}>{dayShort(w0)}</td>
              {weeks.map(wk => {
                const { pct, size } = cell(w0, wk)
                const bg = pct >= 40 ? 'rgba(63,190,134,.2)' : pct >= 20 ? 'rgba(245,166,35,.15)' : 'rgba(255,90,78,.1)'
                return (
                  <td key={wk} style={{ textAlign: 'center', padding: 4 }}>
                    <span className="gl-num" title={`${size} نفر cohort`} style={{ display: 'block', borderRadius: 6, padding: '4px 2px', background: bg, fontWeight: 700, color: C.thi }}>{fa(pct)}٪</span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PathRow({ path, n, max }: { path: string; n: number; max: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: '5px 0' }}>
      <div style={{ minWidth: 0 }}>
        <div dir="ltr" style={{ fontSize: 11, fontWeight: 700, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{path}</div>
        <div style={{ height: 8, borderRadius: 4, background: C.sf2, marginTop: 4, overflow: 'hidden' }}>
          <div style={{ width: `${max > 0 ? (n / max) * 100 : 0}%`, height: '100%', background: C.accent, borderRadius: 4 }} />
        </div>
      </div>
      <span className="gl-num" style={{ fontFamily: DISP, fontSize: 13, fontWeight: 800 }}>{fa(n)}</span>
    </div>
  )
}

function Insight({ tone, title, text }: { tone: 'warn' | 'good' | 'neutral'; title: string; text: string }) {
  const border = tone === 'warn' ? C.live : tone === 'good' ? C.win : C.accent
  return (
    <div style={{ background: C.sf2, borderRadius: 10, padding: 10, borderRight: `3px solid ${border}` }}>
      <b style={{ fontSize: 11, color: C.thi }}>{title}</b>
      <div style={{ fontSize: 10, color: C.tbody, marginTop: 3 }}>{text}</div>
    </div>
  )
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 16, padding: '14px 15px' }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>{title}</div>
        {sub && <div style={{ fontSize: 10, color: C.tmut, marginTop: 4 }}>{sub}</div>}
      </div>
      {children}
    </div>
  )
}

function ChatTile({ label, rate, n, color }: { label: string; rate: number | null; n: number; color: string }) {
  return (
    <div style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 13, padding: '13px 10px', textAlign: 'center' }}>
      <span className="gl-num" style={{ fontFamily: DISP, fontSize: 23, fontWeight: 800, color }}>{rate === null ? '—' : `٪${fa(rate)}`}</span>
      <div style={{ fontSize: 10.5, color: C.tbody, marginTop: 4 }}>{label} · {fa(n)} نفر</div>
    </div>
  )
}

function DauBars({ data, prev }: { data: { day: string; n: string }[]; prev?: { day: string; n: string }[] }) {
  if (!data.length) return <Empty text="داده‌ای نیست" />
  const max = Math.max(...data.map(d => Number(d.n)), ...(prev?.map(d => Number(d.n)) ?? [0]))
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, overflowX: 'auto' }}>
        {data.map((d, i) => (
          <div key={i} title={dayShort(d.day)} style={{ flex: '1 0 14px', minWidth: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span className="gl-num" style={{ fontSize: 9, color: C.tmut }}>{fa(Number(d.n))}</span>
            <div style={{ width: '100%', position: 'relative', height: `${max > 0 ? (Number(d.n) / max) * 74 : 3}px`, minHeight: 3 }}>
              {prev?.[i] && <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${max > 0 ? (Number(prev[i].n) / max) * 74 : 0}px`, background: 'rgba(245,166,35,.35)', borderRadius: 4 }} />}
              <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '100%', background: C.accent, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: C.tmut }}>
        <span>{dayShort(data[0].day)}</span>
        <span style={{ color: C.gold }}>— دوره قبل</span>
        {data.length > 2 && <span>{dayShort(data[data.length - 1].day)}</span>}
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ fontSize: 12, color: C.tmut, padding: '8px 0' }}>{text}</div>
}
