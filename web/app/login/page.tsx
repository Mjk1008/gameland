'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
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

const faNum = (n: number) => n.toLocaleString('fa-IR')
const RESEND_SECS = 60

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
  const [cooldown, setCooldown] = useState(0)

  const codeRef = useRef<HTMLInputElement>(null)
  const phoneOk = /^09\d{9}$/.test(phone)

  // resend countdown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown(c => (c <= 1 ? 0 : c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  // focus the code box the moment it appears
  useEffect(() => { if (sent) codeRef.current?.focus() }, [sent])

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
    if (cooldown > 0) return
    setBusy(true)
    try {
      const res = await fetch('/api/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'کد ارسال نشد، دوباره امتحان کن')
      setSent(true); setCooldown(RESEND_SECS)
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 18px 40px', position: 'relative', overflow: 'hidden' }}>
      {/* ambient glow */}
      <div aria-hidden style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 520, height: 520, background: `radial-gradient(circle, ${C.accentSoft} 0%, transparent 62%)`, pointerEvents: 'none' }} />

      {/* hero — fills the space above the box */}
      <div style={{ position: 'relative', marginBottom: 26, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Wordmark size={22} stacked tagline />
        <span style={{ fontSize: 13, color: C.tbody, textAlign: 'center', maxWidth: 260, lineHeight: 1.7 }}>
          به خانهٔ گیمرهای ایران خوش اومدی — با شمارهٔ موبایلت وارد شو.
        </span>
      </div>

      {/* card */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 18, padding: 20, boxShadow: '0 20px 60px -30px rgba(0,0,0,.9)' }}>
        {/* top accent line */}
        <div aria-hidden style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 2, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)` }} />

        {/* mode toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, background: C.ink, borderRadius: 12, padding: 4 }}>
          {([['otp', 'کد پیامکی'], ['password', 'گذرواژه']] as const).map(([m, label]) => (
            <button key={m} type="button" onClick={() => { setMode(m); setErr(null) }}
              style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, fontSize: 13, fontWeight: 700, transition: 'all .15s', background: mode === m ? C.accent : 'transparent', color: mode === m ? C.ink : C.tbody }}>
              {label}
            </button>
          ))}
        </div>

        {mode === 'otp' ? (
          <form onSubmit={otpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: C.tmut }}>شمارهٔ موبایل</span>
              <input dir="ltr" inputMode="numeric" placeholder="09120000000" value={phone} autoComplete="tel" disabled={sent}
                onChange={e => { setPhoneErr(null); setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)) }} style={{ ...inp, fontFamily: DISP, textAlign: 'left', letterSpacing: '.04em', opacity: sent ? 0.6 : 1 }} required />
              {phoneErr && <span style={{ fontSize: 11.5, color: C.live }}>{phoneErr}</span>}
            </label>

            {sent && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, color: C.tmut }}>کد پیامک‌شده</span>
                <input ref={codeRef} dir="ltr" inputMode="numeric" placeholder="- - - - -" value={code} autoComplete="one-time-code"
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} style={{ ...inp, fontFamily: DISP, textAlign: 'center', letterSpacing: '.4em', fontSize: 22 }} required />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                  <button type="button" onClick={sendCode} disabled={cooldown > 0 || busy}
                    style={{ all: 'unset', cursor: cooldown > 0 ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, color: cooldown > 0 ? C.tmut : C.accent }}>
                    {cooldown > 0 ? `ارسال دوباره تا ${faNum(cooldown)} ثانیه` : 'ارسال دوبارهٔ کد'}
                  </button>
                  <button type="button" onClick={() => { setSent(false); setCode(''); setCooldown(0) }} style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: C.tmut }}>تغییر شماره</button>
                </div>
              </label>
            )}

            {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}

            {!sent
              ? <Button type="button" onClick={sendCode} disabled={busy || !phoneOk}>{busy ? 'در حال ارسال…' : 'ارسال کد'}</Button>
              : <Button type="submit" disabled={busy}>{busy ? 'در حال ورود…' : 'ورود'}</Button>}

            <div style={{ textAlign: 'center', fontSize: 12.5, color: C.tmut, lineHeight: 1.7 }}>
              حساب نداری؟ با همین کد پیامکی، حسابت خودکار ساخته می‌شه.
            </div>
          </form>
        ) : (
          <form onSubmit={passwordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
    </div>
  )
}
