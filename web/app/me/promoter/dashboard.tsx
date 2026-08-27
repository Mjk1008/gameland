'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { C, DISP } from '@/components/ui'
import { toman } from '@/lib/payment'

type ActivityRow = {
  regId: string
  buyerTag: string
  eventTitle: string
  status: 'pending' | 'approved' | 'rejected'
  attempts: number
  createdAt: number
}

type Code = {
  id: string
  code: string
  active: boolean
  compId?: string
  eventTitle?: string
  discountPercent: number
  commissionPercent: number
  shareLink: string
  totalUses: number
  approved: number
  pending: number
  activity: ActivityRow[]
}

export interface DashboardData {
  active: boolean
  discountPercent: number
  commissionPercent: number
  primary: Code | null
  primaryPaused: boolean
  campaignCodes: Code[]
  totalUses: number
  approved: number
  pending: number
  pendingCommission: number
  paidCommission: number
  pendingRequest: { id: string; requestedCode?: string; eventTitle?: string; note?: string; createdAt: number } | null
  lastRejected: { reason?: string; at: number } | null
  canRequestCampaign: boolean
  maxCampaignCodes: number
  events: { id: string; title: string }[]
}

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'در انتظار', color: C.gold, bg: C.goldSoft },
  approved: { label: 'تأیید', color: C.win, bg: C.winSoft },
  rejected: { label: 'رد شد', color: C.live, bg: C.liveSoft },
}

function ago(ts: number): string {
  const s = Math.max(0, Date.now() - ts) / 1000
  if (s < 90) return 'همین حالا'
  const m = s / 60
  if (m < 60) return `${Math.round(m)} دقیقه پیش`
  const h = m / 60
  if (h < 24) return `${Math.round(h)} ساعت پیش`
  const d = Math.round(h / 24)
  return d < 30 ? `${d} روز پیش` : `${Math.round(d / 30)} ماه پیش`
}

export default function PromoterDashboard({ data }: { data: DashboardData }) {
  const router = useRouter()
  const [copied, setCopied] = useState<string | null>(null)

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1600)
    } catch {}
  }

  const p = data.primary

  return (
    <div style={{ padding: '16px 16px 32px' }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Link href="/me" style={{ all: 'unset', cursor: 'pointer', width: 40, height: 40, borderRadius: 10, background: C.sf1, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.tbody }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 6l-6 6 6 6" /></svg>
        </Link>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.thi }}>پنل پروموتر</div>
          <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>کد · لینک · آمار · کمیسیون</div>
        </div>
      </div>

      {/* Primary code */}
      {p ? (
        <div style={{
          background: data.primaryPaused ? C.sf1 : `linear-gradient(150deg, ${C.accentSoft}, ${C.sf1})`,
          border: `1px solid ${data.primaryPaused ? C.line : C.accent + '55'}`,
          borderRadius: 16, padding: '18px 16px', marginBottom: 12, opacity: data.primaryPaused ? 0.7 : 1,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: data.primaryPaused ? C.tmut : C.accent, marginBottom: 8 }}>
            {data.primaryPaused ? 'کد اصلی — موقتاً غیرفعال' : 'کد اصلی تو'}
          </div>
          <div dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 28, color: C.thi, textAlign: 'center', letterSpacing: '.04em' }}>{p.code}</div>
          <div style={{ fontSize: 11.5, color: C.tmut, textAlign: 'center', marginTop: 8 }}>
            ٪{data.discountPercent} تخفیف برای خریدار · ٪{data.commissionPercent} سهم تو
          </div>
          {data.primaryPaused ? (
            <div style={{ fontSize: 11.5, color: C.gold, textAlign: 'center', marginTop: 12, lineHeight: 1.7 }}>
              ادمین کد رو موقتاً غیرفعال کرده. برای فعال‌سازی مجدد باهاش هماهنگ کن.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
              <CopyBtn label="کپی کد" active={copied === 'pc'} onClick={() => copy(p.code, 'pc')} />
              <CopyBtn label="کپی لینک" accent active={copied === 'pl'} onClick={() => copy(p.shareLink, 'pl')} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: C.sf1, border: `1px dashed ${C.line}`, borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 12, fontSize: 12.5, color: C.tmut, lineHeight: 1.8 }}>
          کد اصلی‌ات هنوز ساخته نشده. یک لحظه دیگه دوباره باز کن یا به ادمین بگو.
        </div>
      )}

      {/* Summary */}
      <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, textAlign: 'center' }}>
          <Cell big={data.totalUses} label="نفر اومدن" />
          <Divider />
          <Cell big={`${data.approved} از ${data.totalUses}`} label="تأیید شده" color={C.win} />
          <Divider />
          <Cell big={data.pending} label="منتظر تأیید" color={C.gold} />
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
          <div>
            <div style={{ fontSize: 10, color: C.tmut }}>کمیسیون معوق</div>
            <div className="gl-num" style={{ fontSize: 16, fontWeight: 800, color: C.gold, marginTop: 3 }}>{toman(data.pendingCommission)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.tmut }}>پرداخت‌شده</div>
            <div className="gl-num" style={{ fontSize: 16, fontWeight: 800, color: C.thi, marginTop: 3 }}>{toman(data.paidCommission)}</div>
          </div>
        </div>
      </div>

      {/* Campaign request banners */}
      {data.pendingRequest && (
        <Banner kind="wait" title="درخواست کد کمپین در انتظار تأیید">
          {data.pendingRequest.eventTitle ? <>برای «{data.pendingRequest.eventTitle}»</> : null}
          {data.pendingRequest.requestedCode && <> · کد پیشنهادی <span dir="ltr" style={{ fontFamily: DISP }}>{data.pendingRequest.requestedCode}</span></>}
        </Banner>
      )}
      {data.lastRejected && !data.pendingRequest && (
        <Banner kind="error" title="آخرین درخواست کد کمپین رد شد">
          {data.lastRejected.reason ?? 'بدون توضیح — می‌تونی دوباره درخواست بدی'}
        </Banner>
      )}

      {/* Activity — primary code */}
      <ActivityBlock title="ثبت‌نام‌ها با کد تو" rows={p?.activity ?? []} />

      {/* Campaign codes */}
      {data.campaignCodes.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.thi, marginBottom: 8 }}>کدهای کمپین</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.campaignCodes.map(c => (
              <CampaignCard key={c.id} c={c} copied={copied} onCopy={copy} />
            ))}
          </div>
        </div>
      )}

      {/* Request a campaign code */}
      {data.canRequestCampaign && data.events.length > 0 && (
        <RequestForm events={data.events} onDone={() => router.refresh()} />
      )}
    </div>
  )
}

function CampaignCard({ c, copied, onCopy }: { c: Code; copied: string | null; onCopy: (t: string, k: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, overflow: 'hidden', opacity: c.active ? 1 : 0.6 }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', padding: '12px 14px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 15, color: c.active ? C.accent : C.tmut }}>{c.code}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 10.5, color: C.tmut, textAlign: 'right' }}>{c.eventTitle}</span>
          {!c.active && <span style={{ fontSize: 9.5, color: C.tmut, border: `1px solid ${C.line}`, borderRadius: 5, padding: '1px 5px' }}>غیرفعال</span>}
        </div>
        <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 5 }}>{c.totalUses} استفاده · {c.approved} تأیید · ٪{c.discountPercent}/٪{c.commissionPercent}</div>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.line}` }}>
          {c.active && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <CopyBtn label="کپی کد" active={copied === c.id + 'c'} onClick={() => onCopy(c.code, c.id + 'c')} />
              <CopyBtn label="کپی لینک" accent active={copied === c.id + 'l'} onClick={() => onCopy(c.shareLink, c.id + 'l')} />
            </div>
          )}
          <ActivityBlock title="ثبت‌نام‌ها" rows={c.activity} compact />
        </div>
      )}
    </div>
  )
}

function RequestForm({ events, onDone }: { events: { id: string; title: string }[]; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [compId, setCompId] = useState('')
  const [code, setCode] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const inp: React.CSSProperties = {
    background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px',
    color: C.thi, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!compId) { setErr('یک رویداد انتخاب کن'); return }
    setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/promoter/code-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compId, code: code.trim() || undefined, note: note.trim() || undefined }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'نشد')
      setOpen(false); setCompId(''); setCode(''); setNote('')
      onDone()
    } catch (ex: any) {
      setErr(ex.message)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center', minHeight: 46, marginTop: 16, borderRadius: 12, background: C.sf1, border: `1px dashed ${C.accent}66`, color: C.accent, fontWeight: 800, fontSize: 12.5 }}>
        درخواست کد کمپین برای یک رویداد
      </button>
    )
  }

  return (
    <form onSubmit={submit} style={{ background: C.sf1, border: `1px solid ${C.accent}44`, borderRadius: 14, padding: 14, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>درخواست کد کمپین</div>
      <div style={{ fontSize: 11, color: C.tmut, lineHeight: 1.7 }}>کد کمپین فقط برای یک رویداد کار می‌کنه. ادمین بررسی و تأیید می‌کنه.</div>
      <select value={compId} onChange={e => setCompId(e.target.value)} style={inp}>
        <option value="">— انتخاب رویداد —</option>
        {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
      </select>
      <input value={code} onChange={e => setCode(e.target.value)} placeholder="کد دلخواه (اختیاری)" style={inp} dir="ltr" />
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="توضیح برای ادمین (اختیاری)" style={inp} />
      {err && <div style={{ fontSize: 12, color: C.live }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={busy} style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 42, borderRadius: 10, background: C.accent, color: C.ink, fontWeight: 800, fontSize: 12 }}>
          {busy ? '…' : 'ارسال درخواست'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setErr(null) }}
          style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 42, borderRadius: 10, background: C.sf2, color: C.tbody, fontWeight: 700, fontSize: 12, border: `1px solid ${C.line}` }}>
          انصراف
        </button>
      </div>
    </form>
  )
}

function ActivityBlock({ title, rows, compact }: { title: string; rows: ActivityRow[]; compact?: boolean }) {
  if (rows.length === 0) {
    return compact ? null : (
      <div style={{ marginTop: 18, fontSize: 12, color: C.tmut, textAlign: 'center', padding: '18px 0' }}>
        هنوز کسی با کد تو ثبت‌نام نکرده.
      </div>
    )
  }
  return (
    <div style={{ marginTop: compact ? 12 : 18 }}>
      <div style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: C.thi, marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map(a => {
          const st = STATUS[a.status] ?? STATUS.pending
          return (
            <div key={a.regId} style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 9, padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div dir="ltr" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 12.5, color: C.thi, textAlign: 'right' }}>@{a.buyerTag}</div>
                <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 2 }}>{a.eventTitle} · {a.attempts} سهم · {ago(a.createdAt)}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6, background: st.bg, color: st.color, border: `1px solid ${st.color}44`, flexShrink: 0 }}>{st.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Cell({ big, label, color }: { big: string | number; label: string; color?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="gl-num" style={{ fontSize: 17, fontWeight: 800, color: color ?? C.thi }}>{big}</div>
      <div style={{ fontSize: 10, color: C.tmut, marginTop: 3 }}>{label}</div>
    </div>
  )
}

function Divider() {
  return <div style={{ width: 1, background: C.line, alignSelf: 'stretch' }} />
}

function CopyBtn({ label, active, onClick, accent }: { label: string; active: boolean; onClick: () => void; accent?: boolean }) {
  return (
    <button type="button" onClick={onClick} style={{
      all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 40, borderRadius: 10, fontSize: 12, fontWeight: 700,
      background: active ? C.winSoft : accent ? C.accentSoft : C.sf2,
      color: active ? C.win : accent ? C.accent : C.thi,
      border: `1px solid ${active ? C.win : accent ? C.accent + '55' : C.line}`,
    }}>{active ? 'کپی شد ✓' : label}</button>
  )
}

function Banner({ kind, title, children }: { kind: 'wait' | 'error'; title: string; children: React.ReactNode }) {
  const isWait = kind === 'wait'
  return (
    <div style={{
      background: isWait ? C.goldSoft : C.liveSoft,
      border: `1px solid ${isWait ? C.gold : C.live}55`,
      borderRadius: 12, padding: '12px 14px', marginBottom: 12, fontSize: 11.5,
      color: isWait ? C.tbody : C.live, lineHeight: 1.7,
    }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: isWait ? C.gold : C.live, marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  )
}
