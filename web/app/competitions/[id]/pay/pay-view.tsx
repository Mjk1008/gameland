'use client'
import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { C, DISP, Num, BackHeader, Button } from '@/components/ui'
import { PAYMENT, paymentLinks, toman } from '@/lib/payment'
import { track } from '@/lib/track'

// downscale a receipt photo to a compact JPEG before upload
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('عکس خوانده نشد'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('فایل عکس معتبر نیست'))
      img.onload = () => {
        const MAX = 1400
        let { width: w, height: h } = img
        if (w > MAX || h > MAX) { const r = Math.min(MAX / w, MAX / h); w = Math.round(w * r); h = Math.round(h * r) }
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d'); if (!ctx) return reject(new Error('پردازش عکس ناموفق بود'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function PayView({ compId, title, attempts, payable, alreadyPaid = 0, freeAttempts = 0, status, hasReceipt, price }: { compId: string; title: string; attempts: number; payable: number; alreadyPaid?: number; freeAttempts?: number; status: string; hasReceipt?: boolean; price: number }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const links = paymentLinks()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploaded, setUploaded] = useState(!!hasReceipt)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { track('pay_page_view', { compId, status }) }, [])

  function copyCard() {
    navigator.clipboard?.writeText(PAYMENT.card).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }).catch(() => {})
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setErr(null); setBusy(true)
    try {
      const imageData = await fileToDataUrl(f)
      const res = await fetch('/api/register/receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compId, imageData }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'آپلود نشد، دوباره امتحان کن')
      track('receipt_submit', { compId })
      setUploaded(true); router.refresh()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <div className="animate-fade-up">
      <BackHeader title="پرداخت و ارسال فیش" href={`/competitions/${compId}`} />

      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* status banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: status === 'approved' ? C.winSoft : C.accentSoft, border: `1px solid ${status === 'approved' ? C.win : C.accent}55`, borderRadius: 12, padding: '12px 14px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: status === 'approved' ? C.win : C.accent }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>
            {status === 'approved' ? 'ثبت‌نامت تایید شد ✓' : status === 'rejected' ? 'ثبت‌نامت رد شد' : 'منتظر تایید پرداخت'}
          </span>
        </div>

        <div style={{ fontSize: 13, color: C.tbody, lineHeight: 1.9 }}>
          <b style={{ color: C.thi }}>{title}</b> — <span className="gl-num">{attempts}</span> بلیط.
          مبلغ زیر رو کارت‌به‌کارت کن، بعد <b style={{ color: C.thi }}>عکسِ فیش رو همین‌جا بارگذاری کن</b> تا مستقیم به درخواستت بچسبه و ادمین سریع تأیید کنه.
        </div>

        {/* Amount to pay */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.accentSoft, border: `1px solid ${C.accent}`, borderRadius: 14, padding: '14px 16px' }}>
          <div>
            <div style={{ fontSize: 12, color: C.tbody }}>مبلغ قابل پرداخت</div>
            <div className="gl-num" style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>{payable} × {toman(price)}{alreadyPaid > 0 ? ` · ${alreadyPaid} سهم قبلاً پرداخت‌شده` : ''}{freeAttempts > 0 ? ` · ${freeAttempts} رایگان` : ''}</div>
          </div>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <Num size={28} color={C.accent}>{toman(payable * price)}</Num>
            <span style={{ fontSize: 12, color: C.tbody }}>تومان</span>
          </span>
        </div>

        {/* Card */}
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 11, color: C.tmut, marginBottom: 8 }}>شماره کارت</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span dir="ltr" style={{ flex: 1, minWidth: 0, fontFamily: DISP, fontWeight: 700, fontSize: 18, letterSpacing: '.04em', color: C.thi, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{PAYMENT.card.replace(/(\d{4})(?=\d)/g, '$1 ')}</span>
            <button onClick={copyCard} style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, minHeight: 44, display: 'flex', alignItems: 'center', fontSize: 12.5, fontWeight: 700, color: copied ? C.win : C.accent, background: copied ? C.winSoft : C.accentSoft, border: `1px solid ${copied ? C.win : C.accent}55`, borderRadius: 9, padding: '0 14px' }}>
              {copied ? 'کپی شد ✓' : 'کپی'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 12, color: C.tbody }}>
            <span>{PAYMENT.cardName}</span><span style={{ color: C.line2 }}>·</span><span>{PAYMENT.bank}</span>
          </div>
        </div>

        {/* Upload receipt — primary */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.thi, marginBottom: 10 }}>بارگذاری فیش پرداخت</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
          {uploaded ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.winSoft, border: `1px solid ${C.win}66`, borderRadius: 12, padding: '13px 14px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.win} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.win }}>فیش بارگذاری شد — منتظر تأیید ادمین</span>
              <button onClick={() => fileRef.current?.click()} disabled={busy} style={{ all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.tbody }}>تعویض</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={busy} style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 96, background: C.sf2, border: `1.5px dashed ${C.accent}88`, borderRadius: 14, color: C.accent }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l1.5-2h7L17 8h3v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /></svg>
              <span style={{ fontSize: 13.5, fontWeight: 800 }}>{busy ? 'در حال بارگذاری…' : 'انتخاب عکسِ فیش'}</span>
              <span style={{ fontSize: 11, color: C.tmut }}>عکسِ رسیدِ کارت‌به‌کارت رو بذار</span>
            </button>
          )}
          {err && <div style={{ fontSize: 12, color: C.live, marginTop: 8 }}>{err}</div>}
        </div>

        {/* Optional: send via messenger too */}
        <details style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '10px 14px' }}>
          <summary style={{ cursor: 'pointer', fontSize: 12.5, color: C.tbody }}>یا از پیام‌رسان بفرست (اختیاری)</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            <ChannelBtn href={links.whatsapp} label="واتساپ" sub={PAYMENT.channels.whatsapp} color="#25D366" />
            <ChannelBtn href={links.bale} label="بله" sub={PAYMENT.channels.bale} color={C.accent} />
            <ChannelBtn href={links.instagram} label="اینستاگرام" sub={`@${PAYMENT.channels.instagram}`} color="#E1306C" />
          </div>
        </details>

        <Button href={`/competitions/${compId}/me`} kind="secondary">وضعیت ثبت‌نامم ›</Button>
      </div>
    </div>
  )
}

function ChannelBtn({ href, label, sub, color }: { href: string; label: string; sub: string; color: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px' }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.thi }}>{label}</div>
        <div dir="ltr" style={{ fontFamily: DISP, fontSize: 12, color: C.tmut, marginTop: 2, textAlign: 'right' }}>{sub}</div>
      </div>
      <span style={{ color: C.accent, fontSize: 13 }}>›</span>
    </a>
  )
}
