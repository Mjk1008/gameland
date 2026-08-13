'use client'
import { useState } from 'react'
import Link from 'next/link'
import { C, DISP, Num } from '@/components/ui'
import { toman } from '@/lib/payment'

export interface DashboardData {
  code: string
  discountPercent: number
  commissionPercent: number
  useCount: number
  shareLink: string
  totalUses: number
  approved: number
  pending: number
  conversionPercent: number
  pendingCommission: number
  paidCommission: number
  activity: {
    regId: string
    buyerTag: string
    buyerName: string
    eventTitle: string
    status: 'pending' | 'approved' | 'rejected'
    attempts: number
    createdAt: number
  }[]
}

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'در انتظار تأیید', color: C.gold, bg: C.goldSoft },
  approved: { label: 'تأیید شده', color: C.win, bg: C.winSoft },
  rejected: { label: 'رد شده', color: C.live, bg: C.liveSoft },
}

export default function PromoterDashboard({ data }: { data: DashboardData }) {
  const [copied, setCopied] = useState<string | null>(null)

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1800)
    } catch {}
  }

  return (
    <div style={{ padding: '16px 16px 28px' }} className="animate-fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Link href="/me" style={{ all: 'unset', cursor: 'pointer', width: 40, height: 40, borderRadius: 10, background: C.sf1, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.tbody }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 6l-6 6 6 6" /></svg>
        </Link>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.thi }}>پنل پروموتر</div>
          <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>کد، آمار و کمیسیون</div>
        </div>
      </div>

      {/* summary */}
      <div style={{ background: C.sf1, border: `1px solid ${C.gold}44`, borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Stat label="کل استفاده" value={data.totalUses} />
          <Stat label="تأییدشده" value={data.approved} color={C.win} />
          <Stat label="نرخ تبدیل" value={`${data.conversionPercent}٪`} color={C.accent} />
          <Stat label="در انتظار تأیید" value={data.pending} color={C.gold} />
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
          <div>
            <div style={{ fontSize: 10, color: C.tmut }}>کمیسیون معوق</div>
            <div className="gl-num" style={{ fontSize: 16, fontWeight: 800, color: C.gold, marginTop: 2 }}>{toman(data.pendingCommission)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.tmut }}>پرداخت‌شده</div>
            <div className="gl-num" style={{ fontSize: 16, fontWeight: 800, color: C.thi, marginTop: 2 }}>{toman(data.paidCommission)}</div>
          </div>
        </div>
      </div>

      {/* code */}
      <div style={{ background: C.sf1, border: `1px solid ${C.accent}44`, borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
        <div dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 22, color: C.accent, letterSpacing: '.04em', textAlign: 'center' }}>{data.code}</div>
        <div style={{ fontSize: 11, color: C.tmut, textAlign: 'center', marginTop: 4 }}>
          ٪{data.discountPercent} تخفیف · ٪{data.commissionPercent} کمیسیون · {data.useCount} استفاده
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          <button type="button" onClick={() => copy(data.code, 'code')}
            style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 40, borderRadius: 10, fontSize: 12, fontWeight: 700, background: C.sf2, color: copied === 'code' ? C.win : C.thi, border: `1px solid ${copied === 'code' ? C.win : C.line}` }}>
            {copied === 'code' ? 'کپی شد ✓' : 'کپی کد'}
          </button>
          <button type="button" onClick={() => copy(data.shareLink, 'link')}
            style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 40, borderRadius: 10, fontSize: 12, fontWeight: 700, background: C.accentSoft, color: copied === 'link' ? C.win : C.accent, border: `1px solid ${copied === 'link' ? C.win : C.accent}55` }}>
            {copied === 'link' ? 'کپی شد ✓' : 'کپی لینک'}
          </button>
        </div>
      </div>

      {/* activity */}
      <div style={{ fontSize: 14, fontWeight: 700, color: C.thi, marginBottom: 10 }}>ثبت‌نام‌ها</div>
      {data.activity.length === 0 ? (
        <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: 24, background: C.sf1, borderRadius: 12, border: `1px solid ${C.line}` }}>هنوز کسی با کدت نیومده.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.activity.map(a => {
            const st = STATUS[a.status] ?? STATUS.pending
            return (
              <div key={a.regId} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{a.buyerName}</div>
                    <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>{a.eventTitle} · {a.attempts} سهم</div>
                  </div>
                  <span dir="ltr" style={{ fontFamily: DISP, fontSize: 10, color: C.tmut }}>@{a.buyerTag}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: st.bg, color: st.color, border: `1px solid ${st.color}44`, flexShrink: 0 }}>{st.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.tmut }}>{label}</div>
      <Num size={20} color={color ?? C.thi}>{value}</Num>
    </div>
  )
}
