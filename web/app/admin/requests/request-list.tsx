'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { C, DISP, Num, EmptyState } from '@/components/ui'
import { toman } from '@/lib/payment'
import { toJalali, faDigits, J_MONTHS } from '@/lib/jalali'
import type { TicketSlot } from '@/lib/promoter'

interface Row {
  regId: string; attempts: number; freeAttempts?: number; paidAttempts?: number
  referrerTag?: string; promoCode?: string; discountPercent?: number; totalOffPercent?: number
  promoterName?: string; promoterTag?: string
  name: string; tag: string; phone: string; city: string; event: string; hasReceipt?: boolean
  receipts?: { id: string; at: number }[]
  unitPrice: number; fullUnitPrice: number; expectedTotal: number; revenueTotal: number
  slots: TicketSlot[]
}

const REJECT_REASONS = [
  'فیش پرداخت ارسال نشده',
  'مبلغ واریزی نادرست',
  'رسید نامعتبر یا ناخوانا',
  'اطلاعات ناقص',
]

function slotsFor(tickets: number, row: Row): TicketSlot[] {
  const paid = row.paidAttempts ?? 0
  const free = row.freeAttempts ?? 0
  const hasPromo = (row.discountPercent ?? 0) > 0
  const slots: TicketSlot[] = []
  for (let i = 1; i <= tickets; i++) {
    if (i <= paid) slots.push({ n: i, kind: 'settled', unitPrice: row.unitPrice, fullPrice: row.fullUnitPrice })
    else if (i <= paid + free) slots.push({ n: i, kind: 'free', unitPrice: 0, fullPrice: row.fullUnitPrice })
    else if (hasPromo) slots.push({ n: i, kind: 'promo', unitPrice: row.unitPrice, fullPrice: row.fullUnitPrice })
    else slots.push({ n: i, kind: 'full', unitPrice: row.fullUnitPrice, fullPrice: row.fullUnitPrice })
  }
  return slots
}

function expectedFromSlots(slots: TicketSlot[]) {
  return slots.filter(s => s.kind === 'promo' || s.kind === 'full').reduce((sum, s) => sum + s.unitPrice, 0)
}

const SLOT_STYLE: Record<TicketSlot['kind'], { label: string; bg: string; color: string; border: string }> = {
  settled: { label: 'تأییدشده', bg: C.sf2, color: C.tmut, border: C.line },
  free: { label: 'رایگان', bg: C.winSoft, color: C.win, border: C.win + '55' },
  promo: { label: 'تخفیف', bg: C.goldSoft, color: C.gold, border: C.gold + '66' },
  full: { label: 'عادی', bg: C.accentSoft, color: C.accent, border: C.accent + '55' },
}

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
          {rows.map(r => {
            const hasPromo = !!r.promoCode && (r.discountPercent ?? 0) > 0
            const hasFree = (r.freeAttempts ?? 0) > 0
            return (
            <button key={r.regId} onClick={() => openRow(r)}
              style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', background: C.sf1, border: `1px solid ${hasPromo ? C.gold + '66' : C.line}`, borderRight: hasPromo ? `3px solid ${C.gold}` : undefined, borderRadius: 13, padding: '13px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.thi }}>{r.name}</span>
                    {hasPromo && <span dir="ltr" style={{ fontFamily: DISP, fontSize: 9.5, fontWeight: 800, color: C.gold, background: C.goldSoft, border: `1px solid ${C.gold}44`, borderRadius: 6, padding: '2px 7px' }}>{r.promoCode} · {r.totalOffPercent ?? r.discountPercent}٪</span>}
                    {hasFree && !hasPromo && <span style={{ fontSize: 9.5, fontWeight: 700, color: C.win, background: C.winSoft, border: `1px solid ${C.win}44`, borderRadius: 6, padding: '2px 7px' }}>رایگان</span>}
                  </div>
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
          )})}
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

            {!!sel.promoCode && (sel.discountPercent ?? 0) > 0 && (
              <div style={{ marginTop: 9, background: C.goldSoft, border: `1px solid ${C.gold}55`, borderRadius: 11, padding: '10px 13px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, marginBottom: 4 }}>ثبت‌نام با پروموشن</div>
                <div style={{ fontSize: 12.5, color: C.thi }}>
                  پروموتر: <b>{sel.promoterName ?? '—'}</b>
                  {sel.promoterTag && <span dir="ltr" style={{ fontFamily: DISP, color: C.tmut }}> @{sel.promoterTag}</span>}
                </div>
                <div dir="ltr" style={{ fontFamily: DISP, fontSize: 12, color: C.gold, marginTop: 4, textAlign: 'right' }}>
                  کد {sel.promoCode} · تخفیف کل {sel.totalOffPercent ?? sel.discountPercent}٪ (پروموتر {sel.discountPercent}٪) · هر سهم {toman(sel.unitPrice)} (به‌جای {toman(sel.fullUnitPrice)})
                </div>
              </div>
            )}

            {!!sel.paidAttempts && sel.paidAttempts < sel.attempts && (
              <div style={{ marginTop: 9, fontSize: 11.5, fontWeight: 700, color: C.accent, background: C.accentSoft, border: `1px solid ${C.accent}44`, borderRadius: 9, padding: '8px 11px' }}>
                ↑ خریدِ مجدد — <span className="gl-num">{sel.paidAttempts}</span> سهم قبلاً تایید شده، الان <span className="gl-num">{sel.attempts - sel.paidAttempts}</span> سهمِ جدید اضافه کرده
              </div>
            )}
            {(!!sel.freeAttempts || sel.referrerTag) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
                {!!sel.freeAttempts && <span style={{ fontSize: 10.5, fontWeight: 700, color: C.win, background: C.winSoft, border: `1px solid ${C.win}44`, borderRadius: 7, padding: '3px 9px' }}>🎟 {sel.freeAttempts} سهم رایگان{sel.referrerTag ? ' (جایزهٔ دعوت)' : ''} — درآمد نیست</span>}
                {sel.referrerTag && <span dir="ltr" style={{ fontFamily: DISP, fontSize: 10.5, fontWeight: 700, color: C.tbody, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 7, padding: '3px 9px' }}>ref: @{sel.referrerTag}</span>}
              </div>
            )}

            {/* per-seat breakdown */}
            {(() => {
              const liveSlots = slotsFor(tickets, sel)
              const expected = expectedFromSlots(liveSlots)
              const newPaid = liveSlots.filter(s => s.kind === 'promo' || s.kind === 'full').length
              return (
                <>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.tmut, marginBottom: 7 }}>جزئیات سهم‌ها</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {liveSlots.map(s => {
                        const st = SLOT_STYLE[s.kind]
                        return (
                          <div key={s.n} style={{ minWidth: 72, textAlign: 'center', background: st.bg, border: `1px solid ${st.border}`, borderRadius: 9, padding: '7px 8px' }}>
                            <div style={{ fontFamily: DISP, fontSize: 10, fontWeight: 800, color: st.color }}>#{s.n}</div>
                            <div style={{ fontSize: 9.5, fontWeight: 700, color: st.color, marginTop: 2 }}>{st.label}</div>
                            {(s.kind === 'promo' || s.kind === 'full') && (
                              <div className="gl-num" style={{ fontSize: 9, color: C.tmut, marginTop: 2 }}>{toman(s.unitPrice)}</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 7, lineHeight: 1.7 }}>
                      <span style={{ color: C.gold }}>● تخفیف</span> = پروموتر · <span style={{ color: C.accent }}>● عادی</span> = قیمت کامل · <span style={{ color: C.win }}>● رایگان</span> = بدون درآمد · <span style={{ color: C.tmut }}>● تأییدشده</span> = قبلاً تسویه
                    </div>
                  </div>

            {/* tickets stepper */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 11, padding: '10px 13px' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.thi }}>تعداد سهم <span style={{ fontSize: 10, color: C.tmut, fontWeight: 400 }}>(قابل تصحیح)</span></span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setAttempts(tickets - 1)} disabled={tickets <= 1} style={stepBtn}>−</button>
                <Num size={20} color={C.accent}>{tickets}</Num>
                <button onClick={() => setAttempts(tickets + 1)} disabled={tickets >= 6} style={stepBtn}>+</button>
              </div>
            </div>

            {/* expected payment — per-event price + promo snapshot */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9, background: sel.promoCode ? C.goldSoft : C.sf1, border: `1px solid ${sel.promoCode ? C.gold + '55' : C.line}`, borderRadius: 11, padding: '10px 13px' }}>
              <span style={{ fontSize: 12, color: C.tbody }}>
                مبلغِ موردِ انتظار
                <span className="gl-num" style={{ display: 'block', fontSize: 10.5, color: C.tmut, marginTop: 2 }}>
                  {newPaid > 0 ? `${newPaid} سهم پولی` : 'بدون سهم پولی جدید'}
                  {sel.freeAttempts ? ` · ${sel.freeAttempts} رایگان` : ''}
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <Num size={16} color={sel.promoCode ? C.gold : C.thi}>{toman(expected)}</Num>
                <span style={{ fontSize: 11, color: C.tbody }}>تومان</span>
              </span>
            </div>
                </>
              )
            })()}

            {/* receipts — latest first; previous فیش stay visible on top-up / resend */}
            {(() => {
              const revs = sel.receipts ?? []
              if (revs.length === 0) {
                const unpaidPaid = Math.max(0, sel.attempts - (sel.paidAttempts ?? 0) - (sel.freeAttempts ?? 0))
                if (unpaidPaid <= 0) return null
                return <div style={{ marginTop: 12, fontSize: 11.5, fontWeight: 700, color: C.gold, background: C.goldSoft, border: `1px solid ${C.gold}44`, borderRadius: 10, padding: '9px 12px' }}>⚠ فیشی آپلود نشده — از راه‌های دیگه چک کن</div>
              }
              return (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {revs.map(rv => {
                    const src = rv.id ? `/api/admin/receipt/${sel.regId}?rev=${encodeURIComponent(rv.id)}` : `/api/admin/receipt/${sel.regId}`
                    const when = rv.at > 0 ? receiptWhen(rv.at) : ''
                    return (
                      <a key={rv.id || 'latest'} href={src} target="_blank" rel="noopener noreferrer" style={{ all: 'unset', cursor: 'pointer', display: 'block', borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.line2}`, position: 'relative' }}>
                        <img src={src} alt="فیش" style={{ display: 'block', width: '100%', maxHeight: 300, objectFit: 'contain', background: '#0E0C09' }} />
                        <span style={{ position: 'absolute', bottom: 8, insetInlineEnd: 8, fontSize: 11, fontWeight: 700, color: C.thi, background: 'rgba(20,17,13,.8)', border: `1px solid ${C.line2}`, borderRadius: 8, padding: '5px 10px' }}>بازکردنِ فیش (بزرگ) ›{when ? ` · ${when}` : ''}</span>
                      </a>
                    )
                  })}
                </div>
              )
            })()}

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

function receiptWhen(ms: number) {
  const d = new Date(ms)
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return `${faDigits(j.jd)} ${J_MONTHS[j.jm - 1]}`
}
