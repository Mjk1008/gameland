'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { C, DISP, Num, EmptyState } from '@/components/ui'
import { toman } from '@/lib/payment'

interface Row { regId: string; attempts: number; freeAttempts?: number; paidAttempts?: number; referrerTag?: string; name: string; tag: string; phone: string; city: string; event: string; hasReceipt?: boolean; price: number }

const REJECT_REASONS = [
  'فیش پرداخت ارسال نشده',
  'مبلغ واریزی نادرست',
  'رسید نامعتبر یا ناخوانا',
  'اطلاعات ناقص',
]

// Review flow is modal-only by design: list cards carry NO action buttons, so
// a stray double-tap can never approve/reject the wrong person. Tap a card →
// full-detail sheet → decide at the bottom.
export default function RequestList({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [sel, setSel] = useState<Row | null>(null)
  const [closing, setClosing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [tickets, setTickets] = useState(1)

  function openRow(r: Row) { setSel(r); setTickets(r.attempts); setRejecting(false); setReason('') }
  function closeSheet() { setClosing(true); setTimeout(() => { setSel(null); setClosing(false) }, 220) }

  useEffect(() => {
    if (!sel) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [sel])

  async function setAttempts(n: number) {
    if (!sel) return
    const v = Math.max(1, Math.min(6, n))
    setTickets(v)
    const res = await fetch('/api/admin/reg-attempts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ regId: sel.regId, attempts: v }) })
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || 'تغییر نشد') }
  }

  async function decide(action: 'approve' | 'reject') {
    if (!sel) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/reg-approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regId: sel.regId, action, reason: action === 'reject' ? (reason.trim() || undefined) : undefined }),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || 'انجام نشد، دوباره امتحان کن'); return }
      closeSheet()
      router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <div style={{ padding: '16px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: C.thi }}>درخواست‌های ثبت‌نام</span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 12.5, color: C.tmut }}><span className="gl-num">{rows.length}</span> در انتظار</span>
          <a href="/admin/requests/history" style={{ fontSize: 12.5, fontWeight: 700, color: C.accent, textDecoration: 'none' }}>سوابق ›</a>
        </span>
      </div>

      {rows.length === 0 ? (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}><EmptyState text="درخواست منتظری نداری — همه رسیدگی شدن." /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {rows.map(r => (
            <button key={r.regId} onClick={() => openRow(r)}
              style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: '13px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.thi }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: C.tbody, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.event}</div>
                </div>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <Num size={19} color={C.accent}>{r.attempts}</Num>
                  <div style={{ fontSize: 9, color: C.tmut }}>سهم</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 9px', borderRadius: 7, flexShrink: 0, background: r.hasReceipt ? C.winSoft : C.goldSoft, color: r.hasReceipt ? C.win : C.gold, border: `1px solid ${(r.hasReceipt ? C.win : C.gold)}44` }}>
                  {r.hasReceipt ? 'فیش دارد' : 'بدون فیش'}
                </span>
                <span style={{ color: C.tmut, fontSize: 15, flexShrink: 0 }}>‹</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── review sheet — the ONLY place approve/reject exists ── */}
      {sel && typeof document !== 'undefined' && createPortal(
        <div onClick={closeSheet}
          style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(11,10,8,.78)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: closing ? 'glFadeOut .22s ease forwards' : 'glFade .2s ease' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', background: '#171410', border: `1px solid ${C.line2}`, borderBottom: 'none', borderRadius: '22px 22px 0 0', animation: closing ? 'glSlideDown .22s ease forwards' : 'glSlideUp .28s cubic-bezier(.2,.9,.3,1)', padding: '18px 18px 26px', boxSizing: 'border-box' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: C.thi }}>{sel.name}</div>
                <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11.5, color: C.tmut, marginTop: 2, textAlign: 'right' }}>@{sel.tag}{sel.city ? ` · ${sel.city}` : ''}{sel.phone ? ` · ${sel.phone}` : ''}</div>
              </div>
              <button onClick={closeSheet} aria-label="بستن" style={{ all: 'unset', cursor: 'pointer', width: 32, height: 32, borderRadius: 999, background: C.sf2, border: `1px solid ${C.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.tbody, fontSize: 13 }}>✕</button>
            </div>

            <div style={{ fontSize: 12.5, color: C.tbody, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 11, padding: '10px 13px' }}>{sel.event}</div>

            {!!sel.paidAttempts && sel.paidAttempts < sel.attempts && (
              <div style={{ marginTop: 9, fontSize: 11.5, fontWeight: 700, color: C.accent, background: C.accentSoft, border: `1px solid ${C.accent}44`, borderRadius: 9, padding: '8px 11px' }}>
                ↑ خریدِ مجدد — <span className="gl-num">{sel.paidAttempts}</span> سهم قبلاً تایید شده، الان <span className="gl-num">{sel.attempts - sel.paidAttempts}</span> سهمِ جدید اضافه کرده
              </div>
            )}
            {(!!sel.freeAttempts || sel.referrerTag) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
                {!!sel.freeAttempts && <span style={{ fontSize: 10.5, fontWeight: 700, color: C.win, background: C.winSoft, border: `1px solid ${C.win}44`, borderRadius: 7, padding: '3px 9px' }}>🎟 {sel.freeAttempts} سهمِ جایزهٔ دعوت (بدون فیش)</span>}
                {sel.referrerTag && <span dir="ltr" style={{ fontFamily: DISP, fontSize: 10.5, fontWeight: 700, color: C.tbody, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 7, padding: '3px 9px' }}>ref: @{sel.referrerTag}</span>}
              </div>
            )}

            {/* tickets stepper */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 11, padding: '10px 13px' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.thi }}>تعداد سهم <span style={{ fontSize: 10, color: C.tmut, fontWeight: 400 }}>(قابل تصحیح)</span></span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setAttempts(tickets - 1)} disabled={tickets <= 1} style={stepBtn}>−</button>
                <Num size={20} color={C.accent}>{tickets}</Num>
                <button onClick={() => setAttempts(tickets + 1)} disabled={tickets >= 6} style={stepBtn}>+</button>
              </div>
            </div>

            {/* expected payment — per-event price, never assume a global constant */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 11, padding: '10px 13px' }}>
              <span style={{ fontSize: 12, color: C.tbody }}>مبلغِ موردِ انتظار <span className="gl-num" style={{ fontSize: 10.5, color: C.tmut }}>({Math.max(0, tickets - (sel.paidAttempts ?? 0))} × {toman(sel.price)})</span></span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <Num size={16} color={C.thi}>{toman(Math.max(0, tickets - (sel.paidAttempts ?? 0)) * sel.price)}</Num>
                <span style={{ fontSize: 11, color: C.tbody }}>تومان</span>
              </span>
            </div>

            {/* receipt */}
            {sel.hasReceipt ? (
              <a href={`/api/admin/receipt/${sel.regId}`} target="_blank" rel="noopener noreferrer" style={{ all: 'unset', cursor: 'pointer', display: 'block', marginTop: 12, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.line2}`, position: 'relative' }}>
                <img src={`/api/admin/receipt/${sel.regId}`} alt="فیش" style={{ display: 'block', width: '100%', maxHeight: 300, objectFit: 'contain', background: '#0E0C09' }} />
                <span style={{ position: 'absolute', bottom: 8, insetInlineEnd: 8, fontSize: 11, fontWeight: 700, color: C.thi, background: 'rgba(20,17,13,.8)', border: `1px solid ${C.line2}`, borderRadius: 8, padding: '5px 10px' }}>بازکردنِ فیش (بزرگ) ›</span>
              </a>
            ) : (
              <div style={{ marginTop: 12, fontSize: 11.5, fontWeight: 700, color: C.gold, background: C.goldSoft, border: `1px solid ${C.gold}44`, borderRadius: 10, padding: '9px 12px' }}>⚠ فیشی آپلود نشده — از راه‌های دیگه چک کن</div>
            )}

            {/* decision zone */}
            {!rejecting ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 9, marginTop: 16 }}>
                <button disabled={busy} onClick={() => setRejecting(true)}
                  style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: C.liveSoft, color: C.live, border: `1px solid ${C.live}55`, fontWeight: 700, fontSize: 13.5 }}>رد…</button>
                <button disabled={busy} onClick={() => decide('approve')}
                  style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: C.accent, color: C.ink, fontWeight: 800, fontSize: 14, opacity: busy ? 0.6 : 1 }}>{busy ? '…' : `تاییدِ ${sel.name.split(' ')[0]} ✓`}</button>
              </div>
            ) : (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.thi }}>دلیل رد (برای گیمر اعلان می‌شه):</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {REJECT_REASONS.map(rr => {
                    const on = reason === rr
                    return <button key={rr} type="button" onClick={() => setReason(rr)} style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, padding: '7px 11px', borderRadius: 9, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}` }}>{rr}</button>
                  })}
                </div>
                <input value={reason} onChange={e => setReason(e.target.value.slice(0, 240))} placeholder="یا دلیلِ دلخواه بنویس…" style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '11px 13px', color: C.thi, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={busy} onClick={() => { setRejecting(false); setReason('') }} style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 11, color: C.tbody, border: `1px solid ${C.line2}`, fontSize: 13, fontWeight: 700 }}>انصراف</button>
                  <button disabled={busy} onClick={() => decide('reject')} style={{ all: 'unset', cursor: 'pointer', flex: 2, textAlign: 'center', minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 11, background: C.live, color: '#fff', fontWeight: 800, fontSize: 13.5, opacity: busy ? 0.6 : 1 }}>{busy ? '…' : 'ردِ قطعی و اطلاع‌رسانی'}</button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      <style jsx global>{`
        @keyframes glFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes glFadeOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes glSlideUp { from { transform: translateY(48px); opacity: .4 } to { transform: translateY(0); opacity: 1 } }
        @keyframes glSlideDown { from { transform: translateY(0); opacity: 1 } to { transform: translateY(56px); opacity: .3 } }
      `}</style>
    </div>
  )
}

const stepBtn: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 9, fontSize: 17, fontWeight: 700, background: '#252017', color: '#F2EDE4', border: '1px solid #3A332A',
}
