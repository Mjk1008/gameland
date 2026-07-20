'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, DISP, inp, Field, Button } from '@/components/ui'

interface Row { id: string; name: string; short: string; color: string; active: boolean }

export default function DiscClient({ initial }: { initial: Row[] }) {
  const router = useRouter()
  const [list, setList] = useState(initial)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Row>({ id: '', name: '', short: '', color: '#A855F7', active: true })
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
      if (!res.ok) throw new Error(j.error || 'ذخیره نشد، دوباره امتحان کن')
      setList(l => [...l, j.discipline])
      setOpen(false)
      setForm({ id: '', name: '', short: '', color: '#A855F7', active: true })
      router.refresh()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ padding: '14px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: C.thi }}>رشته‌ها</span>
        <button onClick={() => setOpen(o => !o)} style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'center', minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: C.ink, background: C.accent, padding: '0 16px', borderRadius: 11 }}>{open ? 'بستن' : '+ افزودن'}</button>
      </div>

      {open && (
        <form onSubmit={submit} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: 13, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="شناسه"><input value={form.id} onChange={e => setForm({ ...form, id: e.target.value.replace(/[^a-z0-9-]/g, '') })} required style={inp} placeholder="id (lol, dota2)" dir="ltr"/></Field>
            <Field label="کد کوتاه"><input value={form.short} onChange={e => setForm({ ...form, short: e.target.value.toUpperCase().slice(0, 6) })} required style={{...inp, fontFamily: DISP}} placeholder="LOL" dir="ltr"/></Field>
          </div>
          <Field label="نام فارسی"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={inp} placeholder="نام فارسی"/></Field>
          <Field label="رنگ رشته">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: 46, height: 46, minHeight: 46, padding: 4, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, cursor: 'pointer', boxSizing: 'border-box', flexShrink: 0 }} />
              <input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} required style={{...inp, fontFamily: DISP, flex: 1}} placeholder="#A855F7" dir="ltr"/>
            </div>
          </Field>
          {err && <div style={{ fontSize: 12.5, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}
          <Button type="submit" disabled={busy}>{busy ? 'در حال ذخیره…' : 'ذخیره'}</Button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map(d => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: d.color + '22', border: `1px solid ${d.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 12, color: d.color }}>{d.short}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{d.name}</div>
              <div dir="ltr" style={{ fontSize: 11, color: C.tbody, marginTop: 2, fontFamily: DISP }}>{d.id} · {d.color}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: d.active ? C.win : C.tmut, background: (d.active ? C.win : C.tmut) + '22', padding: '4px 8px', borderRadius: 6, flexShrink: 0 }}>{d.active ? 'فعال' : 'غیرفعال'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
