'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DISC } from '@/lib/mock-data'
import { C, Button, GameBadge, inp, Field } from '@/components/ui'

type Disc = keyof typeof DISC

// Add one discipline (a child Event) to a parent competition.
export default function AddDisciplineForm({ compId, compTitle, compDate, existing }: {
  compId: string; compTitle: string; compDate: string; existing: string[]
}) {
  const router = useRouter()
  const firstFree = ((Object.keys(DISC) as Disc[]).find(k => !existing.includes(k)) ?? 'fc26') as Disc
  const [open, setOpen] = useState(false)
  const [disc, setDisc] = useState<Disc>(firstFree)
  const [prize, setPrize] = useState(0)
  const [tier, setTier] = useState<'S' | 'A' | 'B' | 'C'>('A')
  const [finalSize, setFinalSize] = useState(128)
  const [teams, setTeams] = useState(64)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function pickDisc(k: Disc) { setDisc(k); setFinalSize(k === 'fc26' ? 128 : 32) }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${compTitle} — ${DISC[disc].name}`, season: compTitle,
          disc, tier, prize, teams, finalSize,
          format: 'مقدماتی (شهری) + فینال', date: compDate,
          status: 'open', statusLabel: 'ثبت‌نام باز',
          competitionId: compId,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'اضافه نشد')
      setOpen(false); setPrize(0)
      router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', textAlign: 'center', minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, fontSize: 13.5, fontWeight: 700, color: C.accent, background: C.accentSoft, border: `1px dashed ${C.accent}66` }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        افزودن رشته
      </button>
    )
  }

  return (
    <form onSubmit={submit} style={{ background: C.sf1, border: `1px solid ${C.accent}55`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 13 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.thi }}>رشتهٔ جدید</div>

      <Field label="رشته">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(Object.keys(DISC) as Disc[]).map(k => {
            const on = disc === k
            const used = existing.includes(k)
            return (
              <button key={k} type="button" disabled={used} onClick={() => pickDisc(k)} style={{ all: 'unset', cursor: used ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 700, fontSize: 12.5, opacity: used ? 0.4 : 1 }}>
                <GameBadge disc={k} size={20} />{DISC[k].name}{used ? ' ✓' : ''}
              </button>
            )
          })}
        </div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="جایزه (میلیون تومان)"><input type="number" inputMode="numeric" min="0" value={prize} onChange={e => setPrize(Number(e.target.value))} style={inp} /></Field>
        <Field label="ظرفیت (نفر)"><input type="number" inputMode="numeric" min="2" value={teams} onChange={e => setTeams(Number(e.target.value))} style={inp} /></Field>
      </div>

      <Field label="تایر (امتیازبندی)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {([['S', 'ماژور'], ['A', 'گیم‌لند'], ['B', 'آل‌استار'], ['C', 'محلی']] as const).map(([k, label]) => {
            const on = tier === k
            return <button key={k} type="button" onClick={() => setTier(k)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${on ? C.gold : C.line}`, borderRadius: 10, background: on ? C.goldSoft : C.sf2, color: on ? C.gold : C.tbody, fontWeight: 600, fontSize: 12 }}>{label}</button>
          })}
        </div>
      </Field>

      <Field label="سایزِ فینال" hint="FIFA معمولاً ۱۲۸ · بقیه ۳۲">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[16, 32, 64, 128].map(n => {
            const on = finalSize === n
            return <button key={n} type="button" onClick={() => setFinalSize(n)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-disp)' }}>{n}</button>
          })}
        </div>
      </Field>

      {err && <div style={{ fontSize: 12.5, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => setOpen(false)} style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 11, fontSize: 13, fontWeight: 700, color: C.tbody, border: `1px solid ${C.line2}` }}>انصراف</button>
        <div style={{ flex: 2 }}><Button type="submit" disabled={busy}>{busy ? 'در حال افزودن…' : 'افزودن رشته'}</Button></div>
      </div>
    </form>
  )
}
