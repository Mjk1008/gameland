'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { DISC } from '@/lib/mock-data'

export default function SignupPage() {
  return <Suspense fallback={null}><SignupInner /></Suspense>
}

function SignupInner() {
  const router = useRouter()
  const search = useSearchParams()
  const phone = search.get('phone') || ''
  const code  = search.get('code')  || ''

  const [name, setName] = useState('')
  const [tag,  setTag]  = useState('')
  const [city, setCity] = useState('')
  const [disc, setDisc] = useState<keyof typeof DISC | ''>('')
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, name, tag, city, disc: disc || null }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'خطا')
      // signup consumed the code. Issue a fresh one and auto-login.
      await fetch('/api/otp', { method: 'POST', body: JSON.stringify({ phone }), headers: { 'Content-Type': 'application/json' } })
      await signIn('credentials', { phone, code: '123456', redirect: false })
      router.push('/me')
      router.refresh()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  if (!phone || !code) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 14 }}>برای ثبت‌نام ابتدا موبایل خود را تأیید کنید</div>
          <Link href="/login" style={{ color: '#22d3ee', textDecoration: 'underline' }}>برو به صفحهٔ ورود</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 18px 32px' }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <Link href="/" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 28, letterSpacing: '.05em', color: '#22d3ee', textDecoration: 'none' }} dir="ltr">GAMELAND</Link>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginTop: 8 }}>ساخت پروفایل گیمر</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>این اطلاعات روی Gamer Bank و صفحهٔ افتخارات نمایش داده می‌شود</div>
      </div>

      <form onSubmit={submit} style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 14 }}>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>نام و نام خانوادگی</span>
          <input value={name} onChange={e => setName(e.target.value)} required
            style={inputStyle} placeholder="مثلاً آرش رستمی" />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>تگ بازی <span style={{ color: '#64748b' }}>(انگلیسی، یونیک)</span></span>
          <input dir="ltr" value={tag} onChange={e => setTag(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} required
            style={{ ...inputStyle, fontFamily: 'Rajdhani, sans-serif', textAlign: 'left' }} placeholder="ZEUS" />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>شهر</span>
          <input value={city} onChange={e => setCity(e.target.value)} required
            style={inputStyle} placeholder="تهران" />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>رشتهٔ اصلی</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(Object.keys(DISC) as (keyof typeof DISC)[]).map(k => {
              const d = DISC[k], on = disc === k
              return (
                <button key={k} type="button" onClick={() => setDisc(k)}
                  style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '10px 0', border: `1px solid ${on ? d.color : '#1e293b'}`, borderRadius: 11, background: on ? d.color + '22' : '#121821', color: on ? d.color : '#94a3b8', fontWeight: 700, fontSize: 13 }}>
                  {d.name}
                </button>
              )
            })}
          </div>
        </label>

        {err && <div style={{ fontSize: 12, color: '#fb7185', background: '#fb71851a', border: '1px solid #fb718533', padding: 10, borderRadius: 10 }}>{err}</div>}

        <button type="submit" disabled={busy} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', background: '#22d3ee', color: '#0b0f14', fontWeight: 700, fontSize: 15, padding: '13px 0', borderRadius: 12, marginTop: 6, opacity: busy ? 0.6 : 1 }}>
          {busy ? '...' : 'ساخت حساب'}
        </button>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#121821', border: '1px solid #1e293b', borderRadius: 12,
  padding: '12px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none',
}
