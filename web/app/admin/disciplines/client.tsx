'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Row { id: string; name: string; short: string; color: string; active: boolean }

export default function DiscClient({ initial }: { initial: Row[] }) {
  const router = useRouter()
  const [list, setList] = useState(initial)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Row>({ id: '', name: '', short: '', color: '#22d3ee', active: true })
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/admin/disciplines', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'خطا')
      setList(l => [...l, j.discipline])
      setOpen(false)
      setForm({ id: '', name: '', short: '', color: '#22d3ee', active: true })
      router.refresh()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ padding: '14px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>رشته‌ها</span>
        <button onClick={() => setOpen(o => !o)} style={{ all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#0b0f14', background: '#22d3ee', padding: '7px 12px', borderRadius: 9 }}>{open ? 'بستن' : '+ افزودن'}</button>
      </div>

      {open && (
        <form onSubmit={submit} style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 13, padding: 13, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field><input value={form.id} onChange={e => setForm({ ...form, id: e.target.value.replace(/[^a-z0-9-]/g, '') })} required style={inp} placeholder="id (lol, dota2)" dir="ltr"/></Field>
            <Field><input value={form.short} onChange={e => setForm({ ...form, short: e.target.value.toUpperCase().slice(0, 6) })} required style={{...inp, fontFamily: 'Rajdhani, sans-serif'}} placeholder="کد کوتاه (LOL)" dir="ltr"/></Field>
          </div>
          <Field><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={inp} placeholder="نام فارسی"/></Field>
          <Field><input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} required style={{...inp, fontFamily: 'Rajdhani, sans-serif'}} placeholder="#22d3ee" dir="ltr"/></Field>
          {err && <div style={{ fontSize: 12, color: '#fb7185' }}>{err}</div>}
          <button disabled={busy} type="submit" style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', background: '#22d3ee', color: '#0b0f14', fontWeight: 700, fontSize: 13, padding: '10px 0', borderRadius: 10, opacity: busy ? 0.6 : 1 }}>{busy ? '...' : 'ذخیره'}</button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map(d => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: '#121821', border: '1px solid #1e293b', borderRadius: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: d.color + '22', border: `1px solid ${d.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 11, color: d.color }}>{d.short}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{d.name}</div>
              <div dir="ltr" style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: 'Rajdhani, sans-serif' }}>{d.id} · {d.color}</div>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: d.active ? '#34d399' : '#475569', background: (d.active ? '#34d399' : '#475569') + '22', padding: '3px 7px', borderRadius: 5 }}>{d.active ? 'فعال' : 'غیرفعال'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { background: '#0b0f14', border: '1px solid #1e293b', borderRadius: 9, padding: '9px 11px', color: '#e2e8f0', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }
function Field({ children }: { children: React.ReactNode }) { return <>{children}</> }
