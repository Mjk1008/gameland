'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { C } from '@/components/ui'

export default function NewCompetitionPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (!title.trim()) { setErr('عنوان مسابقه رو بنویس'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/competitions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, location, date }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ساخته نشد')
      router.push(`/admin/competitions/${j.competition.id}`); router.refresh()
    } catch (e: any) { setErr(e.message); setBusy(false) }
  }

  return (
    <div style={{ padding: '16px 16px 28px' }}>
      <Link href="/admin" style={{ fontSize: 12, color: C.tmut, textDecoration: 'none' }}>‹ داشبورد</Link>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.thi, margin: '10px 0 4px' }}>ساخت مسابقه</div>
      <div style={{ fontSize: 12.5, color: C.tmut, marginBottom: 18, lineHeight: 1.8 }}>اول خودِ مسابقه (رویداد) رو بساز؛ بعد داخلش رشته‌ها (فیفا، PES…) رو اضافه می‌کنی.</div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <Field label="عنوان مسابقه"><input value={title} onChange={e => setTitle(e.target.value)} style={inp} placeholder="جام تابستانهٔ گیم‌لند" /></Field>
        <Field label="محل برگزاری"><input value={location} onChange={e => setLocation(e.target.value)} style={inp} placeholder="ایران‌مال، تهران" /></Field>
        <Field label="تاریخ (متن)"><input value={date} onChange={e => setDate(e.target.value)} style={inp} placeholder="۱۵ تا ۲۰ مرداد ۱۴۰۵" /></Field>
        {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}
        <button type="submit" disabled={busy} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 48, lineHeight: '48px', background: C.accent, color: '#0B0A08', fontWeight: 800, fontSize: 14, borderRadius: 11, opacity: busy ? 0.5 : 1 }}>
          {busy ? 'در حال ساخت…' : 'ساخت مسابقه و افزودن رشته‌ها'}
        </button>
      </form>
    </div>
  )
}

const inp: React.CSSProperties = { background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '12px 14px', color: C.thi, fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box' }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, color: C.tmut }}>{label}</span>{children}</label>
}
