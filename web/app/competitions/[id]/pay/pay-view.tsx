'use client'
import { useState } from 'react'
import { C, DISP, Num, BackHeader, Button } from '@/components/ui'
import { PAYMENT, paymentLinks, TICKET, toman } from '@/lib/payment'

export default function PayView({ compId, title, attempts, status }: { compId: string; title: string; attempts: number; status: string }) {
  const [copied, setCopied] = useState(false)
  const links = paymentLinks()

  function copyCard() {
    navigator.clipboard?.writeText(PAYMENT.card).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }).catch(() => {})
  }

  return (
    <div className="animate-fade-up">
      <BackHeader title="پرداخت و ارسال رسید" href={`/competitions/${compId}`} />

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
          مبلغ زیر رو کارت‌به‌کارت کن، بعد رسیدش رو از یکی از راه‌های زیر بفرست. ثبت‌نامت بعد از تایید ادمین فعال می‌شه.
        </div>

        {/* Amount to pay */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.accentSoft, border: `1px solid ${C.accent}`, borderRadius: 14, padding: '14px 16px' }}>
          <div>
            <div style={{ fontSize: 12, color: C.tbody }}>مبلغ قابل پرداخت</div>
            <div className="gl-num" style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>{attempts} × {toman(TICKET.price)}</div>
          </div>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <Num size={28} color={C.accent}>{toman(attempts * TICKET.price)}</Num>
            <span style={{ fontSize: 12, color: C.tbody }}>تومان</span>
          </span>
        </div>

        {/* Card */}
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 11, color: C.tmut, marginBottom: 8 }}>شماره کارت</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span dir="ltr" style={{ flex: 1, fontFamily: DISP, fontWeight: 700, fontSize: 22, letterSpacing: '.08em', color: C.thi }}>{PAYMENT.card.replace(/(\d{4})(?=\d)/g, '$1 ')}</span>
            <button onClick={copyCard} style={{ all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: copied ? C.win : C.accent, background: copied ? C.winSoft : C.accentSoft, border: `1px solid ${copied ? C.win : C.accent}55`, borderRadius: 9, padding: '8px 12px' }}>
              {copied ? 'کپی شد ✓' : 'کپی'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 12, color: C.tbody }}>
            <span>{PAYMENT.cardName}</span><span style={{ color: C.line2 }}>·</span><span>{PAYMENT.bank}</span>
          </div>
        </div>

        {/* Send receipt */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.thi, marginBottom: 10 }}>ارسال رسید</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ChannelBtn href={links.whatsapp} label="واتساپ" sub={PAYMENT.channels.whatsapp} color="#25D366" />
            <ChannelBtn href={links.bale} label="بله" sub={PAYMENT.channels.bale} color={C.accent} />
            <ChannelBtn href={links.instagram} label="اینستاگرام" sub={`@${PAYMENT.channels.instagram}`} color="#E1306C" />
          </div>
        </div>

        <Button href={`/competitions/${compId}/me`} kind="secondary">وضعیت ثبت‌نامم ›</Button>
      </div>
    </div>
  )
}

function ChannelBtn({ href, label, sub, color }: { href: string; label: string; sub: string; color: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '13px 14px' }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.thi }}>{label}</div>
        <div dir="ltr" style={{ fontFamily: DISP, fontSize: 12, color: C.tmut, marginTop: 2, textAlign: 'right' }}>{sub}</div>
      </div>
      <span style={{ color: C.accent, fontSize: 13 }}>›</span>
    </a>
  )
}
