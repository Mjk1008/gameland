'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DISC } from '@/lib/mock-data'

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
      if (!res.ok) throw new Error(j.error || 'خطا')
      router.push(`/gamenets/${j.gamenet.id}`)
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} style={{ padding: '12px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/gamenets" style={{ all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 10, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>ثبت گیم‌نت</span>
      </div>

      <Field label="نام گیم‌نت"><input value={name} onChange={e => setName(e.target.value)} required style={inp}/></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="شهر"><input value={city} onChange={e => setCity(e.target.value)} required style={inp}/></Field>
        <Field label="تعداد ایستگاه"><input type="number" min="1" value={stations} onChange={e => setStations(Number(e.target.value))} required style={inp}/></Field>
      </div>
      <Field label="آدرس"><input value={addr} onChange={e => setAddr(e.target.value)} required style={inp}/></Field>
      <Field label="تلفن (اختیاری)"><input dir="ltr" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} style={{ ...inp, fontFamily: 'Rajdhani, sans-serif', textAlign: 'left' }}/></Field>

      <Field label="بازی‌های پشتیبانی‌شده">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(Object.keys(DISC) as (keyof typeof DISC)[]).map(k => {
            const d = DISC[k], on = discs.includes(k)
            return <button key={k} type="button" onClick={() => toggleDisc(k)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '9px 0', border: `1px solid ${on ? d.color : '#1e293b'}`, borderRadius: 10, background: on ? d.color + '22' : '#121821', color: on ? d.color : '#94a3b8', fontWeight: 700, fontSize: 13 }}>{d.name}</button>
          })}
        </div>
      </Field>

      <div style={{ padding: '10px 12px', background: '#0b0f14', border: '1px solid #1e293b', borderRadius: 11, fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
        بعد از ثبت، گیم‌نت شما در دایرکتوری نمایش داده می‌شه. تأییدیه توسط تیم گیم‌لند ظرف ۲۴ ساعت انجام می‌شه.
      </div>

      {err && <div style={{ fontSize: 12, color: '#fb7185', background: '#fb71851a', border: '1px solid #fb718533', padding: 10, borderRadius: 10 }}>{err}</div>}

      <button type="submit" disabled={busy} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', background: '#22d3ee', color: '#0b0f14', fontWeight: 800, fontSize: 15, padding: '13px 0', borderRadius: 12, opacity: busy ? 0.6 : 1 }}>
        {busy ? '...' : 'ثبت گیم‌نت'}
      </button>
    </form>
  )
}

const inp: React.CSSProperties = { background: '#121821', border: '1px solid #1e293b', borderRadius: 11, padding: '11px 13px', color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>{children}</label>
}
