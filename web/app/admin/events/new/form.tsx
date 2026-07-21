'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DISC } from '@/lib/mock-data'
import { C, Button, GameBadge, inp, Field } from '@/components/ui'

export default function NewEventForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [season, setSeason] = useState('فصل ۱')
  const [disc, setDisc] = useState<keyof typeof DISC>('fc26')
  const [prize, setPrize] = useState(100)
  const [teams, setTeams] = useState(64)
  const [format, setFormat] = useState('مقدماتی (شهری) + فینال')
  const [finalSize, setFinalSize] = useState(128)
  const [date, setDate] = useState('')
  const [tier, setTier] = useState<'S' | 'A' | 'B' | 'C'>('A')
  const [status, setStatus] = useState<'open' | 'soon' | 'live'>('open')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const statusLabels: Record<string, string> = { open: 'ثبت‌نام باز', soon: 'به‌زودی', live: 'در حال برگزاری' }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/admin/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, season, disc, tier, prize, teams, format, finalSize, date, status, statusLabel: statusLabels[status] }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ساخته نشد، دوباره امتحان کن')
      router.push('/admin/events'); router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Link href="/admin/events" style={{ all: 'unset', cursor: 'pointer', width: 44, height: 44, borderRadius: 11, background: C.sf1, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.tbody, flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </Link>
        <span style={{ fontSize: 18, fontWeight: 800, color: C.thi }}>مسابقهٔ جدید</span>
      </div>

      <Field label="عنوان"><input value={title} onChange={e => setTitle(e.target.value)} required style={inp} /></Field>
      <Field label="فصل / دوره"><input value={season} onChange={e => setSeason(e.target.value)} style={inp} /></Field>

      <Field label="رشته">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(Object.keys(DISC) as (keyof typeof DISC)[]).map(k => {
            const on = disc === k
            return (
              <button key={k} type="button" onClick={() => { setDisc(k); setFinalSize(k === 'fc26' ? 128 : 32) }} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 700, fontSize: 13 }}>
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

      <Field label="فرمت (متن نمایشی)"><input value={format} onChange={e => setFormat(e.target.value)} style={inp} placeholder="مقدماتی (شهری) + فینال" /></Field>

      <Field label="سایزِ براکتِ فینال" hint="FIFA معمولاً ۱۲۸ · بقیهٔ رشته‌ها ۳۲">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[16, 32, 64, 128].map(n => {
            const on = finalSize === n
            return <button key={n} type="button" onClick={() => setFinalSize(n)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-disp)' }}>{n}</button>
          })}
        </div>
      </Field>

      {/* how it runs — the fixed tournament structure */}
      <div style={{ fontSize: 11.5, color: C.tbody, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '11px 13px', lineHeight: 1.9 }}>
        <b style={{ color: C.thi }}>نحوهٔ برگزاری:</b> بعد از بسته‌شدنِ ثبت‌نام، «قرعه‌کشی» رو تو صفحهٔ همین مسابقه می‌زنی → بازیکن‌ها بر اساس <b>شهر</b> به براکت‌های <b>مقدماتی</b> (تا ۶ براکت) تقسیم می‌شن (ممکنه روزها/شهرهای مختلف). برگزیده‌های هر براکت به <b>فینالِ {finalSize} نفره</b> می‌رن. همه‌چی بعداً هم قابلِ ویرایشه.
      </div>

      <Field label="تاریخ (متن)"><input value={date} onChange={e => setDate(e.target.value)} style={inp} placeholder="۱ تا ۷ تیر ۱۴۰۵" /></Field>

      <Field label="وضعیت اولیه">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {(['open', 'soon', 'live'] as const).map(s => {
            const on = status === s
            return <button key={s} type="button" onClick={() => setStatus(s)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 600, fontSize: 12.5 }}>{statusLabels[s]}</button>
          })}
        </div>
      </Field>

      {err && <div style={{ fontSize: 12.5, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}

      <Button type="submit" disabled={busy} style={{ marginTop: 4 }}>{busy ? 'در حال ساخت…' : 'ساخت مسابقه'}</Button>
    </form>
  )
}
