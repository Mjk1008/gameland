'use client'
import { Suspense, useState, useEffect } from 'react'
import { signIn, getProviders } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { C, DISP, Wordmark, Button } from '@/components/ui'

export default function LoginPage() {
  return <Suspense fallback={null}><LoginInner /></Suspense>
}

const inp: React.CSSProperties = {
  background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '13px 14px',
  color: C.thi, fontFamily: DISP, fontSize: 17, textAlign: 'left', letterSpacing: '.04em', outline: 'none', width: '100%', boxSizing: 'border-box',
}

function LoginInner() {
  const router = useRouter()
  const search = useSearchParams()
  const callbackUrl = search.get('callbackUrl') || '/me'

  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code,  setCode]  = useState('')
  const [busy,  setBusy]  = useState(false)
  const [err,   setErr]   = useState<string | null>(null)
  const [hasGoogle, setHasGoogle] = useState(false)

  useEffect(() => { getProviders().then(p => setHasGoogle(!!p?.google)).catch(() => {}) }, [])

  async function sendCode(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/otp', { method: 'POST', body: JSON.stringify({ phone }), headers: { 'Content-Type': 'application/json' } })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'خطا')
      setStep('code')
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true)
    try {
      const r = await signIn('credentials', { phone, code, redirect: false, callbackUrl })
      if (r?.error) throw new Error('کد اشتباه یا منقضی شده')
      const session = await (await fetch('/api/auth/session')).json()
      if (session?.uid === '__new__' || (!session?.uid && r?.ok)) {
        router.push(`/signup?phone=${encodeURIComponent(phone)}&code=${encodeURIComponent(code)}`)
      } else { router.push(callbackUrl); router.refresh() }
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 18px' }}>
      <div style={{ marginBottom: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
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
            <span style={{ flex: 1, height: 1, background: C.line }} />یا با موبایل<span style={{ flex: 1, height: 1, background: C.line }} />
          </div>
        </div>
      )}

      <form onSubmit={step === 'phone' ? sendCode : submitCode} style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: C.tmut }}>شمارهٔ موبایل</span>
          <input dir="ltr" inputMode="numeric" pattern="09\d{9}" placeholder="09120000000" value={phone} disabled={step === 'code'}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} style={inp} required />
        </label>

        {step === 'code' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: C.tmut }}>کد ارسال‌شده</span>
            <input dir="ltr" inputMode="numeric" pattern="\d{6}" placeholder="123456" value={code} autoFocus required
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} style={{ ...inp, fontSize: 22, textAlign: 'center', letterSpacing: '.3em' }} />
            <span style={{ fontSize: 11, color: C.tmut, textAlign: 'center' }}>برای تست: کد <b dir="ltr">123456</b> همیشه کار می‌کنه</span>
          </label>
        )}

        {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}

        <Button type="submit" disabled={busy}>{busy ? '...' : step === 'phone' ? 'ارسال کد' : 'تأیید و ورود'}</Button>

        {step === 'code' && (
          <button type="button" onClick={() => { setStep('phone'); setCode(''); setErr(null) }} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', fontSize: 12, color: C.tmut }}>تغییر شماره</button>
        )}

        <div style={{ marginTop: 14, padding: 12, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 11, fontSize: 11, color: C.tmut, lineHeight: 1.9 }}>
          <div>حساب تست:</div>
          <div>• ادمین → <span dir="ltr">09120000000</span> / کد <span dir="ltr">123456</span></div>
        </div>
      </form>
    </div>
  )
}
