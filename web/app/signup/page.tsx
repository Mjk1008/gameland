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
  const [email, setEmail] = useState('')
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
  const [fe, setFe] = useState<Record<string, string>>({})
  const clear = (k: string) => setFe(p => { if (!p[k]) return p; const n = { ...p }; delete n[k]; return n })

  const cities = province ? citiesOf(province) : []
  const toggleDisc = (k: keyof typeof DISC) => { clear('discs'); setDiscs(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k]) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!firstName.trim()) errs.firstName = 'نامت رو بنویس'
    if (!lastName.trim()) errs.lastName = 'نام خانوادگی‌ات رو بنویس'
    if (!/^09\d{9}$/.test(phone)) errs.phone = 'شماره با ۰۹ شروع می‌شه و ۱۱ رقمه'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'ایمیلت رو کامل و درست بنویس، مثل you@gmail.com'
    if (password.length < 8) errs.password = 'گذرواژه دست‌کم ۸ کاراکتر باشه'
    if (!province) errs.province = 'استانت رو انتخاب کن'
    if (!city) errs.city = 'شهرت رو انتخاب کن'
    if (tag.length < 3) errs.tag = 'تگ دست‌کم ۳ حرف انگلیسی باشه'
    if (discs.length === 0) errs.discs = 'دست‌کم یه رشته انتخاب کن'
    setFe(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email, password, firstName, lastName, province, city, messenger, tag, discs, experienceYears: exp ? Number(exp) : undefined, teamName: team || undefined }),
      })
      const j = await res.json()
      if (!res.ok) {
        const msg = j.error || 'یه مشکلی پیش اومد، دوباره امتحان کن'
        if (/شماره/.test(msg)) setFe({ phone: msg })
        else if (/ایمیل/.test(msg)) setFe({ email: msg })
        else if (/تگ/.test(msg)) setFe({ tag: msg })
        else setFe({ form: msg })
        setBusy(false); return
      }
      await signIn('credentials', { phone, password, redirect: false })
      window.location.href = '/me'
    } catch (e: any) { setFe({ form: e.message }); setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '34px 18px 40px' }}>
      <div style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Wordmark size={24} />
        <div style={{ fontSize: 15, fontWeight: 800, color: C.thi }}>ساخت حساب گیمری</div>
      </div>

      <form onSubmit={submit} style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="نام" err={fe.firstName}><input value={firstName} onChange={e => { clear('firstName'); setFirstName(e.target.value) }} style={inp} placeholder="آرش" /></Field>
          <Field label="نام خانوادگی" err={fe.lastName}><input value={lastName} onChange={e => { clear('lastName'); setLastName(e.target.value) }} style={inp} placeholder="رستمی" /></Field>
        </div>

        <Field label="شمارهٔ موبایل" err={fe.phone}>
          <input dir="ltr" inputMode="numeric" autoComplete="tel" value={phone} onChange={e => { clear('phone'); setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)) }} style={{ ...inp, fontFamily: DISP, textAlign: 'left' }} placeholder="09120000000" />
        </Field>
        <Field label="ایمیل — برای بازیابی گذرواژه" err={fe.email}>
          <input dir="ltr" type="email" autoComplete="email" value={email} onChange={e => { clear('email'); setEmail(e.target.value) }} style={{ ...inp, textAlign: 'left' }} placeholder="you@gmail.com" />
        </Field>
        <Field label="گذرواژه (حداقل ۸ کاراکتر)" err={fe.password}>
          <input type="password" autoComplete="new-password" value={password} onChange={e => { clear('password'); setPassword(e.target.value) }} style={inp} placeholder="••••••••" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="استان" err={fe.province}>
            <select value={province} onChange={e => { clear('province'); setProvince(e.target.value); setCity('') }} style={inp as any}>
              <option value="">انتخاب…</option>
              {IRAN_GEO.map(p => <option key={p.province} value={p.province}>{p.province}</option>)}
            </select>
          </Field>
          <Field label="شهر" err={fe.city}>
            <select value={city} onChange={e => { clear('city'); setCity(e.target.value) }} disabled={!province} style={{ ...inp, opacity: province ? 1 : 0.45 } as any}>
              <option value="">{province ? 'انتخاب…' : 'اول استان'}</option>
              {cities.map(cc => <option key={cc} value={cc}>{cc}</option>)}
            </select>
          </Field>
        </div>

        <Field label="اسم مستعار (تگ) — انگلیسی و یکتا" err={fe.tag}>
          <input dir="ltr" value={tag} onChange={e => { clear('tag'); setTag(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '')) }} style={{ ...inp, fontFamily: DISP, textAlign: 'left' }} placeholder="Arsh_FC" />
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
          {fe.discs && <span style={{ fontSize: 11.5, color: C.live }}>{fe.discs}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="سابقهٔ بازی (سال)"><input inputMode="numeric" value={exp} onChange={e => setExp(e.target.value.replace(/\D/g, '').slice(0, 2))} style={{ ...inp, fontFamily: DISP, textAlign: 'left' }} placeholder="3" /></Field>
          <Field label="نام تیم (اختیاری)"><input value={team} onChange={e => setTeam(e.target.value)} style={inp} placeholder="—" /></Field>
        </div>

        {fe.form && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{fe.form}</div>}

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
function Field({ label, children, err }: { label: string; children: React.ReactNode; err?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, color: C.tmut }}>{label}</span>
      {children}
      {err && <span style={{ fontSize: 11.5, color: C.live }}>{err}</span>}
    </label>
  )
}
