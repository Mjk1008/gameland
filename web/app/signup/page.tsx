'use client'
import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { C, DISP, Wordmark, Button } from '@/components/ui'
import { track, getTrackSessionId } from '@/lib/track'

export default function SignupPage() {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [fe, setFe] = useState<Record<string, string>>({})
  const clear = (k: string) => setFe(p => { if (!p[k]) return p; const n = { ...p }; delete n[k]; return n })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!/^09\d{9}$/.test(phone)) errs.phone = 'شماره با ۰۹ شروع می‌شه و ۱۱ رقمه'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'ایمیلت رو کامل و درست بنویس، مثل you@gmail.com'
    if (password.length < 8) errs.password = 'گذرواژه دست‌کم ۸ کاراکتر باشه'
    setFe(errs)
    if (Object.keys(errs).length) return
    track('signup_start')
    setBusy(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email, password, sessionId: getTrackSessionId() }),
      })
      const j = await res.json()
      if (!res.ok) {
        const msg = j.error || 'یه مشکلی پیش اومد، دوباره امتحان کن'
        if (/شماره/.test(msg)) setFe({ phone: msg })
        else if (/ایمیل/.test(msg)) setFe({ email: msg })
        else setFe({ form: msg })
        setBusy(false); return
      }
      // signup_complete fires server-side with user_id — see /api/signup
      // redirect:true → NextAuth navigates only after the session cookie is
      // set, avoiding a race where /me loads before auth and bounces to /login.
      await signIn('credentials', { phone, password, redirect: true, callbackUrl: '/me' })
    } catch (e: any) { setFe({ form: e.message }); setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '34px 18px 40px' }}>
      <div style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Wordmark size={24} />
        <div style={{ fontSize: 15, fontWeight: 800, color: C.thi }}>ساخت حساب</div>
        <div style={{ fontSize: 12.5, color: C.tmut, textAlign: 'center', lineHeight: 1.9, maxWidth: 300 }}>
          فقط با سه‌تا فیلد شروع کن؛ بقیهٔ اطلاعات رو بعداً توی پروفایلت کامل می‌کنی.
        </div>
      </div>

      <form onSubmit={submit} style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="شمارهٔ موبایل" err={fe.phone}>
          <input dir="ltr" inputMode="numeric" autoComplete="tel" value={phone} onChange={e => { clear('phone'); setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)) }} style={{ ...inp, fontFamily: DISP, textAlign: 'left' }} placeholder="09120000000" />
        </Field>
        <Field label="ایمیل — برای بازیابی گذرواژه" err={fe.email}>
          <input dir="ltr" type="email" autoComplete="email" value={email} onChange={e => { clear('email'); setEmail(e.target.value) }} style={{ ...inp, textAlign: 'left' }} placeholder="you@gmail.com" />
        </Field>
        <Field label="گذرواژه (حداقل ۸ کاراکتر)" err={fe.password}>
          <input type="password" autoComplete="new-password" value={password} onChange={e => { clear('password'); setPassword(e.target.value) }} style={inp} placeholder="••••••••" />
        </Field>

        {fe.form && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{fe.form}</div>}

        <Button type="submit" disabled={busy} style={{ marginTop: 4 }}>{busy ? 'در حال ساخت حساب…' : 'ساخت حساب و ادامه'}</Button>

        <div style={{ textAlign: 'center', fontSize: 12.5, color: C.tmut }}>
          حساب داری؟ <Link href="/login" style={{ color: C.accent, textDecoration: 'none', fontWeight: 700 }}>وارد شو</Link>
        </div>
      </form>
    </div>
  )
}

const inp: React.CSSProperties = { background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '12px 14px', color: C.thi, fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box' }
function Field({ label, children, err }: { label: string; children: React.ReactNode; err?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, color: C.tmut }}>{label}</span>
      {children}
      {err && <span style={{ fontSize: 11.5, color: C.live }}>{err}</span>}
    </label>
  )
}
