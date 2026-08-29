'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { C } from '@/components/ui'
import type { PrelimVenue } from '@/lib/store'
import PrelimVenuePanel from './prelim-venue-panel'

export type BracketInfo = { groupKey: string; groupLabel: string; bracket: number; players: number; done: number; total: number; qualify: number; complete: boolean }
export type BracketSchedule = Record<string, { date?: string; time?: string; note?: string }>
type Props = {
  compId: string; drawn: boolean; regCount: number
  bracketMode: 'prelims' | 'direct'
  groupMode: 'city' | 'province'
  brackets: BracketInfo[]
  bracketSchedule?: BracketSchedule
  qualifierCount: number
  finalExists: boolean; finalSeats: number
  prelimVenues?: Record<string, PrelimVenue>
  gamenetOptions: { id: string; name: string; city: string; province?: string }[]
}

export default function TournamentPanel(p: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'city' | 'province'>(p.groupMode)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function post(url: string, body: any, tag: string) {
    setBusy(tag); setMsg(null)
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      router.refresh()
      return j
    } catch (e: any) { setMsg({ ok: false, text: e.message }); return null }
    finally { setBusy(null) }
  }

  const direct = p.bracketMode === 'direct'

  async function draw() {
    if (p.drawn && !confirm('براکت‌های قبلی پاک می‌شن و از نو چیده می‌شن. مطمئنی؟')) return
    const j = await post('/api/admin/draw', { compId: p.compId, groupMode: mode }, 'draw')
    if (j) setMsg({ ok: true, text: direct ? `جدول چیده شد · ${j.players ?? j.seats} نفر` : `چیده شد · ${j.groups} گروه · ${j.brackets} براکت` })
  }
  async function assemble() {
    const j = await post('/api/admin/assemble-final', { compId: p.compId }, 'assemble')
    if (j) setMsg({ ok: true, text: `فینال چیده شد · ${j.seats} نفر${j.capped ? ' (به ۱۲۸ محدود شد)' : ''}` })
  }
  async function setQualify(b: BracketInfo, count: number) {
    await post('/api/admin/qualify', { compId: p.compId, groupKey: b.groupKey, bracket: b.bracket, count }, `q${b.groupKey}${b.bracket}`)
  }
  async function saveSchedule(groupKey: string, bracket: number, v: { date: string; time: string; note: string }) {
    await post('/api/admin/bracket-schedule', { compId: p.compId, groupKey, bracket, ...v }, `sch${groupKey}${bracket}`)
  }
  const schedOf = (groupKey: string, bracket: number) => p.bracketSchedule?.[`${groupKey}#${bracket}`] ?? {}

  // group brackets by group for display
  const groups = new Map<string, { label: string; brackets: BracketInfo[] }>()
  for (const b of p.brackets) {
    if (!groups.has(b.groupKey)) groups.set(b.groupKey, { label: b.groupLabel, brackets: [] })
    groups.get(b.groupKey)!.brackets.push(b)
  }
  const totalQualify = p.brackets.reduce((s, b) => s + b.qualify, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!direct && (
        <Section title="۰ · محل برگزاری مقدماتی" sub="قبل از قرعه‌کشی اعلام کن هر شهر/استان کجا بازی می‌کنه — فقط برچسب، روی براکت اثری نداره">
          <PrelimVenuePanel compId={p.compId} groupMode={p.groupMode} prelimVenues={p.prelimVenues ?? {}} gamenetOptions={p.gamenetOptions} />
        </Section>
      )}

      {/* 1) draw / group mode */}
      <Section title={direct ? '۱ · قرعه‌کشی' : '۱ · مرحلهٔ مقدماتی'} sub={direct ? 'همهٔ بازیکن‌های تاییدشده در یک جدول واحد چیده می‌شن — سهم‌های هر نفر پخش می‌شن که زود به هم نخورن' : 'بازیکن‌ها بر اساس شهر یا استان گروه‌بندی و براکت‌بندی می‌شن'}>
        {!direct && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {(['city', 'province'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)} style={seg(mode === m)}>{m === 'city' ? 'بر اساس شهر' : 'بر اساس استان'}</button>
            ))}
          </div>
        )}
        <button onClick={draw} disabled={busy != null || p.regCount === 0} style={primaryBtn(p.drawn, busy === 'draw' || p.regCount === 0)}>
          {busy === 'draw' ? 'در حال چیدن…' : p.drawn ? (direct ? 'چیدن مجدد جدول' : 'چیدن مجدد براکت‌های مقدماتی') : (direct ? 'ساخت جدول مسابقه' : 'ساخت براکت‌های مقدماتی')}
        </button>
        {p.regCount === 0 && <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 8 }}>اول باید ثبت‌نام‌ها تایید بشن، بعد جدول رو بساز.</div>}
        {direct && p.drawn && (
          <>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11.5, color: C.tmut, marginBottom: 6 }}>تاریخ و ساعت برگزاری جدول</div>
              <ScheduleEditor init={schedOf('', 0)} disabled={busy != null} onSave={v => saveSchedule('', 0, v)} />
            </div>
            <Link href={`/competitions/${p.compId}/bracket`} style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 12.5, color: C.accent, textDecoration: 'none', fontWeight: 700 }}>
              دیدن جدول و ثبت نتیجه‌ها →
            </Link>
          </>
        )}
      </Section>

      {/* 2) brackets + qualify — prelims only */}
      {!direct && p.drawn && (
        <Section title="۲ · براکت‌ها و کوالیفای" sub="برای هر براکت تعیین کن چند نفرِ برتر به فینال برن">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...groups.entries()].map(([gk, g]) => (
              <div key={gk}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: C.thi, marginBottom: 7 }}>{g.label} <span style={{ color: C.tmut, fontWeight: 400 }}>· {g.brackets.length} براکت</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {g.brackets.map(b => (
                    <div key={b.bracket} style={{ background: C.ink, border: `1px solid ${C.line}`, borderRadius: 10, padding: '9px 11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.tbody, minWidth: 58 }}>براکت {b.bracket}</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: b.complete ? C.win : C.tmut }}>
                          {b.players} نفر · {b.complete ? 'تمام شد ✓' : `${b.done}/${b.total} بازی`}
                        </span>
                        <Stepper value={b.qualify} disabled={busy != null} onChange={n => setQualify(b, n)} />
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <ScheduleEditor init={schedOf(b.groupKey, b.bracket)} disabled={busy != null} onSave={v => saveSchedule(b.groupKey, b.bracket, v)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Link href={`/competitions/${p.compId}/bracket`} style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 12.5, color: C.accent, textDecoration: 'none', fontWeight: 700 }}>
            برای ثبت نتیجهٔ بازی‌ها → جدول براکت
          </Link>
        </Section>
      )}

      {/* 3) assemble final — prelims only (direct bracket IS the final) */}
      {!direct && p.drawn && (
        <Section title="۳ · فینال ۱۲۸ نفره" sub="از میان کوالیفای‌شده‌های همهٔ شهرها/براکت‌ها">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Stat label="کوالیفای‌شده" value={p.qualifierCount} c={C.accent} />
            <Stat label="ظرفیت فینال فعلی" value={totalQualify} c={C.gold} />
            {p.finalExists && <Stat label="در فینال" value={p.finalSeats} c={C.win} />}
          </div>
          {p.qualifierCount !== 128 && (
            <div style={{ fontSize: 11.5, color: C.gold, background: C.goldSoft, border: `1px solid ${C.gold}55`, borderRadius: 9, padding: 9, marginBottom: 10, lineHeight: 1.7 }}>
              الان {p.qualifierCount} نفر کوالیفای شدن (نه دقیقاً ۱۲۸). می‌تونی همینو ببندی یا سیت براکت‌ها رو تنظیم کنی تا به ۱۲۸ برسه.
            </div>
          )}
          <button onClick={assemble} disabled={busy != null || p.qualifierCount < 2} style={primaryBtn(p.finalExists, busy === 'assemble' || p.qualifierCount < 2)}>
            {busy === 'assemble' ? 'در حال چیدن…' : p.finalExists ? 'چیدن مجدد فینال' : 'مونتاژ فینال'}
          </button>
          <div style={{ fontSize: 11, color: C.tmut, marginTop: 8 }}>هر بار که نتایج مقدماتی عوض شد، دوباره مونتاژ کن.</div>
        </Section>
      )}

      {msg && <div style={{ fontSize: 12.5, color: msg.ok ? C.win : C.live, background: msg.ok ? C.winSoft : C.liveSoft, border: `1px solid ${(msg.ok ? C.win : C.live)}55`, padding: 11, borderRadius: 10 }}>{msg.text}</div>}
    </div>
  )
}

function ScheduleEditor({ init, onSave, disabled }: { init: { date?: string; time?: string; note?: string }; onSave: (v: { date: string; time: string; note: string }) => void; disabled?: boolean }) {
  const [date, setDate] = useState(init.date ?? '')
  const [time, setTime] = useState(init.time ?? '')
  const [note, setNote] = useState(init.note ?? '')
  const dirty = date !== (init.date ?? '') || time !== (init.time ?? '') || note !== (init.note ?? '')
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <input value={date} onChange={e => setDate(e.target.value)} placeholder="۱۶ شهریور" style={schInp(96)} />
      <input value={time} onChange={e => setTime(e.target.value)} placeholder="۱۸:۰۰" dir="ltr" style={schInp(64)} />
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="یادداشت (اختیاری)" style={{ ...schInp(0), flex: 1, minWidth: 90 }} />
      {dirty && <button type="button" disabled={disabled} onClick={() => onSave({ date, time, note })} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.accent, background: C.accentSoft, border: `1px solid ${C.accent}55`, borderRadius: 7, padding: '5px 10px' }}>ذخیره</button>}
    </div>
  )
}
const schInp = (w: number): React.CSSProperties => ({ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 8, padding: '7px 9px', color: C.thi, fontSize: 12.5, outline: 'none', width: w || undefined, boxSizing: 'border-box' })

function Stepper({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button type="button" disabled={disabled || value <= 0} onClick={() => onChange(value - 1)} style={stepBtn}>−</button>
      <span className="gl-num" style={{ minWidth: 24, textAlign: 'center', fontWeight: 800, fontSize: 15, color: C.thi }}>{value}</span>
      <button type="button" disabled={disabled} onClick={() => onChange(value + 1)} style={stepBtn}>+</button>
    </div>
  )
}
function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 15 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.thi }}>{title}</div>
      {sub && <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 3, marginBottom: 12, lineHeight: 1.7 }}>{sub}</div>}
      {children}
    </div>
  )
}
function Stat({ label, value, c }: { label: string; value: number; c: string }) {
  return (
    <div style={{ flex: 1, background: C.ink, border: `1px solid ${C.line}`, borderRadius: 10, padding: '9px 0', textAlign: 'center' }}>
      <div className="gl-num" style={{ fontSize: 20, fontWeight: 800, color: c }}>{value}</div>
      <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>{label}</div>
    </div>
  )
}
const seg = (on: boolean): React.CSSProperties => ({ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, fontSize: 13, fontWeight: 700, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}` })
const stepBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, fontSize: 18, fontWeight: 700, background: C.sf2, color: C.thi, border: `1px solid ${C.line2}` }
function primaryBtn(secondary: boolean, disabled: boolean): React.CSSProperties {
  return { all: 'unset', cursor: disabled ? 'not-allowed' : 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center', minHeight: 48, lineHeight: '48px', background: secondary ? 'transparent' : C.accent, border: secondary ? `1px solid ${C.accent}` : 'none', color: secondary ? C.accent : '#0B0A08', fontWeight: 800, fontSize: 14, borderRadius: 11, opacity: disabled ? 0.5 : 1 }
}
