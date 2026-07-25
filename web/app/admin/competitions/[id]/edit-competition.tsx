'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'

// Edit / delete a parent competition (رویداد). The location field here is what
// the app — and the AI assistant — reports as the venue, so it must be fixable.
export default function EditCompetition({ id, title, location, date, childCount }: {
  id: string; title: string; location: string; date: string; childCount: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [t, setT] = useState(title)
  const [loc, setLoc] = useState(location)
  const [d, setD] = useState(date)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  async function api(payload: any) {
    const res = await fetch('/api/admin/competitions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error || 'انجام نشد')
  }

  async function save() {
    if (!t.trim()) return alert('عنوان نمی‌تونه خالی باشه')
    setBusy(true)
    try {
      await api({ action: 'edit', id, title: t, location: loc, date: d })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
      router.refresh()
    } catch (e: any) { alert(e.message) } finally { setBusy(false) }
  }

  async function remove() {
    if (!confirm(`رویدادِ «${title}» حذف شه؟ این کار برگشت‌پذیر نیست.`)) return
    setBusy(true)
    try {
      await api({ action: 'delete', id })
      router.push('/admin')
    } catch (e: any) { alert(e.message) } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ all: 'unset', cursor: 'pointer', alignSelf: 'flex-start', fontSize: 12, fontWeight: 700, color: C.accent }}>
        ویرایشِ عنوان، محل و تاریخ ›
      </button>
    )
  }

  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>ویرایشِ رویداد</div>

      <Field label="عنوان">
        <input value={t} onChange={e => setT(e.target.value.slice(0, 90))} style={inp} />
      </Field>
      <Field label="محلِ برگزاری — همینه که تو اپ و دستیار نشون داده می‌شه">
        <input value={loc} onChange={e => setLoc(e.target.value.slice(0, 120))} placeholder="مثلاً: سالن ایسپورت تهران — حضوری" style={inp} />
      </Field>
      <Field label="تاریخ">
        <input value={d} onChange={e => setD(e.target.value.slice(0, 60))} placeholder="مثلاً: ۱۵ مرداد ۱۴۰۵" style={inp} />
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
        <button onClick={save} disabled={busy}
          style={{ all: 'unset', cursor: 'pointer', minHeight: 44, padding: '0 18px', display: 'flex', alignItems: 'center', borderRadius: 11, background: C.accent, color: C.ink, fontWeight: 800, fontSize: 13, opacity: busy ? 0.6 : 1 }}>
          {busy ? '…' : 'ذخیره'}
        </button>
        <button onClick={() => { setOpen(false); setT(title); setLoc(location); setD(date) }}
          style={{ all: 'unset', cursor: 'pointer', minHeight: 44, padding: '0 16px', display: 'flex', alignItems: 'center', borderRadius: 11, border: `1px solid ${C.line2}`, color: C.tbody, fontSize: 13, fontWeight: 700 }}>انصراف</button>
        {saved && <span style={{ fontSize: 11.5, fontWeight: 700, color: C.win }}>✓ ذخیره شد</span>}
        <span style={{ flex: 1 }} />
        <button onClick={remove} disabled={busy || childCount > 0}
          title={childCount > 0 ? 'اول رشته‌ها رو حذف کن' : undefined}
          style={{ all: 'unset', cursor: childCount > 0 ? 'not-allowed' : 'pointer', minHeight: 44, padding: '0 14px', display: 'flex', alignItems: 'center', borderRadius: 11, color: C.live, border: `1px solid ${C.live}44`, fontSize: 12, fontWeight: 700, opacity: childCount > 0 ? 0.4 : 1 }}>
          حذفِ رویداد
        </button>
      </div>
      {childCount > 0 && <div style={{ fontSize: 10.5, color: C.tmut }}>برای حذفِ رویداد، اول باید هر <span className="gl-num">{childCount}</span> رشتهٔ زیرمجموعه حذف بشه.</div>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 11, color: C.tmut, marginBottom: 5 }}>{label}</span>
      {children}
    </label>
  )
}

const inp: React.CSSProperties = {
  background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '11px 13px',
  color: C.thi, fontSize: 13.5, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
}
