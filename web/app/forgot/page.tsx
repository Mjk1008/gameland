'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { C, DISP, Wordmark, Button, inp, Field } from '@/components/ui'

const faNum = (n: number) => n.toLocaleString('fa-IR')
const RESEND = 60

export default function ForgotPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const phoneOk = /^09\d{9}$/.test(phone)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown(c => (c <= 1 ? 0 : c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  async function sendCode() {
    setErr(null)
    if (!phoneOk) { setErr('شماره با ۰۹ شروع می‌شه و ۱۱ رقمه'); return }
    if (cooldown > 0) return
    setBusy(true)
    try {
      const res = await fetch('/api/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'کد ارسال نشد')
      setSent(true); setCooldown(RESEND)
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (code.length < 4) { setErr('کد رو کامل وارد کن'); return }
    if (password.length < 8) { setErr('گذرواژهٔ جدید حداقل ۸ کاراکتر'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/reset-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, code, password }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'تغییر نشد، دوباره امتحان کن')
      router.push('/login')
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 18px' }}>
      <div style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Wordmark size={22} stacked />
        <div style={{ fontSize: 15, fontWeight: 800, color: C.thi }}>بازیابی گذرواژه با پیامک</div>
      </div>

      <form onSubmit={submit} style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="شمارهٔ موبایل">
          <input dir="ltr" inputMode="numeric" placeholder="09120000000" value={phone} autoComplete="tel" disabled={sent}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} style={{ ...inp, fontFamily: DISP, textAlign: 'left', letterSpacing: '.04em', opacity: sent ? 0.6 : 1 }} required />
        </Field>

        {sent && (
          <>
            <Field label="کد پیامک‌شده">
              <input dir="ltr" inputMode="numeric" placeholder="- - - - -" value={code} autoComplete="one-time-code"
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} style={{ ...inp, fontFamily: DISP, textAlign: 'center', letterSpacing: '.4em', fontSize: 20 }} required />
            </Field>
            <Field label="گذرواژهٔ جدید">
              <input type="password" placeholder="حداقل ۸ کاراکتر" value={password} autoComplete="new-password"
                onChange={e => setPassword(e.target.value)} style={inp} required />
            </Field>
            <button type="button" onClick={sendCode} disabled={cooldown > 0 || busy}
              style={{ all: 'unset', cursor: cooldown > 0 ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, color: cooldown > 0 ? C.tmut : C.accent, textAlign: 'center' }}>
              {cooldown > 0 ? `ارسال دوباره تا ${faNum(cooldown)} ثانیه` : 'ارسال دوبارهٔ کد'}
            </button>
          </>
        )}

        {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}

        {!sent
          ? <Button type="button" onClick={sendCode} disabled={busy || !phoneOk}>{busy ? 'در حال ارسال…' : 'ارسال کد'}</Button>
          : <Button type="submit" disabled={busy}>{busy ? 'در حال تغییر…' : 'تغییر گذرواژه'}</Button>}

        <div style={{ textAlign: 'center', fontSize: 12.5, color: C.tmut }}>
          یادت اومد؟ <Link href="/login" style={{ color: C.accent, textDecoration: 'none', fontWeight: 700 }}>برگرد به ورود</Link>
        </div>
      </form>
    </div>
  )
}
