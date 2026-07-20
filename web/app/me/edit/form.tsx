'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DISC } from '@/lib/mock-data'
import { C, DISP, Button, GameBadge, inp, Field, BackHeader } from '@/components/ui'

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
    <div className="animate-fade-up">
      <BackHeader title="ویرایش پروفایل" href="/me" />

      <form onSubmit={submit} style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="نام و نام خانوادگی"><input value={name} onChange={e => setName(e.target.value)} required style={inp}/></Field>
        <Field label="تگ بازی (انگلیسی و یکتا)"><input dir="ltr" value={tag} onChange={e => setTag(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} required style={{ ...inp, fontFamily: DISP, textAlign: 'left' }}/></Field>
        <Field label="شهر"><input value={city} onChange={e => setCity(e.target.value)} required style={inp}/></Field>
        <Field label="رشتهٔ اصلی">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(Object.keys(DISC) as (keyof typeof DISC)[]).map(k => {
              const d = DISC[k], on = disc === k
              return (
                <button key={k} type="button" onClick={() => setDisc(k)} style={{ ...chip(on), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <GameBadge disc={k} size={20} />{d.name}
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="کد ملی (اختیاری — برای احراز هویت در مسابقه‌های بزرگ)">
          <input dir="ltr" value={nid} onChange={e => setNid(e.target.value.replace(/\D/g, '').slice(0, 10))} style={{ ...inp, fontFamily: DISP, textAlign: 'left' }} placeholder="0010000000"/>
        </Field>

        {err && <Alert color={C.live}>{err}</Alert>}
        {ok && <Alert color={C.win}>پروفایلت ذخیره شد ✓</Alert>}

        <Button type="submit" disabled={busy} style={{ marginTop: 4 }}>{busy ? 'در حال ذخیره…' : 'ذخیره'}</Button>
      </form>
    </div>
  )
}

function chip(on: boolean): React.CSSProperties {
  return { all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 44, boxSizing: 'border-box', padding: '11px 0', border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 11, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 700, fontSize: 13 }
}
function Alert({ color, children }: { color: string; children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color, background: color + '1a', border: `1px solid ${color}33`, padding: 10, borderRadius: 10 }}>{children}</div>
}
