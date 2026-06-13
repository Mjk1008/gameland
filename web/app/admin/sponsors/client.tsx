'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Row { id: string; name: string; logoUrl?: string; website?: string }

export default function SponsorsClient({ initial }: { initial: Row[] }) {
  const router = useRouter()
  const [list, setList] = useState(initial)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Row>({ id: '', name: '', website: '' })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/admin/sponsors', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'خطا')
      setList(l => [...l, j.sponsor])
      setOpen(false)
      setForm({ id: '', name: '', website: '' })
      router.refresh()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ padding: '14px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>حامیان مالی</span>
        <button onClick={() => setOpen(o => !o)} style={{ all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#0b0f14', background: '#f5c84b', padding: '7px 12px', borderRadius: 9 }}>{open ? 'بستن' : '+ افزودن'}</button>
      </div>

      {open && (
        <form onSubmit={submit} style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 13, padding: 13, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input value={form.id}      onChange={e => setForm({ ...form, id: e.target.value.replace(/[^a-z0-9-]/g, '') })} required style={inp} placeholder="id (s-cube)" dir="ltr"/>
          <input value={form.name}    onChange={e => setForm({ ...form, name: e.target.value })} required style={inp} placeholder="نام برند"/>
          <input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} style={inp} placeholder="وب‌سایت (اختیاری)" dir="ltr"/>
          {err && <div style={{ fontSize: 12, color: '#fb7185' }}>{err}</div>}
          <button disabled={busy} type="submit" style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', background: '#f5c84b', color: '#0b0f14', fontWeight: 700, fontSize: 13, padding: '10px 0', borderRadius: 10, opacity: busy ? 0.6 : 1 }}>{busy ? '...' : 'ذخیره'}</button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: '#121821', border: '1px solid #1e293b', borderRadius: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f5c84b22', border: '1px solid #f5c84b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14, color: '#f5c84b' }}>{s.name[0]}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{s.name}</div>
              {s.website && <div dir="ltr" style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: 'Rajdhani, sans-serif' }}>{s.website}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
const inp: React.CSSProperties = { background: '#0b0f14', border: '1px solid #1e293b', borderRadius: 9, padding: '9px 11px', color: '#e2e8f0', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }
