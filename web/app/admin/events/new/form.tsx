'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DISC } from '@/lib/mock-data'

export default function NewEventForm() {
  const router = useRouter()
  const [title,  setTitle]  = useState('')
  const [season, setSeason] = useState('فصل ۱')
  const [disc,   setDisc]   = useState<keyof typeof DISC>('valorant')
  const [prize,  setPrize]  = useState(100)
  const [teams,  setTeams]  = useState(64)
  const [format, setFormat] = useState('حذفی دوگانه')
  const [date,   setDate]   = useState('')
  const [status, setStatus] = useState<'open' | 'soon' | 'live'>('open')
  const [busy,   setBusy]   = useState(false)
  const [err,    setErr]    = useState<string | null>(null)

  const statusLabels: Record<string, string> = {
    open: 'ثبت‌نام باز', soon: 'به‌زودی', live: 'در حال برگزاری',
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, season, disc, prize, teams, format, date, status, statusLabel: statusLabels[status] }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'خطا')
      router.push('/admin/events')
      router.refresh()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Link href="/admin/events" style={{ all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 10, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>ایونت جدید</span>
      </div>

      <Field label="عنوان"><input value={title} onChange={e => setTitle(e.target.value)} required style={inp}/></Field>
      <Field label="فصل / دوره"><input value={season} onChange={e => setSeason(e.target.value)} style={inp}/></Field>

      <Field label="رشته">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(Object.keys(DISC) as (keyof typeof DISC)[]).map(k => {
            const d = DISC[k], on = disc === k
            return (
              <button key={k} type="button" onClick={() => setDisc(k)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '10px 0', border: `1px solid ${on ? d.color : '#1e293b'}`, borderRadius: 10, background: on ? d.color + '22' : '#121821', color: on ? d.color : '#94a3b8', fontWeight: 700, fontSize: 13 }}>{d.name}</button>
            )
          })}
        </div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="جایزه (میلیون تومان)"><input type="number" min="0" value={prize} onChange={e => setPrize(Number(e.target.value))} required style={inp}/></Field>
        <Field label="تعداد تیم"><input type="number" min="2" value={teams} onChange={e => setTeams(Number(e.target.value))} required style={inp}/></Field>
      </div>

      <Field label="فرمت"><input value={format} onChange={e => setFormat(e.target.value)} style={inp} placeholder="حذفی دوگانه / سوئیسی + حذفی / امتیازی"/></Field>
      <Field label="تاریخ (متن)"><input value={date} onChange={e => setDate(e.target.value)} style={inp} placeholder="۱۲ – ۲۸ تیر ۱۴۰۵"/></Field>

      <Field label="وضعیت اولیه">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {(['open', 'soon', 'live'] as const).map(s => {
            const on = status === s
            return <button key={s} type="button" onClick={() => setStatus(s)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '9px 0', border: `1px solid ${on ? '#22d3ee' : '#1e293b'}`, borderRadius: 10, background: on ? '#22d3ee22' : '#121821', color: on ? '#22d3ee' : '#94a3b8', fontWeight: 600, fontSize: 12 }}>{statusLabels[s]}</button>
          })}
        </div>
      </Field>

      {err && <div style={{ fontSize: 12, color: '#fb7185', background: '#fb71851a', border: '1px solid #fb718533', padding: 10, borderRadius: 10 }}>{err}</div>}

      <button type="submit" disabled={busy} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', background: '#22d3ee', color: '#0b0f14', fontWeight: 800, fontSize: 15, padding: '13px 0', borderRadius: 12, opacity: busy ? 0.6 : 1, marginTop: 4 }}>
        {busy ? '...' : 'ایجاد ایونت'}
      </button>
    </form>
  )
}

const inp: React.CSSProperties = { background: '#121821', border: '1px solid #1e293b', borderRadius: 11, padding: '11px 13px', color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>{children}</label>
}
