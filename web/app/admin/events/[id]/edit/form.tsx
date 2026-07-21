'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DISC } from '@/lib/mock-data'
import { C, Button, GameBadge } from '@/components/ui'
import JalaliRangePicker from '@/components/JalaliRangePicker'

export type EventInit = {
  id: string; title: string; season: string; disc: keyof typeof DISC
  prize: number; teams: number; format: string; date: string
  tier: 'S' | 'A' | 'B' | 'C'; status: 'open' | 'soon' | 'live' | 'done'
}
const statusLabels: Record<string, string> = { open: 'ثبت‌نام باز', soon: 'به‌زودی', live: 'در حال برگزاری', done: 'پایان‌یافته' }

export default function EditEventForm({ init }: { init: EventInit }) {
  const router = useRouter()
  const [title, setTitle] = useState(init.title)
  const [season, setSeason] = useState(init.season)
  const [disc, setDisc] = useState<keyof typeof DISC>(init.disc)
  const [prize, setPrize] = useState(init.prize)
  const [teams, setTeams] = useState(init.teams)
  const [format, setFormat] = useState(init.format)
  const [date, setDate] = useState(init.date)
  const [tier, setTier] = useState<'S' | 'A' | 'B' | 'C'>(init.tier)
  const [status, setStatus] = useState<'open' | 'soon' | 'live' | 'done'>(init.status)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true); setSaved(false)
    try {
      const res = await fetch('/api/admin/events', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: init.id, title, season, disc, tier, prize, teams, format, date, status, statusLabel: statusLabels[status] }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ذخیره نشد، دوباره امتحان کن')
      setSaved(true); router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Link href={`/admin/events/${init.id}`} style={{ all: 'unset', cursor: 'pointer', width: 40, height: 40, borderRadius: 10, background: C.sf1, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.tbody }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </Link>
        <span style={{ fontSize: 18, fontWeight: 800, color: C.thi }}>ویرایش مسابقه</span>
      </div>

      <Field label="عنوان"><input value={title} onChange={e => setTitle(e.target.value)} required style={inp} /></Field>
      <Field label="فصل / دوره"><input value={season} onChange={e => setSeason(e.target.value)} style={inp} /></Field>

      <Field label="رشته">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(Object.keys(DISC) as (keyof typeof DISC)[]).map(k => {
            const on = disc === k
            return (
              <button key={k} type="button" onClick={() => setDisc(k)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 700, fontSize: 13 }}>
                <GameBadge disc={k} size={22} />{DISC[k].name}
              </button>
            )
          })}
        </div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="جایزه (میلیون تومان)"><input type="number" inputMode="numeric" min="0" value={prize} onChange={e => setPrize(Number(e.target.value))} required style={inp} /></Field>
        <Field label="ظرفیت (نفر)"><input type="number" inputMode="numeric" min="2" value={teams} onChange={e => setTeams(Number(e.target.value))} required style={inp} /></Field>
      </div>

      <Field label="تایر مسابقه (برای امتیازبندی)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {([['S', 'ماژور'], ['A', 'گیم‌لند'], ['B', 'آل‌استار'], ['C', 'محلی']] as const).map(([k, label]) => {
            const on = tier === k
            return <button key={k} type="button" onClick={() => setTier(k)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${on ? C.gold : C.line}`, borderRadius: 10, background: on ? C.goldSoft : C.sf2, color: on ? C.gold : C.tbody, fontWeight: 600, fontSize: 12 }}>{label}</button>
          })}
        </div>
      </Field>

      <Field label="فرمت"><input value={format} onChange={e => setFormat(e.target.value)} style={inp} placeholder="حذفی تک / مقدماتی + فینال" /></Field>
      <Field label="تاریخِ برگزاری"><JalaliRangePicker value={date} onChange={d => setDate(d)} /></Field>

      <Field label="وضعیت">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {(['open', 'soon', 'live', 'done'] as const).map(s => {
            const on = status === s
            return <button key={s} type="button" onClick={() => setStatus(s)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 600, fontSize: 12.5 }}>{statusLabels[s]}</button>
          })}
        </div>
      </Field>

      {err && <div style={{ fontSize: 12.5, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}
      {saved && <div style={{ fontSize: 12.5, color: C.win, background: C.winSoft, border: `1px solid ${C.win}55`, padding: 10, borderRadius: 10 }}>ذخیره شد ✓</div>}

      <Button type="submit" disabled={busy} style={{ marginTop: 4 }}>{busy ? 'در حال ذخیره…' : 'ذخیرهٔ تغییرات'}</Button>
    </form>
  )
}

const inp: React.CSSProperties = { background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '12px 13px', color: C.thi, fontSize: 16, outline: 'none', width: '100%', boxSizing: 'border-box' }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12.5, color: C.tmut }}>{label}</span>{children}</label>
}
