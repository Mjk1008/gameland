'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { C, DISP, Num } from '@/components/ui'
import { toman } from '@/lib/payment'

export interface DashboardData {
  discountPercent: number
  commissionPercent: number
  codes: {
    id: string
    code: string
    discountPercent: number
    commissionPercent: number
    shareLink: string
    useCount: number
    totalUses: number
    approved: number
    pending: number
    conversionPercent: number
    pendingCommission: number
    activity: {
      regId: string
      buyerTag: string
      buyerName: string
      eventTitle: string
      status: 'pending' | 'approved' | 'rejected'
      attempts: number
      createdAt: number
    }[]
  }[]
  totalUses: number
  approved: number
  pending: number
  conversionPercent: number
  pendingCommission: number
  paidCommission: number
  pendingRequest: { id: string; requestedCode?: string; note?: string; createdAt: number } | null
  lastRejected: { reason?: string; at: number } | null
  canRequestNew: boolean
  maxCodes: number
}

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'در انتظار تأیید', color: C.gold, bg: C.goldSoft },
  approved: { label: 'تأیید شده', color: C.win, bg: C.winSoft },
  rejected: { label: 'رد شده', color: C.live, bg: C.liveSoft },
}

export default function PromoterDashboard({ data }: { data: DashboardData }) {
  const router = useRouter()
  const [copied, setCopied] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(data.codes[0]?.id ?? null)
  const [showRequest, setShowRequest] = useState(false)
  const [reqCode, setReqCode] = useState('')
  const [reqNote, setReqNote] = useState('')
  const [reqBusy, setReqBusy] = useState(false)
  const [reqErr, setReqErr] = useState<string | null>(null)

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1800)
    } catch {}
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    setReqErr(null); setReqBusy(true)
    try {
      const res = await fetch('/api/promoter/code-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: reqCode.trim() || undefined,
          note: reqNote.trim() || undefined,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'نشد')
      setShowRequest(false); setReqCode(''); setReqNote('')
      router.refresh()
    } catch (ex: any) {
      setReqErr(ex.message)
    } finally {
      setReqBusy(false)
    }
  }

  const inp: React.CSSProperties = {
    background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px',
    color: C.thi, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: '16px 16px 28px' }} className="animate-fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Link href="/me" style={{ all: 'unset', cursor: 'pointer', width: 40, height: 40, borderRadius: 10, background: C.sf1, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.tbody }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 6l-6 6 6 6" /></svg>
        </Link>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.thi }}>پنل پروموتر</div>
          <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>کدها، آمار و کمیسیون</div>
        </div>
      </div>

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
        <div style={{ fontSize: 11, color: C.tmut, marginTop: 10 }}>
          شرایط: ٪{data.discountPercent} تخفیف · ٪{data.commissionPercent} کمیسیون
        </div>
      </div>

      {data.pendingRequest && (
        <div style={{ background: C.goldSoft, border: `1px solid ${C.gold}55`, borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.gold }}>درخواست کد در انتظار تأیید ادمین</div>
          <div style={{ fontSize: 11.5, color: C.tbody, marginTop: 6 }}>
            {data.pendingRequest.requestedCode
              ? <>کد پیشنهادی: <span dir="ltr" style={{ fontFamily: DISP }}>{data.pendingRequest.requestedCode}</span></>
              : 'کد خودکار بعد از تأیید ساخته می‌شود'}
          </div>
          {data.pendingRequest.note && <div style={{ fontSize: 11, color: C.tmut, marginTop: 4 }}>{data.pendingRequest.note}</div>}
        </div>
      )}

      {data.lastRejected && (
        <div style={{ background: C.liveSoft, border: `1px solid ${C.live}44`, borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: 11.5, color: C.live }}>
          آخرین درخواست رد شد: {data.lastRejected.reason ?? '—'}
        </div>
      )}

      {data.canRequestNew && !data.pendingRequest && (
        <div style={{ marginBottom: 14 }}>
          {!showRequest ? (
            <button type="button" onClick={() => setShowRequest(true)}
              style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center', minHeight: 44, borderRadius: 12, background: C.accentSoft, border: `1px solid ${C.accent}55`, color: C.accent, fontWeight: 800, fontSize: 13 }}>
              درخواست کد جدید ({data.codes.length}/{data.maxCodes})
            </button>
          ) : (
            <form onSubmit={submitRequest} style={{ background: C.sf1, border: `1px solid ${C.accent}44`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>درخواست کد جدید</div>
              <div style={{ fontSize: 11, color: C.tmut }}>بعد از تأیید ادمین، کد فعال می‌شود.</div>
              <input value={reqCode} onChange={e => setReqCode(e.target.value)} placeholder="کد دلخواه (اختیاری)" style={inp} dir="ltr" />
              <input value={reqNote} onChange={e => setReqNote(e.target.value)} placeholder="توضیح برای ادمین (اختیاری)" style={inp} />
              {reqErr && <div style={{ fontSize: 12, color: C.live }}>{reqErr}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={reqBusy} style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 40, borderRadius: 10, background: C.accent, color: C.ink, fontWeight: 800, fontSize: 12 }}>
                  {reqBusy ? '…' : 'ارسال درخواست'}
                </button>
                <button type="button" onClick={() => { setShowRequest(false); setReqErr(null) }}
                  style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 40, borderRadius: 10, background: C.sf2, color: C.tbody, fontWeight: 700, fontSize: 12, border: `1px solid ${C.line}` }}>
                  انصراف
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {data.codes.length === 0 && !data.pendingRequest ? (
        <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: 24, background: C.sf1, borderRadius: 12, border: `1px solid ${C.line}` }}>
          هنوز کد فعالی نداری. درخواست بزن یا از ادمین بخواه کد بسازه.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.codes.map(c => (
            <div key={c.id} style={{ background: C.sf1, border: `1px solid ${expanded === c.id ? C.accent + '55' : C.line}`, borderRadius: 14, overflow: 'hidden' }}>
              <button type="button" onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                style={{ all: 'unset', cursor: 'pointer', width: '100%', padding: '14px 16px', boxSizing: 'border-box' }}>
                <div dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 18, color: C.accent, textAlign: 'center' }}>{c.code}</div>
                <div style={{ fontSize: 11, color: C.tmut, textAlign: 'center', marginTop: 4 }}>
                  {c.totalUses} استفاده · {c.conversionPercent}٪ تبدیل · {toman(c.pendingCommission)} معوق
                </div>
              </button>

              {expanded === c.id && (
                <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${C.line}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                    <button type="button" onClick={() => copy(c.code, c.id + '-code')}
                      style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 38, borderRadius: 10, fontSize: 12, fontWeight: 700, background: C.sf2, color: copied === c.id + '-code' ? C.win : C.thi, border: `1px solid ${copied === c.id + '-code' ? C.win : C.line}` }}>
                      {copied === c.id + '-code' ? 'کپی شد ✓' : 'کپی کد'}
                    </button>
                    <button type="button" onClick={() => copy(c.shareLink, c.id + '-link')}
                      style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 38, borderRadius: 10, fontSize: 12, fontWeight: 700, background: C.accentSoft, color: copied === c.id + '-link' ? C.win : C.accent, border: `1px solid ${copied === c.id + '-link' ? C.win : C.accent}55` }}>
                      {copied === c.id + '-link' ? 'کپی شد ✓' : 'کپی لینک'}
                    </button>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, color: C.thi, marginTop: 14, marginBottom: 8 }}>ثبت‌نام‌ها</div>
                  {c.activity.length === 0 ? (
                    <div style={{ fontSize: 11.5, color: C.tmut, textAlign: 'center', padding: 12 }}>هنوز استفاده‌ای نداشته.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {c.activity.map(a => {
                        const st = STATUS[a.status] ?? STATUS.pending
                        return (
                          <div key={a.regId} style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 9, padding: '9px 11px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 12.5, color: C.thi }}>{a.buyerName}</div>
                                <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 2 }}>{a.eventTitle} · {a.attempts} سهم</div>
                              </div>
                              <span dir="ltr" style={{ fontFamily: DISP, fontSize: 10, color: C.tmut }}>@{a.buyerTag}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6, background: st.bg, color: st.color, border: `1px solid ${st.color}44`, flexShrink: 0 }}>{st.label}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
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
