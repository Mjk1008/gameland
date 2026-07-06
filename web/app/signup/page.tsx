'use client'
import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { DISC } from '@/lib/mock-data'
import { IRAN_GEO, citiesOf } from '@/lib/iran-geo'
import { C, DISP, Wordmark, Button, DISC_DOT } from '@/components/ui'

type Messenger = 'whatsapp' | 'telegram' | 'both'

export default function SignupPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [messenger, setMessenger] = useState<Messenger>('whatsapp')
  const [tag, setTag] = useState('')
  const [discs, setDiscs] = useState<(keyof typeof DISC)[]>([])
  const [exp, setExp] = useState('')
  const [team, setTeam] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const cities = province ? citiesOf(province) : []
  const toggleDisc = (k: keyof typeof DISC) => setDiscs(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (!/^09\d{9}$/.test(phone)) { setErr('شمارهٔ موبایل درست نیست — با ۰۹ شروع می‌شه و ۱۱ رقمه'); return }
    if (password.length < 8) { setErr('گذرواژه باید حداقل ۸ کاراکتر باشه'); return }
    if (!firstName || !lastName || !province || !city || !tag || discs.length === 0) { setErr('همهٔ فیلدها جز نام تیم رو باید پر کنی'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, firstName, lastName, province, city, messenger, tag, discs, experienceYears: exp ? Number(exp) : undefined, teamName: team || undefined }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'یه مشکلی پیش اومد، دوباره امتحان کن')
      await signIn('credentials', { phone, password, redirect: false })
      window.location.href = '/me'
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '34px 18px 40px' }}>
      <div style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Wordmark size={24} />
        <div style={{ fontSize: 15, fontWeight: 800, color: C.thi }}>ساخت حساب گیمری</div>
      </div>

      <form onSubmit={submit} style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="نام"><input value={firstName} onChange={e => setFirstName(e.target.value)} required style={inp} placeholder="آرش" /></Field>
          <Field label="نام خانوادگی"><input value={lastName} onChange={e => setLastName(e.target.value)} required style={inp} placeholder="رستمی" /></Field>
        </div>

        <Field label="شمارهٔ موبایل">
          <input dir="ltr" inputMode="numeric" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} required style={{ ...inp, fontFamily: DISP, textAlign: 'left' }} placeholder="09120000000" />
        </Field>
        <Field label="گذرواژه (حداقل ۸ کاراکتر)">
          <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required style={inp} placeholder="••••••••" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="استان">
            <select value={province} onChange={e => { setProvince(e.target.value); setCity('') }} required style={inp as any}>
              <option value="">انتخاب…</option>
              {IRAN_GEO.map(p => <option key={p.province} value={p.province}>{p.province}</option>)}
            </select>
          </Field>
          <Field label="شهر">
            <select value={city} onChange={e => setCity(e.target.value)} required disabled={!province} style={{ ...inp, opacity: province ? 1 : 0.45 } as any}>
              <option value="">{province ? 'انتخاب…' : 'اول استان'}</option>
              {cities.map(cc => <option key={cc} value={cc}>{cc}</option>)}
            </select>
          </Field>
        </div>

        <Field label="اسم مستعار (تگ) — انگلیسی و یکتا">
          <input dir="ltr" value={tag} onChange={e => setTag(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} required style={{ ...inp, fontFamily: DISP, textAlign: 'left' }} placeholder="Arsh_FC" />
        </Field>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: C.tmut }}>روی این شماره کدوم پیام‌رسان فعاله؟</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {([['whatsapp', 'واتساپ'], ['telegram', 'تلگرام'], ['both', 'هردو']] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setMessenger(k)} style={chip(messenger === k)}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: C.tmut }}>رشته‌هایی که بازی می‌کنی <span style={{ color: C.tmut }}>(چندتایی)</span></span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(Object.keys(DISC) as (keyof typeof DISC)[]).map(k => (
              <button key={k} type="button" onClick={() => toggleDisc(k)} style={{ ...chip(discs.includes(k)), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: DISC_DOT[k] }} />{DISC[k].name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="سابقهٔ بازی (سال)"><input inputMode="numeric" value={exp} onChange={e => setExp(e.target.value.replace(/\D/g, '').slice(0, 2))} style={{ ...inp, fontFamily: DISP, textAlign: 'left' }} placeholder="3" /></Field>
          <Field label="نام تیم (اختیاری)"><input value={team} onChange={e => setTeam(e.target.value)} style={inp} placeholder="—" /></Field>
        </div>

        {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}

        <Button type="submit" disabled={busy} style={{ marginTop: 4 }}>{busy ? 'در حال ساخت حساب…' : 'ساخت حساب و ورود'}</Button>

        <div style={{ textAlign: 'center', fontSize: 12.5, color: C.tmut }}>
          حساب داری؟ <Link href="/login" style={{ color: C.accent, textDecoration: 'none', fontWeight: 700 }}>وارد شو</Link>
        </div>
      </form>
    </div>
  )
}

const inp: React.CSSProperties = { background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 13px', color: C.thi, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
function chip(on: boolean): React.CSSProperties {
  return { all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '10px 0', border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 700, fontSize: 12 }
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, color: C.tmut }}>{label}</span>{children}</label>
}
