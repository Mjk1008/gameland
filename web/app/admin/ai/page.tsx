import Link from 'next/link'
import { getUserById, getSetting, AI_KNOWLEDGE_KEY } from '@/lib/store'
import { persist } from '@/lib/db/persistence'
import { C, BackHeader } from '@/components/ui'
import { faDigits } from '@/lib/jalali'
import KnowledgeEditor from './knowledge'

export const dynamic = 'force-dynamic'

// gpt-4o-mini list price (USD per token) — estimate shown to the admin
const IN_PRICE = 0.15 / 1e6
const OUT_PRICE = 0.60 / 1e6
const DAILY_LIMIT = 20

function money(usd: number) { return usd < 0.01 ? '<$0.01' : `$${usd.toFixed(2)}` }

export default async function AiMonitorPage() {
  const now = Date.now()
  const [day, week, month] = await Promise.all([
    persist.ai.statsSince(now - 1 * 86400000),
    persist.ai.statsSince(now - 7 * 86400000),
    persist.ai.statsSince(now - 30 * 86400000),
  ])

  const agg = (rows: any[]) => rows.reduce((a, r) => ({
    q: a.q + Number(r.questions ?? 0),
    pt: a.pt + Number(r.pt ?? 0),
    ct: a.ct + Number(r.ct ?? 0),
    users: a.users + 1,
  }), { q: 0, pt: 0, ct: 0, users: 0 })
  const d = agg(day), w = agg(week), m = agg(month)
  const cost = (x: { pt: number; ct: number }) => x.pt * IN_PRICE + x.ct * OUT_PRICE

  // top spenders (30d) + anomaly flags
  const top = [...month]
    .map(r => {
      const u = getUserById(r.user_id)
      const q = Number(r.questions ?? 0), pt = Number(r.pt ?? 0), ct = Number(r.ct ?? 0)
      const today = day.find(x => x.user_id === r.user_id)
      const qToday = Number(today?.questions ?? 0)
      const avgOut = q > 0 ? ct / q : 0
      // anomaly: consistently maxing the daily cap, or unusually long outputs
      const flag = qToday >= DAILY_LIMIT ? 'سقفِ امروز را پر کرده'
        : q >= DAILY_LIMIT * 6 ? 'مصرفِ خیلی بالا در ماه'
        : avgOut > 380 ? 'جواب‌های همیشه حداکثری'
        : null
      return { uid: r.user_id, name: u?.name ?? 'کاربر حذف‌شده', tag: u?.tag ?? '—', q, qToday, usd: pt * IN_PRICE + ct * OUT_PRICE, flag }
    })
    .sort((a, b) => b.usd - a.usd)
    .slice(0, 15)

  const enabled = process.env.ASSISTANT_ENABLED !== 'false' && !!process.env.METIS_API_KEY

  return (
    <div className="animate-fade-up">
      <BackHeader title="مانیتورینگ AI" href="/admin" />
      <div style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: C.sf1, border: `1px solid ${enabled ? C.win : C.live}44`, borderRadius: 12, padding: '11px 14px' }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: enabled ? C.win : C.live }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: enabled ? C.win : C.live }}>{enabled ? 'دستیار فعاله' : 'دستیار خاموشه (env را چک کن)'}</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10.5, color: C.tmut }}>gpt-4o-mini · سقف {faDigits(DAILY_LIMIT)}/روز</span>
        </div>

        {/* what the assistant is allowed to state as fact */}
        <KnowledgeEditor initial={getSetting(AI_KNOWLEDGE_KEY)} />

        {/* usage tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
          {[
            { label: 'امروز', v: d },
            { label: '۷ روز', v: w },
            { label: '۳۰ روز', v: m },
          ].map(x => (
            <div key={x.label} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: '13px 8px', textAlign: 'center' }}>
              <div className="gl-num" style={{ fontSize: 21, fontWeight: 800, color: C.accent }}>{faDigits(x.v.q)}</div>
              <div style={{ fontSize: 10, color: C.tbody, marginTop: 2 }}>سوال · {x.label}</div>
              <div style={{ fontSize: 10, color: C.tmut, marginTop: 5 }}><span className="gl-num">{faDigits(x.v.users)}</span> کاربر · <span dir="ltr" className="gl-num">{money(cost(x.v))}</span></div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10.5, color: C.tmut, textAlign: 'center' }}>
          هزینه تخمینیه (نرخِ لیستِ gpt-4o-mini) · توکن ۳۰ روز: <span dir="ltr" className="gl-num">{(m.pt + m.ct).toLocaleString('en-US')}</span>
        </div>

        {/* top users + anomalies */}
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 15, padding: '15px 14px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: C.thi, marginBottom: 12 }}>پرمصرف‌ترین کاربرها (۳۰ روز)</div>
          {top.length === 0 ? (
            <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: '12px 0' }}>هنوز کسی با دستیار حرف نزده.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {top.map((t, i) => (
                <Link key={t.uid} href={`/admin/ai/${t.uid}`}
                  style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 11, padding: '9px 10px', background: t.flag ? C.goldSoft : 'transparent', border: `1px solid ${t.flag ? C.gold + '55' : C.line}` }}>
                  <span className="gl-num" style={{ width: 18, textAlign: 'center', fontWeight: 800, fontSize: 13, color: C.tmut }}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name} <span dir="ltr" style={{ fontSize: 10, color: C.tmut }}>@{t.tag}</span></span>
                    {t.flag && <span style={{ display: 'block', fontSize: 10, color: C.gold, marginTop: 2 }}>⚠ {t.flag}</span>}
                  </span>
                  <span style={{ textAlign: 'center', flexShrink: 0 }}>
                    <span className="gl-num" style={{ display: 'block', fontSize: 14, fontWeight: 800, color: C.thi }}>{faDigits(t.q)}</span>
                    <span style={{ fontSize: 9, color: C.tmut }}>سوال</span>
                  </span>
                  <span dir="ltr" className="gl-num" style={{ fontSize: 11, color: C.tbody, minWidth: 46, textAlign: 'left', flexShrink: 0 }}>{money(t.usd)}</span>
                  <span style={{ color: C.tmut, fontSize: 13 }}>‹</span>
                </Link>
              ))}
            </div>
          )}
          <div style={{ fontSize: 10, color: C.tmut, marginTop: 10, lineHeight: 1.9 }}>روی هر کاربر بزن تا مکالمه‌هاش رو ببینی.</div>
        </div>
      </div>
    </div>
  )
}
