'use client'
import { useState } from 'react'
import { DISC } from '@/lib/mock-data'
import { IRAN_GEO, citiesOf } from '@/lib/iran-geo'
import { C, DISP, Wordmark, Button, GameBadge } from '@/components/ui'

type Messenger = 'whatsapp' | 'telegram' | 'both'
type Disc = keyof typeof DISC

export type ProfileInit = {
  firstName: string; lastName: string; province: string; city: string
  phone: string; messenger: Messenger; tag: string; discs: Disc[]
  exp: string; team: string; playerId: string; hasPhone: boolean; isComplete: boolean
}

export default function WelcomeForm({ init }: { init: ProfileInit }) {
  const [firstName, setFirstName] = useState(init.firstName)
  const [lastName,  setLastName]  = useState(init.lastName)
  const [province,  setProvince]  = useState(init.province)
  const [city,      setCity]      = useState(init.city)
  const [phone,     setPhone]     = useState(init.phone)
  const [messenger, setMessenger] = useState<Messenger>(init.messenger)
  const [tag,       setTag]       = useState(init.tag)
  const [discs,     setDiscs]     = useState<Disc[]>(init.discs)
  const [exp,       setExp]       = useState(init.exp)
  const [team,      setTeam]      = useState(init.team)
  const [playerId,  setPlayerId]  = useState(init.playerId)
  const [busy, setBusy] = useState(false)
  const [fe, setFe] = useState<Record<string, string>>({})
  const clear = (k: string) => setFe(p => { if (!p[k]) return p; const n = { ...p }; delete n[k]; return n })

  const cities = province ? citiesOf(province) : []
  const toggleDisc = (k: Disc) => { clear('discs'); setDiscs(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k]) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!firstName.trim()) errs.firstName = 'نامت رو بنویس'
    if (!lastName.trim()) errs.lastName = 'نام خانوادگی‌ات رو بنویس'
    if (!province) errs.province = 'استانت رو انتخاب کن'
    if (!city) errs.city = 'شهرت رو انتخاب کن'
    if (tag.length < 3) errs.tag = 'تگ دست‌کم ۳ حرف انگلیسی باشه'
    if (!/^09\d{9}$/.test(phone)) errs.phone = 'شماره با ۰۹ شروع می‌شه و ۱۱ رقمه'
    if (discs.length === 0) errs.discs = 'دست‌کم یه رشته انتخاب کن'
    setFe(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const res = await fetch('/api/profile/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, province, city, phone, messenger, tag, discs, experienceYears: exp ? Number(exp) : undefined, teamName: team || undefined, playerId: playerId || undefined }),
      })
      const j = await res.json()
      if (!res.ok) {
        const msg = j.error || 'یه مشکلی پیش اومد، دوباره امتحان کن'
        if (/تگ/.test(msg)) setFe({ tag: msg })
        else if (/شماره/.test(msg)) setFe({ phone: msg })
        else setFe({ form: msg })
        setBusy(false); return
      }
      window.location.href = '/me'
    } catch (e: any) { setFe({ form: e.message }); setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '34px 18px 40px' }}>
      <div style={{ marginBottom: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Wordmark size={24} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.thi }}>{init.isComplete ? 'ویرایش پروفایل' : 'پروفایلت رو کامل کن'}</div>
          <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 5 }}>برای شرکت در مسابقه‌ها لازمه — روی رنکینگ و صفحهٔ افتخارات دیده می‌شه</div>
        </div>
      </div>

      <form onSubmit={submit} style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="نام" err={fe.firstName}><input value={firstName} onChange={e => { clear('firstName'); setFirstName(e.target.value) }} style={inp} placeholder="آرش" /></Field>
          <Field label="نام خانوادگی" err={fe.lastName}><input value={lastName} onChange={e => { clear('lastName'); setLastName(e.target.value) }} style={inp} placeholder="رستمی" /></Field>
        </div>

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

        {!init.hasPhone && (
          <Field label="شماره تماس" err={fe.phone}>
            <input dir="ltr" inputMode="numeric" value={phone} onChange={e => { clear('phone'); setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)) }} style={{ ...inp, fontFamily: DISP, textAlign: 'left' }} placeholder="09120000000" />
          </Field>
        )}

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
            {(Object.keys(DISC) as Disc[]).map(k => {
              const on = discs.includes(k)
              return (
                <button key={k} type="button" onClick={() => toggleDisc(k)} style={{ ...chip(on), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <GameBadge disc={k} size={20} />{DISC[k].name}
                </button>
              )
            })}
          </div>
          {fe.discs && <span style={{ fontSize: 11.5, color: C.live }}>{fe.discs}</span>}
        </div>

        <Field label="آیدی داخل بازی / پلتفرم (اختیاری)">
          <input dir="ltr" value={playerId} onChange={e => setPlayerId(e.target.value.slice(0, 60))} style={{ ...inp, fontFamily: DISP, textAlign: 'left' }} placeholder="PSN / EA ID / Xbox …" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="سابقهٔ بازی (سال)"><input inputMode="numeric" value={exp} onChange={e => setExp(e.target.value.replace(/\D/g, '').slice(0, 2))} style={{ ...inp, fontFamily: DISP, textAlign: 'left' }} placeholder="3" /></Field>
          <Field label="نام تیم (اختیاری)"><input value={team} onChange={e => setTeam(e.target.value)} style={inp} placeholder="—" /></Field>
        </div>

        {fe.form && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{fe.form}</div>}

        <Button type="submit" disabled={busy} style={{ marginTop: 4 }}>{busy ? 'در حال ذخیره…' : 'ذخیره و ادامه'}</Button>
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
