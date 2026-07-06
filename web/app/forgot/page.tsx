'use client'
import { C, DISP, Wordmark, Button } from '@/components/ui'
import { PAYMENT, paymentLinks } from '@/lib/payment'

export default function ForgotPage() {
  const links = paymentLinks()
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 18px' }}>
      <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Wordmark size={24} />
        <div style={{ fontSize: 15, fontWeight: 800, color: C.thi }}>بازیابی گذرواژه</div>
      </div>

      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, fontSize: 13, color: C.tbody, lineHeight: 1.9 }}>
          گذرواژه‌ت رو فراموش کردی؟ از یکی از راه‌های زیر با شماره‌ات به پشتیبانی پیام بده تا برات ریست کنیم.
        </div>

        <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" style={chan}>
          <span style={{ ...dot, background: '#25D366' }} /><span style={{ flex: 1, fontWeight: 700, color: C.thi }}>واتساپ</span><span dir="ltr" style={{ fontFamily: DISP, fontSize: 12, color: C.tmut }}>{PAYMENT.channels.whatsapp}</span>
        </a>
        <a href={links.bale} target="_blank" rel="noopener noreferrer" style={chan}>
          <span style={{ ...dot, background: C.accent }} /><span style={{ flex: 1, fontWeight: 700, color: C.thi }}>بله</span><span dir="ltr" style={{ fontFamily: DISP, fontSize: 12, color: C.tmut }}>{PAYMENT.channels.bale}</span>
        </a>
        <a href={links.instagram} target="_blank" rel="noopener noreferrer" style={chan}>
          <span style={{ ...dot, background: '#E1306C' }} /><span style={{ flex: 1, fontWeight: 700, color: C.thi }}>اینستاگرام</span><span dir="ltr" style={{ fontFamily: DISP, fontSize: 12, color: C.tmut }}>@{PAYMENT.channels.instagram}</span>
        </a>

        <Button href="/login" kind="secondary">بازگشت به ورود</Button>
      </div>
    </div>
  )
}

const chan: React.CSSProperties = { all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '13px 14px' }
const dot: React.CSSProperties = { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 }
