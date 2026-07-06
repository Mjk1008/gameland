'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DISC } from '@/lib/mock-data'

export default function EditForm({ user }: { user: { name: string; tag: string; city: string; primaryDisc: string; nationalId: string } }) {
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [tag,  setTag]  = useState(user.tag)
  const [city, setCity] = useState(user.city)
  const [disc, setDisc] = useState(user.primaryDisc)
  const [nid,  setNid]  = useState(user.nationalId)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)
  const [ok,   setOk]   = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setOk(false); setBusy(true)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tag, city, primaryDisc: disc || null, nationalId: nid }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ذخیره نشد، دوباره امتحان کن')
      setOk(true)
      router.refresh()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ padding: '12px 16px 28px' }} className="animate-fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <Link href="/me" style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 11, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>ویرایش پروفایل</span>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="نام و نام خانوادگی"><input value={name} onChange={e => setName(e.target.value)} required style={inp}/></Field>
        <Field label="تگ بازی (انگلیسی و یکتا)"><input dir="ltr" value={tag} onChange={e => setTag(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} required style={{ ...inp, fontFamily: 'Rajdhani, sans-serif', textAlign: 'left' }}/></Field>
        <Field label="شهر"><input value={city} onChange={e => setCity(e.target.value)} required style={inp}/></Field>
        <Field label="رشتهٔ اصلی">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(Object.keys(DISC) as (keyof typeof DISC)[]).map(k => {
              const d = DISC[k], on = disc === k
              return (
                <button key={k} type="button" onClick={() => setDisc(k)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '10px 0', border: `1px solid ${on ? d.color : '#1e293b'}`, borderRadius: 11, background: on ? d.color + '22' : '#121821', color: on ? d.color : '#94a3b8', fontWeight: 700, fontSize: 13 }}>
                  {d.name}
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="کد ملی (اختیاری — برای احراز هویت در مسابقه‌های بزرگ)">
          <input dir="ltr" value={nid} onChange={e => setNid(e.target.value.replace(/\D/g, '').slice(0, 10))} style={{ ...inp, fontFamily: 'Rajdhani, sans-serif', textAlign: 'left' }} placeholder="0010000000"/>
        </Field>

        {err && <Alert color="#fb7185">{err}</Alert>}
        {ok && <Alert color="#34d399">پروفایلت ذخیره شد ✓</Alert>}

        <button type="submit" disabled={busy} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', background: '#22d3ee', color: '#0b0f14', fontWeight: 700, fontSize: 15, padding: '13px 0', borderRadius: 12, opacity: busy ? 0.6 : 1, marginTop: 4 }}>
          {busy ? 'در حال ذخیره…' : 'ذخیره'}
        </button>
      </form>
    </div>
  )
}

const inp: React.CSSProperties = { background: '#121821', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>{children}</label>
}
function Alert({ color, children }: { color: string; children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color, background: color + '1a', border: `1px solid ${color}33`, padding: 10, borderRadius: 10 }}>{children}</div>
}
