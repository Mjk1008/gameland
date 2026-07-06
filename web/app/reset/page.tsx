'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { C, Wordmark, Button } from '@/components/ui'

function ResetInner() {
  const token = useSearchParams().get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (password.length < 8) { setErr('گذرواژه باید حداقل ۸ کاراکتر باشه'); return }
    if (password !== confirm) { setErr('دو گذرواژه یکی نیستن'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'یه مشکلی پیش اومد')
      setDone(true)
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  const inp: React.CSSProperties = { background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '13px 14px', color: C.thi, fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 18px' }}>
      <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Wordmark size={24} />
        <div style={{ fontSize: 15, fontWeight: 800, color: C.thi }}>گذرواژهٔ جدید</div>
      </div>

      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!token ? (
          <>
            <div style={{ background: C.liveSoft, border: `1px solid ${C.live}55`, borderRadius: 14, padding: 16, fontSize: 13, color: C.thi, lineHeight: 2, textAlign: 'center' }}>
              لینک ناقصه یا باز نشده. دوباره از صفحهٔ بازیابی درخواست بده.
            </div>
            <Button href="/forgot" kind="secondary">درخواست لینک تازه</Button>
          </>
        ) : done ? (
          <>
            <div style={{ background: C.winSoft, border: `1px solid ${C.win}55`, borderRadius: 14, padding: 16, fontSize: 13, color: C.thi, lineHeight: 2, textAlign: 'center' }}>
              گذرواژه‌ات عوض شد. حالا با گذرواژهٔ جدید وارد شو.
            </div>
            <Button href="/login">ورود</Button>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: C.tmut }}>گذرواژهٔ جدید (حداقل ۸ کاراکتر)</span>
              <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required style={inp} placeholder="••••••••" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: C.tmut }}>تکرار گذرواژه</span>
              <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={inp} placeholder="••••••••" />
            </label>
            {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}
            <Button type="submit" disabled={busy}>{busy ? 'در حال ذخیره…' : 'ثبت گذرواژهٔ جدید'}</Button>
            <div style={{ textAlign: 'center', fontSize: 12.5, color: C.tmut }}>
              <Link href="/login" style={{ color: C.accent, textDecoration: 'none', fontWeight: 700 }}>بازگشت به ورود</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPage() {
  return <Suspense fallback={null}><ResetInner /></Suspense>
}
