'use client'
import { Suspense, useState, useEffect } from 'react'
import { signIn, getProviders } from 'next-auth/react'
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

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [phoneErr, setPhoneErr] = useState<string | null>(null)
  const [hasGoogle, setHasGoogle] = useState(false)

  useEffect(() => { getProviders().then(p => setHasGoogle(!!p?.google)).catch(() => {}) }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setPhoneErr(null)
    if (!/^09\d{9}$/.test(phone)) { setPhoneErr('شماره با ۰۹ شروع می‌شه و ۱۱ رقمه'); return }
    setBusy(true)
    try {
      const r = await signIn('credentials', { phone, password, redirect: false, callbackUrl })
      if (r?.error) throw new Error('شماره موبایل یا گذرواژه درست نیست، دوباره چک کن')
      router.push(callbackUrl); router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 18px' }}>
      <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <Wordmark size={26} />
        <span style={{ fontSize: 14, fontWeight: 700, color: C.thi }}>ورود به حساب</span>
      </div>

      {hasGoogle && (
        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
          <button type="button" onClick={() => signIn('google', { callbackUrl })}
            style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#fff', color: '#1f2937', fontWeight: 700, fontSize: 15, height: 46, borderRadius: 11 }}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            ورود با گوگل
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.tmut, fontSize: 11 }}>
            <span style={{ flex: 1, height: 1, background: C.line }} />یا با شماره موبایل<span style={{ flex: 1, height: 1, background: C.line }} />
          </div>
        </div>
      )}

      <form onSubmit={submit} style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
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
    </div>
  )
}
