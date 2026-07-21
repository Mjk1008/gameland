'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, DISP, Num, EmptyState } from '@/components/ui'

interface Row { regId: string; attempts: number; name: string; tag: string; phone: string; city: string; event: string; hasReceipt?: boolean }

const REJECT_REASONS = [
  'فیش پرداخت ارسال نشده',
  'مبلغ واریزی نادرست',
  'رسید نامعتبر یا ناخوانا',
  'اطلاعات ناقص',
]

export default function RequestList({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)   // regId whose reject panel is open
  const [reason, setReason] = useState('')
  const [notifying, setNotifying] = useState(false)
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null)

  async function notifyPending() {
    if (!confirm('به همهٔ کسایی که ثبت‌نامشون تأیید نشده و هنوز فیش نذاشتن، اعلان و پیامکِ «فیشتو آپلود کن» بفرستم؟')) return
    setNotifying(true); setNotifyMsg(null)
    try {
      const res = await fetch('/api/admin/notify-pending', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'ارسال نشد')
      setNotifyMsg(`به ${j.sent} نفر یادآوری فرستاده شد ✓`)
    } catch (e: any) { setNotifyMsg(e.message) } finally { setNotifying(false) }
  }

  async function send(regId: string, action: 'approve' | 'reject', rsn?: string) {
    setBusy(regId)
    try {
      const res = await fetch('/api/admin/reg-approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regId, action, reason: rsn }),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || 'انجام نشد، دوباره امتحان کن') }
      setRejecting(null); setReason('')
      router.refresh()
    } finally { setBusy(null) }
  }

  return (
    <div style={{ padding: '16px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: C.thi }}>درخواست‌های ثبت‌نام</span>
        <span style={{ fontSize: 12.5, color: C.tmut }}><span className="gl-num">{rows.length}</span> در انتظار</span>
      </div>

      <button onClick={notifyPending} disabled={notifying} style={{ all: 'unset', cursor: notifying ? 'default' : 'pointer', boxSizing: 'border-box', width: '100%', textAlign: 'center', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, borderRadius: 11, fontSize: 12.5, fontWeight: 700, color: C.accent, background: C.accentSoft, border: `1px solid ${C.accent}66`, opacity: notifying ? 0.6 : 1 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" /></svg>
        {notifying ? 'در حال ارسال…' : 'یادآوریِ پرداخت به تأییدنشده‌ها'}
      </button>
      {notifyMsg && <div style={{ fontSize: 12, color: C.tbody, textAlign: 'center', marginBottom: 12 }}>{notifyMsg}</div>}

      {rows.length === 0 ? (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}><EmptyState text="درخواست منتظری نداری — همه رسیدگی شدن." /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {rows.map(r => {
            const isRejecting = rejecting === r.regId
            return (
              <div key={r.regId} style={{ background: C.sf1, border: `1px solid ${isRejecting ? C.live + '66' : C.line}`, borderRadius: 13, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.thi }}>{r.name}</div>
                    <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11.5, color: C.tmut, marginTop: 2, textAlign: 'right' }}>@{r.tag}{r.city ? ` · ${r.city}` : ''}{r.phone ? ` · ${r.phone}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Num size={20} color={C.accent}>{r.attempts}</Num>
                    <div style={{ fontSize: 9, color: C.tmut }}>بلیط</div>
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: C.tbody, marginTop: 8 }}>{r.event}</div>

                {/* payment receipt (فیش) attached to this request */}
                {r.hasReceipt ? (
                  <a href={`/api/admin/receipt/${r.regId}`} target="_blank" rel="noopener noreferrer" style={{ all: 'unset', cursor: 'pointer', display: 'block', marginTop: 10, borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.line2}`, position: 'relative' }}>
                    <img src={`/api/admin/receipt/${r.regId}`} alt="فیش" style={{ display: 'block', width: '100%', maxHeight: 220, objectFit: 'cover' }} />
                    <span style={{ position: 'absolute', bottom: 8, insetInlineEnd: 8, fontSize: 11, fontWeight: 700, color: C.thi, background: 'rgba(20,17,13,.8)', border: `1px solid ${C.line2}`, borderRadius: 8, padding: '5px 10px' }}>دیدنِ فیش (بزرگ) ›</span>
                  </a>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 11.5, fontWeight: 700, color: C.gold, background: C.goldSoft, border: `1px solid ${C.gold}44`, borderRadius: 9, padding: '8px 11px' }}>⚠ فیشی آپلود نشده — از راه‌های دیگه چک کن</div>
                )}

                {!isRejecting ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                    <button disabled={busy === r.regId} onClick={() => { setRejecting(r.regId); setReason('') }} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: C.liveSoft, color: C.live, border: `1px solid ${C.live}55`, fontWeight: 700, fontSize: 13 }}>رد</button>
                    <button disabled={busy === r.regId} onClick={() => send(r.regId, 'approve')} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: C.accent, color: C.ink, fontWeight: 800, fontSize: 13, opacity: busy === r.regId ? 0.6 : 1 }}>تایید</button>
                  </div>
                ) : (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.thi }}>دلیل رد (برای گیمر پیامک/اعلان می‌شه):</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {REJECT_REASONS.map(rr => {
                        const on = reason === rr
                        return <button key={rr} type="button" onClick={() => setReason(rr)} style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, padding: '7px 11px', borderRadius: 9, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}` }}>{rr}</button>
                      })}
                    </div>
                    <input value={reason} onChange={e => setReason(e.target.value.slice(0, 240))} placeholder="یا دلیلِ دلخواه بنویس…" style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '11px 13px', color: C.thi, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button disabled={busy === r.regId} onClick={() => { setRejecting(null); setReason('') }} style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, color: C.tbody, border: `1px solid ${C.line2}`, fontSize: 13, fontWeight: 700 }}>انصراف</button>
                      <button disabled={busy === r.regId} onClick={() => send(r.regId, 'reject', reason.trim() || undefined)} style={{ all: 'unset', cursor: 'pointer', flex: 2, textAlign: 'center', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: C.live, color: '#fff', fontWeight: 800, fontSize: 13, opacity: busy === r.regId ? 0.6 : 1 }}>{busy === r.regId ? '…' : 'رد و اطلاع‌رسانی'}</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
