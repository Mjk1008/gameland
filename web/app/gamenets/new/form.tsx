'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DISC } from '@/lib/mock-data'
import { C, DISP, Button, GameBadge, inp, Field, BackHeader } from '@/components/ui'

export default function NewGamenetForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [addr, setAddr] = useState('')
  const [phone,setPhone]= useState('')
  const [stations, setStations] = useState(10)
  const [discs, setDiscs] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  function toggleDisc(d: string) {
    setDiscs(s => s.includes(d) ? s.filter(x => x !== d) : [...s, d])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/gamenets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, city, address: addr, phone, stations, disciplines: discs }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ثبت نشد، دوباره امتحان کن')
      router.push(`/gamenets/${j.gamenet.id}`)
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="animate-fade-up">
      <BackHeader title="ثبت گیم‌نت" href="/gamenets" />

      <form onSubmit={submit} style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="نام گیم‌نت"><input value={name} onChange={e => setName(e.target.value)} required style={inp}/></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="شهر"><input value={city} onChange={e => setCity(e.target.value)} required style={inp}/></Field>
          <Field label="تعداد ایستگاه"><input type="number" min="1" value={stations} onChange={e => setStations(Number(e.target.value))} required style={{ ...inp, fontFamily: DISP, textAlign: 'left' }}/></Field>
        </div>
        <Field label="آدرس"><input value={addr} onChange={e => setAddr(e.target.value)} required style={inp}/></Field>
        <Field label="تلفن (اختیاری)"><input dir="ltr" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} style={{ ...inp, fontFamily: DISP, textAlign: 'left' }}/></Field>

        <Field label="بازی‌های پشتیبانی‌شده">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(Object.keys(DISC) as (keyof typeof DISC)[]).map(k => {
              const d = DISC[k], on = discs.includes(k)
              return (
                <button key={k} type="button" onClick={() => toggleDisc(k)} style={{ ...chip(on), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <GameBadge disc={k} size={20} />{d.name}
                </button>
              )
            })}
          </div>
        </Field>

        <div style={{ padding: '10px 12px', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, fontSize: 11.5, color: C.tmut, lineHeight: 1.7 }}>
          بعد از ثبت، گیم‌نتت توی فهرست نمایش داده می‌شه. تیم گیم‌لند ظرف ۲۴ ساعت تأییدش می‌کنه.
        </div>

        {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}

        <Button type="submit" disabled={busy}>{busy ? 'در حال ثبت…' : 'ثبت گیم‌نت'}</Button>
      </form>
    </div>
  )
}

function chip(on: boolean): React.CSSProperties {
  return { all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 44, boxSizing: 'border-box', padding: '11px 0', border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 700, fontSize: 13 }
}
