'use client'
import { useState } from 'react'
import Link from 'next/link'
import { C, Wordmark, Button } from '@/components/ui'

export default function ForgotPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('یه ایمیل درست وارد کن'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'یه مشکلی پیش اومد') }
      setSent(true)
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 18px' }}>
      <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Wordmark size={24} />
        <div style={{ fontSize: 15, fontWeight: 800, color: C.thi }}>بازیابی گذرواژه</div>
      </div>

      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sent ? (
          <>
            <div style={{ background: C.winSoft, border: `1px solid ${C.win}55`, borderRadius: 14, padding: 16, fontSize: 13, color: C.thi, lineHeight: 2, textAlign: 'center' }}>
              اگه این ایمیل توی گیم‌لند ثبت شده باشه، لینک بازیابی برات فرستاده شد.<br />
              <span style={{ color: C.tbody }}>پوشهٔ اسپم رو هم چک کن. لینک تا ۳۰ دقیقه معتبره.</span>
            </div>
            <Button href="/login" kind="secondary">بازگشت به ورود</Button>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: C.tbody, lineHeight: 1.9 }}>
              ایمیلی که موقع ثبت‌نام دادی رو وارد کن؛ لینک تعیین گذرواژهٔ جدید برات می‌فرستیم.
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: C.tmut }}>ایمیل</span>
              <input dir="ltr" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '13px 14px', color: C.thi, fontSize: 15, textAlign: 'left', outline: 'none' }} placeholder="you@gmail.com" />
            </label>
            {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}
            <Button type="submit" disabled={busy}>{busy ? 'در حال ارسال…' : 'ارسال لینک بازیابی'}</Button>
            <div style={{ textAlign: 'center', fontSize: 12.5, color: C.tmut }}>
              با گوگل وارد شدی؟ فقط <Link href="/login" style={{ color: C.accent, textDecoration: 'none', fontWeight: 700 }}>با گوگل وارد شو</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
