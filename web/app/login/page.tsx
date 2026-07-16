'use client'
import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { C, DISP, Wordmark, Button } from '@/components/ui'

export default function LoginPage() {
  return <Suspense fallback={null}><LoginInner /></Suspense>
}

const inp: React.CSSProperties = {
  background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '13px 14px',
  color: C.thi, fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box',
}

function LoginInner() {
  const router = useRouter()
  const search = useSearchParams()
  const callbackUrl = search.get('callbackUrl') || '/me'

  const [mode, setMode] = useState<'otp' | 'password'>('otp')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [phoneErr, setPhoneErr] = useState<string | null>(null)

  const phoneOk = /^09\d{9}$/.test(phone)

  async function passwordSubmit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setPhoneErr(null)
    if (!phoneOk) { setPhoneErr('شماره با ۰۹ شروع می‌شه و ۱۱ رقمه'); return }
    setBusy(true)
    try {
      const r = await signIn('credentials', { phone, password, redirect: false, callbackUrl })
      if (r?.error) throw new Error('شماره موبایل یا گذرواژه درست نیست، دوباره چک کن')
      router.push(callbackUrl); router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  async function sendCode() {
    setErr(null); setPhoneErr(null)
    if (!phoneOk) { setPhoneErr('شماره با ۰۹ شروع می‌شه و ۱۱ رقمه'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'کد ارسال نشد، دوباره امتحان کن')
      setSent(true)
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  async function otpSubmit(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (code.length < 4) { setErr('کد رو کامل وارد کن'); return }
    setBusy(true)
    try {
      const r = await signIn('phone-otp', { phone, code, redirect: false, callbackUrl })
      if (r?.error) throw new Error('کد درست نیست یا منقضی شده')
      router.push(callbackUrl); router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 18px' }}>
      <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <Wordmark size={26} />
        <span style={{ fontSize: 14, fontWeight: 700, color: C.thi }}>ورود به حساب</span>
      </div>

      {/* mode toggle */}
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', gap: 6, marginBottom: 16 }}>
        {([['otp', 'کد پیامکی'], ['password', 'گذرواژه']] as const).map(([m, label]) => (
          <button key={m} type="button" onClick={() => { setMode(m); setErr(null); setSent(false) }}
            style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, fontSize: 13, fontWeight: 700, background: mode === m ? C.accentSoft : C.sf1, color: mode === m ? C.accent : C.tbody, border: `1px solid ${mode === m ? C.accent : C.line}` }}>
            {label}
          </button>
        ))}
      </div>

      {mode === 'otp' ? (
        <form onSubmit={otpSubmit} style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: C.tmut }}>شمارهٔ موبایل</span>
            <input dir="ltr" inputMode="numeric" placeholder="09120000000" value={phone} autoComplete="tel" disabled={sent}
              onChange={e => { setPhoneErr(null); setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)) }} style={{ ...inp, fontFamily: DISP, textAlign: 'left', letterSpacing: '.04em', opacity: sent ? 0.6 : 1 }} required />
            {phoneErr && <span style={{ fontSize: 11.5, color: C.live }}>{phoneErr}</span>}
          </label>

          {sent && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: C.tmut }}>کد پیامک‌شده</span>
              <input dir="ltr" inputMode="numeric" placeholder="- - - - -" value={code} autoComplete="one-time-code"
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} style={{ ...inp, fontFamily: DISP, textAlign: 'center', letterSpacing: '.4em', fontSize: 20 }} required />
              <button type="button" onClick={() => { setSent(false); setCode('') }} style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, color: C.tmut, marginTop: 2 }}>تغییر شماره / ارسال دوباره</button>
            </label>
          )}

          {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}

          {!sent
            ? <Button type="button" onClick={sendCode} disabled={busy || !phoneOk}>{busy ? 'در حال ارسال…' : 'ارسال کد'}</Button>
            : <Button type="submit" disabled={busy}>{busy ? 'در حال ورود…' : 'ورود'}</Button>}

          <div style={{ textAlign: 'center', fontSize: 12.5, color: C.tmut }}>
            حساب نداری؟ با همین کد پیامکی، حسابت خودکار ساخته می‌شه.
          </div>
        </form>
      ) : (
        <form onSubmit={passwordSubmit} style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: C.tmut }}>شمارهٔ موبایل</span>
            <input dir="ltr" inputMode="numeric" placeholder="09120000000" value={phone} autoComplete="tel"
              onChange={e => { setPhoneErr(null); setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)) }} style={{ ...inp, fontFamily: DISP, textAlign: 'left', letterSpacing: '.04em' }} required />
            {phoneErr && <span style={{ fontSize: 11.5, color: C.live }}>{phoneErr}</span>}
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: C.tmut }}>گذرواژه</span>
            <input type="password" placeholder="••••••••" value={password} autoComplete="current-password"
              onChange={e => setPassword(e.target.value)} style={inp} required />
          </label>

          {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}

          <Button type="submit" disabled={busy}>{busy ? 'در حال ورود…' : 'ورود'}</Button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: C.tmut }}>
            <Link href="/forgot" style={{ color: C.tmut, textDecoration: 'none' }}>گذرواژه‌ت رو یادت رفته؟</Link>
            <span>حساب نداری؟ <Link href="/signup" style={{ color: C.accent, textDecoration: 'none', fontWeight: 700 }}>ثبت‌نام کن</Link></span>
          </div>
        </form>
      )}
    </div>
  )
}
