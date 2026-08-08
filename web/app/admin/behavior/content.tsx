import Link from 'next/link'
import { allUsers } from '@/lib/store'
import { persist } from '@/lib/db/persistence'
import { C, DISP } from '@/components/ui'
import { faDigits, toJalali, J_MONTHS } from '@/lib/jalali'
import type { Disc } from '@/lib/mock-data'
import { isArenaEnabled } from '@/lib/arena-enabled'
import type { BehaviorRange } from '@/lib/behavior-range'
import { buildBehaviorStory, buildEmptyBehaviorStory, buildFunnelInsights, deltaPct, gamersCreatedInRange, type FunnelStep } from '@/lib/behavior-summary'
import BehaviorCommandBar from './command-bar'
import StoryBillboard from './story-billboard'
import type { BehaviorView } from './view-tabs'

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

const TRACKED_EVENTS = [
  'signup_start', 'signup_complete', 'profile_complete', 'ticket_select',
  'pay_page_view', 'receipt_submit', 'reg_approved', 'reg_rejected', 'pageview',
]

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

  const needRetention = view === 'retention' || view === 'overview'
  const needRaw = view === 'raw'
  const needPaths = view === 'paths'
  const needFunnel = view === 'funnel' || view === 'overview'

  const [
    funnelRows, prevFunnelRows, arenaFunnelRows, topPathRows, journeyRows,
    dauRows, prevDauRows, chat, retentionRows, rawRows,
  ] = await Promise.all([
    persist.track.funnelCounts(funnelNames, sinceMs, filters, untilMs),
    compare ? persist.track.funnelCounts(funnelNames, range.prevSince, filters, range.prevUntil) : Promise.resolve([]),
    isArenaEnabled() && needFunnel ? persist.track.funnelCounts(ARENA_FUNNEL_STEPS.map(s => s.name), sinceMs, filters, untilMs, 'arena') : Promise.resolve([]),
    needPaths ? persist.track.topPaths(sinceMs, 10, filters, untilMs) : Promise.resolve([]),
    needPaths ? persist.track.topJourneys(sinceMs, 8, filters, untilMs) : Promise.resolve([]),
    persist.track.dau(sinceMs, chartDays, filters, untilMs),
    compare ? persist.track.dau(range.prevSince, chartDays, filters, range.prevUntil) : Promise.resolve([]),
    needFunnel ? persist.track.chatCorrelation(sinceMs, filters) : Promise.resolve(null),
    needRetention ? persist.track.retentionGrid(sinceMs, filters, untilMs) : Promise.resolve([]),
    needRaw ? persist.track.listEvents(sinceMs, 50, filters, untilMs) : Promise.resolve([]),
  ])

  const counts = new Map(funnelRows.map(r => [r.name, Number(r.n)]))
  const prevCounts = new Map(prevFunnelRows.map(r => [r.name, Number(r.n)]))
  const realSignups = gamersCreatedInRange(allUsers(), sinceMs, untilMs, city, disc)
  const funnel: FunnelStep[] = FUNNEL_STEPS.map(s => ({
    ...s,
    n: s.name === 'signup_complete' ? realSignups : (counts.get(s.name) ?? 0),
  }))
  const first = funnel[0]?.n ?? 0
  const approved = counts.get('reg_approved') ?? 0
  const prevApproved = prevCounts.get('reg_approved') ?? 0

  const arenaCounts = new Map(arenaFunnelRows.map(r => [r.name, Number(r.n)]))
  const arenaFunnel = ARENA_FUNNEL_STEPS.map(s => ({ ...s, n: arenaCounts.get(s.name) ?? 0 }))
  const arenaFirst = arenaFunnel[0]?.n ?? 0

  const hasTrackData = funnel.some(f => f.n > 0) || dauRows.length > 0

  const rate = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null)
  const chatterRate = chat ? rate(Number(chat.chatters_approved), Number(chat.chatters_signed)) : null
  const nonChatterRate = chat ? rate(Number(chat.nonchatters_approved), Number(chat.nonchatters_signed)) : null

  const avgDau = dauRows.length ? Math.round(dauRows.reduce((a, d) => a + Number(d.n), 0) / dauRows.length) : 0
  const prevAvgDau = prevDauRows.length ? Math.round(prevDauRows.reduce((a, d) => a + Number(d.n), 0) / prevDauRows.length) : 0

  const story = hasTrackData
    ? buildBehaviorStory(funnel, days || chartDays, compare ? prevApproved : undefined)
    : buildEmptyBehaviorStory(days || chartDays)
  const insights = buildFunnelInsights(funnel)
  const showFunnelDrill = insights.some(i => i.tone === 'warn') || funnel.some(f => f.n > 0)

  const kpis = [
    { label: 'کاربر فعال روزانه', val: avgDau, delta: compare ? deltaPct(avgDau, prevAvgDau) : null, say: 'میانگین هر روز', invert: false, href: null as string | null, alert: false },
    { label: 'سهم تأییدشده', val: approved, delta: compare ? deltaPct(approved, prevApproved) : null, say: 'از track رویداد', invert: false, href: null, alert: false },
    { label: 'درآمد (M ت)', val: business.revenueM, delta: null, say: 'سهم‌های تأییدشده', invert: false, href: null, alert: false },
    { label: 'صف ادمین', val: business.pending, delta: null, say: 'منتظر تأیید', invert: true, href: business.pending > 0 ? '/admin/requests' : null, alert: business.pending > 0 },
  ]

  return (
    <div style={{ padding: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BehaviorCommandBar cityOptions={cityOptions} discOptions={discOptions} rangeLabel={label} compare={compare} />

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <StoryBillboard text={story} pending={business.pending} showFunnelDrill={showFunnelDrill} />

        <div className="gl-behavior-kpi">
          {kpis.map(k => <KpiCard key={k.label} {...k} />)}
        </div>

        {!hasTrackData && <TrackingGuide />}

        {view === 'funnel' && (
          <>
            <div className="gl-behavior-split">
              <Section title="قیف ثبت‌نام" sub="هر مرحله = تعداد کاربر یکتا · درصد = نسبت به مرحله قبل">
                <FunnelBars funnel={funnel} first={first} rate={rate} />
              </Section>
              {insights.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.thi, marginBottom: 2 }}>نکات</div>
                  {insights.map(x => <Insight key={x.title} {...x} />)}
                </div>
              )}
            </div>
            {isArenaEnabled() && (
              <Section title="قیف میدون" sub="از باز کردن تب تا امتیاز">
                <FunnelBars funnel={arenaFunnel} first={arenaFirst} rate={rate} barColor={C.gold} />
              </Section>
            )}
            {chat && (Number(chat.chatters_signed) > 0 || Number(chat.nonchatters_signed) > 0) && (
              <Section title="دستیار و تأیید" sub="آیا چت با دستیار به تأیید بیشتر منجر شده؟">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                  <ChatTile label="با دستیار" rate={chatterRate} n={Number(chat.chatters_signed)} color={C.accent} />
                  <ChatTile label="بدون دستیار" rate={nonChatterRate} n={Number(chat.nonchatters_signed)} color={C.tbody} />
                </div>
              </Section>
            )}
          </>
        )}

        {view === 'retention' && (
          <Section title="برگشت کاربر (هفتگی)" sub={`هر ردیف = هفته signup · ${label}`}>
            <RetentionGrid rows={retentionRows} />
          </Section>
        )}

        {view === 'paths' && (
          <>
            <Section title="مسیرهای پرتکرار (۲ قدم)" sub="ترتیب pageview داخل session">
              {journeyRows.length === 0 ? <Empty text="مسیر کافی نیست — وقتی pageview جمع بشه اینجا پر می‌شه" /> : journeyRows.map(j => (
                <PathRow key={j.journey} path={j.journey} n={Number(j.n)} max={Math.max(...journeyRows.map(x => Number(x.n)))} />
              ))}
            </Section>
            <Section title="پربازدیدترین صفحه‌ها">
              {topPathRows.length === 0 ? <Empty text="هنوز pageview ثبت نشده" /> : topPathRows.map(p => (
                <PathRow key={p.path} path={p.path || '/'} n={Number(p.n)} max={Math.max(...topPathRows.map(x => Number(x.n)))} />
              ))}
            </Section>
          </>
        )}

        {view === 'raw' && (
          <Section title="آخرین رویدادها" sub="۵۰ تا اخیر · CSV برای همه">
            {rawRows.length === 0 ? <Empty text="رویدادی ثبت نشده" /> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr>{['زمان', 'رویداد', 'کاربر', 'مسیر'].map(h => (
                      <th key={h} style={{ padding: '8px 4px', textAlign: 'right', color: C.tmut, borderBottom: `1px solid ${C.line}`, fontWeight: 700 }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {rawRows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '6px 4px', color: C.tmut, whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleString('fa-IR')}</td>
                        <td style={{ padding: '6px 4px', color: C.thi, fontWeight: 600 }}>{r.name}</td>
                        <td dir="ltr" style={{ padding: '6px 4px', color: C.tbody, fontSize: 9 }}>{r.user_id?.slice(0, 8) ?? r.session_id.slice(0, 8)}</td>
                        <td dir="ltr" style={{ padding: '6px 4px', color: C.tbody, textAlign: 'left' }}>{r.path}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        )}

        {view === 'overview' && (
          <>
            <Section title="کاربر فعال روزانه" sub={compare ? 'بنفش = این بازه · طلایی = دوره قبل' : `${fa(chartDays)} روز`}>
              <DauBars data={dauRows} prev={compare ? prevDauRows : undefined} />
            </Section>
            {retentionRows.length > 0 && (
              <Section title="ماندگاری (خلاصه)" sub="جزئیات کامل در تب ماندگاری">
                <RetentionGrid rows={retentionRows.slice(0, 24)} compact />
              </Section>
            )}
            {hasTrackData && (
              <Section title="قیف (خلاصه)" sub="جزئیات و نکات در تب قیف">
                <FunnelBars funnel={funnel.slice(0, 5)} first={first} rate={rate} compact />
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TrackingGuide() {
  return (
    <div style={{ background: C.sf2, border: `1px dashed ${C.line2}`, borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.thi, marginBottom: 6 }}>tracking فعاله — داده هنوز نرسیده</div>
      <div style={{ fontSize: 11, color: C.tbody, lineHeight: 1.75, marginBottom: 10 }}>
        از دیپلوی اخیر این رویدادها جمع می‌شن. یک ثبت‌نام تست یا چند بازدید صفحه کافیه تا بیلبورد پر بشه.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {TRACKED_EVENTS.map(e => (
          <span key={e} dir="ltr" style={{ fontSize: 9, fontWeight: 700, color: C.accent, background: C.accentSoft, border: `1px solid rgba(168,85,247,.25)`, borderRadius: 6, padding: '4px 8px' }}>
            {e}
          </span>
        ))}
      </div>
    </div>
  )
}

function KpiCard({ label, val, delta, say, invert, href, alert }: {
  label: string; val: number; delta: number | null; say: string; invert: boolean; href: string | null; alert: boolean
}) {
  const up = delta != null && delta >= 0
  const good = invert ? !up : up
  const inner = (
    <>
      <div style={{ fontSize: 10, color: C.tmut }}>{label}</div>
      <div className="gl-num" style={{ fontFamily: DISP, fontSize: 22, fontWeight: 800, color: alert ? C.live : C.thi, lineHeight: 1.1 }}>{fa(val)}</div>
      {delta != null && (
        <div className="gl-num" style={{ fontSize: 10, fontWeight: 700, marginTop: 4, color: good ? C.win : C.live }}>
          {up ? '↑' : '↓'} {fa(Math.abs(delta))}٪
        </div>
      )}
      <div style={{ fontSize: 10, color: C.tbody, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.line}` }}>{say}</div>
    </>
  )
  const boxStyle: React.CSSProperties = {
    background: C.sf1,
    border: `1px solid ${alert ? C.live : C.line}`,
    borderRadius: 14,
    padding: '12px 10px',
    display: 'block',
    textDecoration: 'none',
    transition: 'border-color .15s ease',
  }
  if (href) return <Link href={href} style={boxStyle}>{inner}</Link>
  return <div style={boxStyle}>{inner}</div>
}

function FunnelBars({ funnel, first, rate, barColor = C.accent, compact }: {
  funnel: FunnelStep[]; first: number; rate: (a: number, b: number) => number | null; barColor?: string; compact?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 10 }}>
      {funnel.map((s, i) => {
        const pctOfFirst = first > 0 ? (s.n / first) * 100 : 0
        const prev = i > 0 ? funnel[i - 1].n : null
        const pctOfPrev = prev ? rate(s.n, prev) : null
        const warn = pctOfPrev !== null && pctOfPrev < 50
        return (
          <div key={s.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: compact ? 11 : 12.5, gap: 8 }}>
              <span style={{ fontWeight: 700, color: C.thi }}>{s.label}</span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'baseline', flexShrink: 0 }}>
                {pctOfPrev !== null && (
                  <span className="gl-num" style={{ fontSize: 10, color: warn ? C.live : C.tmut }}>٪{fa(pctOfPrev)}</span>
                )}
                <span className="gl-num" style={{ fontFamily: DISP, fontWeight: 800, color: C.thi }}>{fa(s.n)}</span>
              </span>
            </div>
            <div style={{ height: compact ? 7 : 10, borderRadius: 999, background: C.sf2, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.max(pctOfFirst, s.n > 0 ? 2 : 0)}%`,
                height: '100%',
                background: warn ? `linear-gradient(90deg, ${C.live}, rgba(255,90,78,.6))` : `linear-gradient(90deg, ${barColor}, ${C.gold})`,
                borderRadius: 999,
                transition: 'width .2s ease',
              }} />
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
            <th style={{ textAlign: 'right', color: C.tmut, padding: 6, fontWeight: 700 }}>هفته signup</th>
            {weeks.map(w => <th key={w} style={{ textAlign: 'center', color: C.tmut, padding: 6, fontWeight: 700 }}>ه{fa(w)}</th>)}
          </tr>
        </thead>
        <tbody>
          {cohorts.map(w0 => (
            <tr key={w0}>
              <td style={{ padding: 6, color: C.thi, whiteSpace: 'nowrap' }}>{dayShort(w0)}</td>
              {weeks.map(wk => {
                const { pct, size } = cell(w0, wk)
                const bg = pct >= 40 ? 'rgba(63,190,134,.2)' : pct >= 20 ? 'rgba(245,166,35,.15)' : 'rgba(255,90,78,.1)'
                return (
                  <td key={wk} style={{ textAlign: 'center', padding: 4 }}>
                    <span className="gl-num" title={`${size} نفر cohort`} style={{ display: 'block', borderRadius: 6, padding: '5px 2px', background: bg, fontWeight: 700, color: C.thi }}>{fa(pct)}٪</span>
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: '6px 0' }}>
      <div style={{ minWidth: 0 }}>
        <div dir="ltr" style={{ fontSize: 11, fontWeight: 700, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{path}</div>
        <div style={{ height: 8, borderRadius: 999, background: C.sf2, marginTop: 4, overflow: 'hidden' }}>
          <div style={{ width: `${max > 0 ? (n / max) * 100 : 0}%`, height: '100%', background: `linear-gradient(90deg, ${C.accent}, ${C.gold})`, borderRadius: 999 }} />
        </div>
      </div>
      <span className="gl-num" style={{ fontFamily: DISP, fontSize: 13, fontWeight: 800, color: C.thi }}>{fa(n)}</span>
    </div>
  )
}

function Insight({ tone, title, text }: { tone: 'warn' | 'good' | 'neutral'; title: string; text: string }) {
  const border = tone === 'warn' ? C.live : tone === 'good' ? C.win : C.accent
  return (
    <div style={{ background: C.sf2, borderRadius: 10, padding: 10, borderRight: `3px solid ${border}` }}>
      <b style={{ fontSize: 11, color: C.thi, display: 'block' }}>{title}</b>
      <div style={{ fontSize: 10, color: C.tbody, marginTop: 3, lineHeight: 1.6 }}>{text}</div>
    </div>
  )
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 16, padding: '14px 15px' }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>{title}</div>
        {sub && <div style={{ fontSize: 10, color: C.tmut, marginTop: 4, lineHeight: 1.6 }}>{sub}</div>}
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
  if (!data.length) return <Empty text="هنوز فعالیت روزانه ثبت نشده" />
  const max = Math.max(...data.map(d => Number(d.n)), ...(prev?.map(d => Number(d.n)) ?? [0]), 1)
  return (
    <div>
      <div className="gl-scroll" style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, overflowX: 'auto', paddingBottom: 4 }}>
        {data.map((d, i) => (
          <div key={i} title={dayShort(d.day)} style={{ flex: '1 0 16px', minWidth: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span className="gl-num" style={{ fontSize: 9, color: C.tmut }}>{fa(Number(d.n))}</span>
            <div style={{ width: '100%', position: 'relative', height: 84 }}>
              {prev?.[i] && Number(prev[i].n) > 0 && (
                <div style={{
                  position: 'absolute', bottom: 0, width: '100%',
                  height: `${(Number(prev[i].n) / max) * 84}px`,
                  background: 'rgba(245,166,35,.35)', borderRadius: 4,
                }} />
              )}
              <div style={{
                position: 'absolute', bottom: 0, width: '100%',
                height: `${(Number(d.n) / max) * 84}px`,
                minHeight: Number(d.n) > 0 ? 3 : 0,
                background: C.accent, borderRadius: 4,
              }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: C.tmut }}>
        <span>{dayShort(data[0].day)}</span>
        {prev?.length ? <span style={{ color: C.gold }}>— دوره قبل</span> : null}
        {data.length > 2 && <span>{dayShort(data[data.length - 1].day)}</span>}
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ fontSize: 12, color: C.tmut, padding: '8px 0', lineHeight: 1.6 }}>{text}</div>
}
