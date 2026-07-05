'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DISC } from '@/lib/mock-data'
import { C, Button, DISC_DOT } from '@/components/ui'

export default function NewEventForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [season, setSeason] = useState('فصل ۱')
  const [disc, setDisc] = useState<keyof typeof DISC>('fc26')
  const [prize, setPrize] = useState(100)
  const [teams, setTeams] = useState(64)
  const [format, setFormat] = useState('حذفی تک')
  const [date, setDate] = useState('')
  const [tier, setTier] = useState<'S' | 'A' | 'B' | 'C'>('A')
  const [status, setStatus] = useState<'open' | 'soon' | 'live'>('open')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const statusLabels: Record<string, string> = { open: 'ثبت‌نام باز', soon: 'به‌زودی', live: 'در حال برگزاری' }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/admin/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, season, disc, tier, prize, teams, format, date, status, statusLabel: statusLabels[status] }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'خطا')
      router.push('/admin/events'); router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Link href="/admin/events" style={{ all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 10, background: C.sf1, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.tbody }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </Link>
        <span style={{ fontSize: 18, fontWeight: 800, color: C.thi }}>ایونت جدید</span>
      </div>

      <Field label="عنوان"><input value={title} onChange={e => setTitle(e.target.value)} required style={inp} /></Field>
      <Field label="فصل / دوره"><input value={season} onChange={e => setSeason(e.target.value)} style={inp} /></Field>

      <Field label="رشته">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(Object.keys(DISC) as (keyof typeof DISC)[]).map(k => {
            const on = disc === k
            return (
              <button key={k} type="button" onClick={() => setDisc(k)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 0', border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 700, fontSize: 13 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: DISC_DOT[k] }} />{DISC[k].name}
              </button>
            )
          })}
        </div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="جایزه (میلیون تومان)"><input type="number" min="0" value={prize} onChange={e => setPrize(Number(e.target.value))} required style={inp} /></Field>
        <Field label="ظرفیت (نفر)"><input type="number" min="2" value={teams} onChange={e => setTeams(Number(e.target.value))} required style={inp} /></Field>
      </div>

      <Field label="تایر مسابقه (برای امتیازبندی)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {([['S', 'ماژور'], ['A', 'گیم‌لند'], ['B', 'آل‌استار'], ['C', 'محلی']] as const).map(([k, label]) => {
            const on = tier === k
            return <button key={k} type="button" onClick={() => setTier(k)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '9px 0', border: `1px solid ${on ? C.gold : C.line}`, borderRadius: 10, background: on ? C.goldSoft : C.sf2, color: on ? C.gold : C.tbody, fontWeight: 600, fontSize: 12 }}>{label}</button>
          })}
        </div>
      </Field>

      <Field label="فرمت"><input value={format} onChange={e => setFormat(e.target.value)} style={inp} placeholder="حذفی تک / مقدماتی + فینال" /></Field>
      <Field label="تاریخ (متن)"><input value={date} onChange={e => setDate(e.target.value)} style={inp} placeholder="۱ تا ۷ تیر ۱۴۰۵" /></Field>

      <Field label="وضعیت اولیه">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {(['open', 'soon', 'live'] as const).map(s => {
            const on = status === s
            return <button key={s} type="button" onClick={() => setStatus(s)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '9px 0', border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 600, fontSize: 12 }}>{statusLabels[s]}</button>
          })}
        </div>
      </Field>

      {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}

      <Button type="submit" disabled={busy} style={{ marginTop: 4 }}>{busy ? '...' : 'ایجاد ایونت'}</Button>
    </form>
  )
}

const inp: React.CSSProperties = { background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 13px', color: C.thi, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, color: C.tmut }}>{label}</span>{children}</label>
}
