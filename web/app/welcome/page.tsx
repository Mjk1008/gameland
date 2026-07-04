'use client'
import { useState } from 'react'
import { DISC } from '@/lib/mock-data'
import { IRAN_GEO, citiesOf } from '@/lib/iran-geo'

type Messenger = 'whatsapp' | 'telegram' | 'both'

export default function WelcomePage() {
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [province,  setProvince]  = useState('')
  const [city,      setCity]      = useState('')
  const [phone,     setPhone]     = useState('')
  const [messenger, setMessenger] = useState<Messenger>('whatsapp')
  const [tag,       setTag]       = useState('')
  const [discs,     setDiscs]     = useState<(keyof typeof DISC)[]>([])
  const [exp,       setExp]       = useState('')
  const [team,      setTeam]      = useState('')
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  const cities = province ? citiesOf(province) : []

  function toggleDisc(k: keyof typeof DISC) {
    setDiscs(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (!firstName || !lastName || !province || !city || !phone || !tag || discs.length === 0) {
      setErr('همهٔ فیلدها به‌جز نام تیم الزامی است'); return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/profile/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName, lastName, province, city, phone, messenger,
          tag, discs, experienceYears: exp ? Number(exp) : undefined, teamName: team || undefined,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'خطا')
      window.location.href = '/me'   // full reload → session JWT refreshes needsProfile
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 18px 40px' }}>
      <div style={{ marginBottom: 22, textAlign: 'center' }}>
        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 28, letterSpacing: '.05em', color: '#22d3ee' }} dir="ltr">GAMELAND</span>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginTop: 8 }}>تکمیل پروفایل گیمر</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>برای ثبت‌نام در مسابقات لازمه — روی Gamer Bank و صفحهٔ افتخارات دیده می‌شود</div>
      </div>

      <form onSubmit={submit} style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 13 }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="نام"><input value={firstName} onChange={e => setFirstName(e.target.value)} required style={inp} placeholder="آرش"/></Field>
          <Field label="نام خانوادگی"><input value={lastName} onChange={e => setLastName(e.target.value)} required style={inp} placeholder="رستمی"/></Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="استان">
            <select value={province} onChange={e => { setProvince(e.target.value); setCity('') }} required style={inp as any}>
              <option value="">انتخاب…</option>
              {IRAN_GEO.map(p => <option key={p.province} value={p.province}>{p.province}</option>)}
            </select>
          </Field>
          <Field label="شهر">
            <select value={city} onChange={e => setCity(e.target.value)} required disabled={!province} style={{ ...inp, opacity: province ? 1 : 0.5 } as any}>
              <option value="">{province ? 'انتخاب…' : 'اول استان'}</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="اسم مستعار (تگ) — انگلیسی، یونیک">
          <input dir="ltr" value={tag} onChange={e => setTag(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} required
            style={{ ...inp, fontFamily: 'Rajdhani, sans-serif', textAlign: 'left' }} placeholder="ZEUS"/>
        </Field>

        <Field label="شماره تماس">
          <input dir="ltr" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} required
            style={{ ...inp, fontFamily: 'Rajdhani, sans-serif', textAlign: 'left' }} placeholder="09120000000"/>
        </Field>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>این شماره روی کدام پیام‌رسان فعال است؟</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {([['whatsapp','واتساپ'],['telegram','تلگرام'],['both','هردو']] as const).map(([k, label]) => {
              const on = messenger === k
              return <button key={k} type="button" onClick={() => setMessenger(k)} style={chip(on, '#34d399')}>{label}</button>
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>رشته‌هایی که بازی می‌کنی <span style={{ color: '#64748b' }}>(چندتایی)</span></span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(Object.keys(DISC) as (keyof typeof DISC)[]).map(k => {
              const d = DISC[k], on = discs.includes(k)
              return <button key={k} type="button" onClick={() => toggleDisc(k)} style={{ ...chip(on, d.color), textAlign: 'center' }}>{d.name}</button>
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="سابقهٔ بازی (سال)"><input inputMode="numeric" value={exp} onChange={e => setExp(e.target.value.replace(/\D/g, '').slice(0, 2))} style={inp} placeholder="۳"/></Field>
          <Field label="نام تیم (اختیاری)"><input value={team} onChange={e => setTeam(e.target.value)} style={inp} placeholder="—"/></Field>
        </div>

        {err && <div style={{ fontSize: 12, color: '#fb7185', background: '#fb71851a', border: '1px solid #fb718533', padding: 10, borderRadius: 10 }}>{err}</div>}

        <button type="submit" disabled={busy} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', background: '#22d3ee', color: '#0b0f14', fontWeight: 800, fontSize: 15, padding: '13px 0', borderRadius: 12, opacity: busy ? 0.6 : 1, marginTop: 4 }}>
          {busy ? '...' : 'ورود به گیم‌لند'}
        </button>
      </form>
    </div>
  )
}

const inp: React.CSSProperties = { background: '#121821', border: '1px solid #1e293b', borderRadius: 11, padding: '11px 13px', color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
function chip(on: boolean, color: string): React.CSSProperties {
  return { all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '10px 0', border: `1px solid ${on ? color : '#1e293b'}`, borderRadius: 10, background: on ? color + '22' : '#121821', color: on ? color : '#94a3b8', fontWeight: 700, fontSize: 12 }
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>{children}</label>
}
