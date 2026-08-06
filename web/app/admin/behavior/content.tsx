import { persist } from '@/lib/db/persistence'
import { C, DISP, EmptyState } from '@/components/ui'
import { faDigits, toJalali, J_MONTHS } from '@/lib/jalali'

// Registration funnel, in order — see docs/24-analytics-prd.md §5.
const FUNNEL_STEPS = [
  { name: 'signup_start',     label: 'شروع ثبت‌نام' },
  { name: 'signup_complete',  label: 'ساخت حساب' },
  { name: 'profile_complete', label: 'تکمیل پروفایل' },
  { name: 'ticket_select',    label: 'انتخاب بلیط' },
  { name: 'pay_page_view',    label: 'صفحهٔ پرداخت' },
  { name: 'receipt_submit',   label: 'ارسال فیش' },
  { name: 'reg_approved',     label: 'تایید نهایی' },
] as const

const ARENA_FUNNEL_STEPS = [
  { name: 'arena_tab_open',         label: 'باز کردن میدون' },
  { name: 'arena_feed_view',        label: 'دیدن فید' },
  { name: 'arena_request_create',   label: 'درخواست جدید' },
  { name: 'arena_request_accept',   label: 'قبول درخواست' },
  { name: 'arena_pair_confirm',     label: 'تأیید دوطرفه' },
  { name: 'arena_book_complete',    label: 'بوک کامل' },
  { name: 'arena_result_confirm',   label: 'ثبت نتیجه' },
  { name: 'arena_points_awarded',   label: 'امتیاز داده شد' },
] as const

const fa = (n: number | string) => faDigits(n)
const dayShort = (isoOrDate: string) => {
  const d = new Date(isoOrDate)
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return `${fa(j.jd)} ${J_MONTHS[j.jm - 1].slice(0, 3)}`
}

// Guts of the behavior dashboard, no BackHeader — reused standalone
// (app/admin/behavior/page.tsx) and embedded as a tab inside /admin/analytics.
export default async function BehaviorContent() {
  const [funnelRows, arenaFunnelRows, topPathRows, dauRows, chat] = await Promise.all([
    persist.track.funnelCounts(FUNNEL_STEPS.map(s => s.name), 0),
    persist.track.funnelCounts(ARENA_FUNNEL_STEPS.map(s => s.name), 0),
    persist.track.topPaths(0, 10),
    persist.track.dau(14),
    persist.track.chatCorrelation(0),
  ])

  const counts = new Map(funnelRows.map(r => [r.name, Number(r.n)]))
  const funnel = FUNNEL_STEPS.map(s => ({ ...s, n: counts.get(s.name) ?? 0 }))
  const arenaCounts = new Map(arenaFunnelRows.map(r => [r.name, Number(r.n)]))
  const arenaFunnel = ARENA_FUNNEL_STEPS.map(s => ({ ...s, n: arenaCounts.get(s.name) ?? 0 }))
  const arenaFirst = arenaFunnel[0]?.n ?? 0
  const first = funnel[0]?.n ?? 0
  const hasData = funnel.some(f => f.n > 0) || arenaFunnel.some(f => f.n > 0) || topPathRows.length > 0 || dauRows.length > 0

  const rate = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null)
  const chatterRate = chat ? rate(Number(chat.chatters_approved), Number(chat.chatters_signed)) : null
  const nonChatterRate = chat ? rate(Number(chat.nonchatters_approved), Number(chat.nonchatters_signed)) : null

  return (
    <div style={{ padding: '0 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {!hasData ? (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 16 }}>
          <EmptyState text="داده‌ای هنوز نیست — از لحظهٔ دیپلوی این بخش، رفتار کاربرها اینجا جمع می‌شه." />
        </div>
      ) : (
        <>
          {/* ── Registration funnel ── */}
          <Section title="قیفِ ثبت‌نام">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {funnel.map((s, i) => {
                const pctOfFirst = first > 0 ? (s.n / first) * 100 : 0
                const prev = i > 0 ? funnel[i - 1].n : null
                const pctOfPrev = prev ? rate(s.n, prev) : null
                return (
                  <div key={s.name}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: C.thi }}>{s.label}</span>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        {pctOfPrev !== null && <span className="gl-num" style={{ fontSize: 10.5, color: pctOfPrev < 50 ? C.live : C.tmut }}>٪{fa(pctOfPrev)} از قبلی</span>}
                        <span className="gl-num" style={{ fontFamily: DISP, fontSize: 14, fontWeight: 800, color: C.thi }}>{fa(s.n)}</span>
                      </span>
                    </div>
                    <div style={{ height: 14, borderRadius: 7, background: C.sf2, overflow: 'hidden' }}>
                      <div style={{ width: `${pctOfFirst}%`, height: '100%', background: pctOfPrev !== null && pctOfPrev < 50 ? C.live : C.accent, borderRadius: 7 }} />
                    </div>
                  </div>
                )
              })}
            </div>
            {first === 0 && <div style={{ fontSize: 11, color: C.tmut, marginTop: 10 }}>هنوز کسی وارد ثبت‌نام نشده.</div>}
          </Section>

          {/* ── Arena funnel ── */}
          <Section title="قیفِ میدون">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {arenaFunnel.map((s, i) => {
                const pctOfFirst = arenaFirst > 0 ? (s.n / arenaFirst) * 100 : 0
                const prev = i > 0 ? arenaFunnel[i - 1].n : null
                const pctOfPrev = prev ? rate(s.n, prev) : null
                return (
                  <div key={s.name}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: C.thi }}>{s.label}</span>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        {pctOfPrev !== null && <span className="gl-num" style={{ fontSize: 10.5, color: pctOfPrev < 50 ? C.live : C.tmut }}>٪{fa(pctOfPrev)} از قبلی</span>}
                        <span className="gl-num" style={{ fontFamily: DISP, fontSize: 14, fontWeight: 800, color: C.thi }}>{fa(s.n)}</span>
                      </span>
                    </div>
                    <div style={{ height: 14, borderRadius: 7, background: C.sf2, overflow: 'hidden' }}>
                      <div style={{ width: `${pctOfFirst}%`, height: '100%', background: C.gold, borderRadius: 7 }} />
                    </div>
                  </div>
                )
              })}
            </div>
            {arenaFirst === 0 && <div style={{ fontSize: 11, color: C.tmut, marginTop: 10 }}>هنوز فعالیتی در میدون ثبت نشده.</div>}
          </Section>

          {/* ── Chat correlation ── */}
          {chat && (Number(chat.chatters_signed) > 0 || Number(chat.nonchatters_signed) > 0) && (
            <Section title="آیا صحبت با دستیار روی تایید نهایی اثر داره؟">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                <ChatTile label="با دستیار حرف زده" rate={chatterRate} n={Number(chat.chatters_signed)} color={C.accent} />
                <ChatTile label="حرف نزده" rate={nonChatterRate} n={Number(chat.nonchatters_signed)} color={C.tbody} />
              </div>
            </Section>
          )}

          {/* ── DAU ── */}
          <Section title="کاربر فعال روزانه (۱۴ روز)">
            <DauBars data={dauRows} />
          </Section>

          {/* ── Top paths ── */}
          <Section title="پربازدیدترین صفحه‌ها">
            {topPathRows.length === 0 ? (
              <div style={{ fontSize: 12, color: C.tmut, padding: '4px 0' }}>هنوز بازدیدی ثبت نشده.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {(() => { const max = Math.max(...topPathRows.map(p => Number(p.n))); return topPathRows.map(p => (
                  <div key={p.path} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                    <div style={{ minWidth: 0 }}>
                      <div dir="ltr" style={{ fontSize: 11.5, fontWeight: 700, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{p.path || '/'}</div>
                      <div style={{ height: 8, borderRadius: 4, background: C.sf2, overflow: 'hidden', marginTop: 4 }}>
                        <div style={{ width: `${max > 0 ? (Number(p.n) / max) * 100 : 0}%`, height: '100%', background: C.accent, borderRadius: 4 }} />
                      </div>
                    </div>
                    <span className="gl-num" style={{ fontFamily: DISP, fontSize: 13, fontWeight: 800, color: C.thi }}>{fa(Number(p.n))}</span>
                  </div>
                )) })()}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 16, padding: '14px 15px' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.thi, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function ChatTile({ label, rate, n, color }: { label: string; rate: number | null; n: number; color: string }) {
  return (
    <div style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 13, padding: '13px 10px', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', textAlign: 'center' }}>
      <span className="gl-num" style={{ fontFamily: DISP, fontSize: 23, fontWeight: 800, color, lineHeight: 1.1 }}>{rate === null ? '—' : `٪${fa(rate)}`}</span>
      <span style={{ fontSize: 10.5, color: C.tbody, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 9, color: C.tmut }}>از {fa(n)} نفر · نرخِ تاییدِ نهایی</span>
    </div>
  )
}

function DauBars({ data }: { data: { day: string; n: string }[] }) {
  if (data.length === 0) return <div style={{ fontSize: 12, color: C.tmut, padding: '8px 0' }}>هنوز داده‌ای نیست.</div>
  const max = Math.max(...data.map(d => Number(d.n)))
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, overflowX: 'auto', paddingBottom: 2 }}>
        {data.map((d, i) => (
          <div key={i} title={`${dayShort(d.day)}: ${fa(Number(d.n))} کاربر`} style={{ flex: '1 0 14px', minWidth: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span className="gl-num" style={{ fontSize: 9, color: C.tmut }}>{fa(Number(d.n))}</span>
            <div style={{ width: '100%', height: `${max > 0 ? (Number(d.n) / max) * 74 : 0}px`, minHeight: 3, background: C.accent, borderRadius: 4 }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: C.tmut }}>
        <span>{dayShort(data[0].day)}</span>
        {data.length > 2 && <span>{dayShort(data[data.length - 1].day)}</span>}
      </div>
    </div>
  )
}
