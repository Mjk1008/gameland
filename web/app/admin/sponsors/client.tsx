'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, DISP, inp, Field, Button } from '@/components/ui'

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
      if (!res.ok) throw new Error(j.error || 'ذخیره نشد، دوباره امتحان کن')
      setList(l => [...l, j.sponsor])
      setOpen(false)
      setForm({ id: '', name: '', website: '' })
      router.refresh()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ padding: '14px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: C.thi }}>حامیان مالی</span>
        <button onClick={() => setOpen(o => !o)} style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'center', minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: C.ink, background: C.gold, padding: '0 16px', borderRadius: 11 }}>{open ? 'بستن' : '+ افزودن'}</button>
      </div>

      {open && (
        <form onSubmit={submit} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: 13, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="شناسه"><input value={form.id}      onChange={e => setForm({ ...form, id: e.target.value.replace(/[^a-z0-9-]/g, '') })} required style={inp} placeholder="id (s-cube)" dir="ltr"/></Field>
          <Field label="نام برند"><input value={form.name}    onChange={e => setForm({ ...form, name: e.target.value })} required style={inp} placeholder="نام برند"/></Field>
          <Field label="وب‌سایت (اختیاری)"><input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} style={inp} placeholder="https://…" dir="ltr"/></Field>
          {err && <div style={{ fontSize: 12.5, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}
          <Button type="submit" kind="prestige" disabled={busy}>{busy ? 'در حال ذخیره…' : 'ذخیره'}</Button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.goldSoft, border: `1px solid ${C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: C.gold }}>{s.name[0]}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{s.name}</div>
              {s.website && <div dir="ltr" style={{ fontSize: 11, color: C.tbody, marginTop: 2, fontFamily: DISP }}>{s.website}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
