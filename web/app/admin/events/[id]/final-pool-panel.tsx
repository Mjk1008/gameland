'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'
import { Section, Stat, Stepper, primaryBtn, BRACKET_SIZES } from './tournament-panel'

export type FinalPoolMember = { userId: string; name: string; tag: string; sahm: number }
export type TeamOption = { id: string; name: string; subtitle: string }
type Props = {
  compId: string
  pool: FinalPoolMember[]
  entryCap: number
  finalSize: number
  finalExists: boolean
  finalSeats: number
  published: boolean
  qualifierEstimate: number
  // Team (2v2) events: "افزودن" picks from this event's own teams instead of
  // searching the whole user database. سهم / cap / random seeding are the
  // same controls as solo — a team is one account.
  isTeamEvent?: boolean
  teamOptions?: TeamOption[]
  // true ⇒ چیدن throws every seat into one flat random shuffle (randomSeats)
  // instead of spreading one account's (or team's) own multiple final entries
  // apart (spreadSeats, the default).
  randomSeeding?: boolean
}

type SearchUser = { id: string; name: string; tag: string; city?: string }

// «استخر فینال» — replaces the old one-click «مونتاژ فینال». Nothing lands
// here on its own: the admin sends candidates up from each prelim bracket
// (tournament-panel.tsx, "→ استخر") or adds any account directly, tunes هر
// نفر's سهم and the pool's per-player cap, picks the final's capacity, then
// چیدن (draft, unpublished) → انتشار.
export default function FinalPoolPanel(p: Props) {
  const router = useRouter()
  const isTeam = !!p.isTeamEvent
  const unit = isTeam ? 'تیم' : 'نفر'
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [cap, setCap] = useState(String(p.entryCap))
  const [size, setSize] = useState(p.finalSize)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => setCap(String(p.entryCap)), [p.entryCap])
  useEffect(() => setSize(p.finalSize), [p.finalSize])

  useEffect(() => {
    if (p.isTeamEvent) return   // team picker filters p.teamOptions client-side, no search call
    if (debounce.current) clearTimeout(debounce.current)
    if (q.trim().length < 2) { setResults([]); return }
    setSearching(true)
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/user-search?q=${encodeURIComponent(q.trim())}`)
        const j = await res.json()
        setResults(j.users ?? [])
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [q, p.isTeamEvent])

  async function post(body: any, tag: string) {
    setBusy(tag); setMsg(null)
    try {
      const res = await fetch('/api/admin/final-pool', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compId: p.compId, ...body }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      router.refresh()
      return j
    } catch (e: any) { setMsg({ ok: false, text: e.message }); return null }
    finally { setBusy(null) }
  }

  async function addUser(u: SearchUser) {
    const j = await post({ action: 'add', userId: u.id, sahm: 1 }, `add${u.id}`)
    if (j) { setQ(''); setResults([]) }
  }
  async function addTeam(teamId: string) {
    await post({ action: 'add', userId: teamId, sahm: 1 }, `add${teamId}`)
  }
  async function setSahm(userId: string, sahm: number) {
    await post({ action: 'sahm', userId, sahm }, `sahm${userId}`)
  }
  async function remove(userId: string) {
    await post({ action: 'remove', userId }, `rm${userId}`)
  }
  async function saveEntryCap() {
    const n = Math.floor(Number(cap))
    if (!Number.isFinite(n) || n < 1) { setMsg({ ok: false, text: 'سقف نامعتبره' }); return }
    const j = await post({ action: 'cap', cap: n }, 'cap')
    if (j) setMsg({ ok: true, text: `سقف سهم هر ${unit} شد ${n}` })
  }
  async function toggleRandomSeeding(enabled: boolean) {
    await post({ action: 'randomSeeding', enabled }, 'randomSeeding')
  }
  async function saveFinalSize(n: number) {
    setSize(n)
    setBusy('size'); setMsg(null)
    try {
      const res = await fetch('/api/admin/events', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.compId, finalSize: n }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      router.refresh()
    } catch (e: any) { setMsg({ ok: false, text: e.message }) }
    finally { setBusy(null) }
  }
  async function assemble() {
    if (p.pool.length === 0) { setMsg({ ok: false, text: 'استخر خالیه' }); return }
    if (p.finalExists && !confirm('فینال از قبل چیده شده؛ نتیجه‌های ثبت‌شده پاک می‌شن و از نو چیده می‌شه. مطمئنی؟')) return
    setBusy('assemble'); setMsg(null)
    try {
      const res = await fetch('/api/admin/assemble-final', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compId: p.compId }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      router.refresh()
      setMsg({ ok: true, text: `فینال چیده شد (پیش‌نویس) · ${j.seats} ${unit}${j.capped ? ` (به ${size} محدود شد)` : ''} — قبل از انتشار مرور کن` })
    } catch (e: any) { setMsg({ ok: false, text: e.message }) }
    finally { setBusy(null) }
  }
  async function publish() {
    setBusy('publish'); setMsg(null)
    try {
      const res = await fetch('/api/admin/publish-draw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compId: p.compId, groupKey: '' }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      router.refresh()
      setMsg({ ok: true, text: `منتشر شد · به ${j.notified} نفر اطلاع داده شد` })
    } catch (e: any) { setMsg({ ok: false, text: e.message }) }
    finally { setBusy(null) }
  }

  const totalSahm = p.pool.reduce((s, m) => s + m.sahm, 0)
  const teamCandidates = (p.teamOptions ?? []).filter(t =>
    !p.pool.some(m => m.userId === t.id) && (q.trim() === '' || t.name.includes(q.trim()) || t.subtitle.includes(q.trim())),
  )

  return (
    <Section title="۳ · استخر فینال">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Stat label={`${unit === 'تیم' ? 'تیم‌های' : 'نفرات'} استخر`} value={p.pool.length} c={C.accent} />
        <Stat label="سهم کل استخر" value={totalSahm} c={C.gold} />
        {p.finalExists && <Stat label="در فینال" value={p.finalSeats} c={C.win} />}
      </div>
      <div style={{ fontSize: 11, color: C.tmut, marginBottom: 12, lineHeight: 1.7 }}>
        تخمین خودکار (اگه براکت‌های ناتموم تا آخر بازی بشن): {p.qualifierEstimate} {unit} — این عدد خودش وارد استخر نمی‌شه، فقط برای مرجعه.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <Field label={`سقف سهم هر ${unit}`}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={cap} onChange={e => setCap(e.target.value)} inputMode="numeric" dir="ltr" style={inp} />
            <button type="button" disabled={busy != null || cap === String(p.entryCap)} onClick={saveEntryCap} style={smallBtn}>ذخیره</button>
          </div>
        </Field>
        <Field label="ظرفیت براکت فینال">
          <select value={size} disabled={busy != null} onChange={e => saveFinalSize(Number(e.target.value))} style={sel}>
            {BRACKET_SIZES.map(s => <option key={s} value={s}>{s} نفره</option>)}
          </select>
        </Field>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12.5, color: C.thi, cursor: 'pointer' }}>
        <input type="checkbox" checked={!!p.randomSeeding} disabled={busy != null} onChange={e => toggleRandomSeeding(e.target.checked)} />
        سیدینگ کاملاً رندوم (سهم‌های یک {unit} از هم جدا نگه داشته نمی‌شن)
      </label>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11.5, color: C.tmut, marginBottom: 6 }}>{isTeam ? 'افزودن تیم (از تیم‌های همین رشته)' : 'افزودن بازیکن (از کل دیتابیس)'}</div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={isTeam ? 'اسم تیم…' : 'نام، @تگ یا شماره…'} style={inp} />
        {!isTeam && searching && <div style={{ fontSize: 11, color: C.tmut, marginTop: 6 }}>در حال جستجو…</div>}
        {isTeam && q.trim() !== '' && teamCandidates.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 9, padding: 6, maxHeight: 220, overflowY: 'auto' }}>
            {teamCandidates.map(t => (
              <button key={t.id} type="button" disabled={busy != null} onClick={() => addTeam(t.id)}
                style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 7, fontSize: 12.5, color: C.thi }}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}{t.subtitle ? ` · ${t.subtitle}` : ''}</span>
                <span style={{ color: C.accent, fontWeight: 700 }}>+ افزودن</span>
              </button>
            ))}
          </div>
        )}
        {!isTeam && results.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 9, padding: 6 }}>
            {results.map(u => (
              <button key={u.id} type="button" disabled={busy != null || p.pool.some(m => m.userId === u.id)} onClick={() => addUser(u)}
                style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 7, fontSize: 12.5, color: C.thi, opacity: p.pool.some(m => m.userId === u.id) ? 0.5 : 1 }}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name} · @{u.tag}{u.city ? ` · ${u.city}` : ''}</span>
                <span style={{ color: C.accent, fontWeight: 700 }}>{p.pool.some(m => m.userId === u.id) ? 'توی استخره' : '+ افزودن'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {p.pool.length === 0 && <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: '10px 0' }}>استخر خالیه — از براکت‌ها بفرست یا دستی اضافه کن</div>}
        {p.pool.map(m => (
          <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.ink, border: `1px solid ${C.line}`, borderRadius: 10, padding: '8px 10px' }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}{!isTeam && m.tag ? ` · @${m.tag}` : ''}</span>
            <Stepper value={m.sahm} disabled={busy != null} max={p.entryCap} onChange={n => setSahm(m.userId, n)} />
            <button type="button" disabled={busy != null} onClick={() => remove(m.userId)} style={rmBtn}>✕</button>
          </div>
        ))}
      </div>

      <button onClick={assemble} disabled={busy != null || p.pool.length === 0} style={primaryBtn(p.finalExists, busy === 'assemble' || p.pool.length === 0)}>
        {busy === 'assemble' ? 'در حال چیدن…' : p.finalExists ? 'چیدن مجدد از استخر' : 'چیدن فینال از استخر'}
      </button>
      {p.finalExists && (
        p.published
          ? <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: C.win, fontWeight: 700 }}>منتشر شده ✓</div>
          : <button onClick={publish} disabled={busy != null} style={{ ...primaryBtn(false, !!busy), marginTop: 10 }}>{busy === 'publish' ? '…' : 'انتشار'}</button>
      )}

      {msg && <div style={{ marginTop: 10, fontSize: 12.5, color: msg.ok ? C.win : C.live, background: msg.ok ? C.winSoft : C.liveSoft, border: `1px solid ${(msg.ok ? C.win : C.live)}55`, padding: 11, borderRadius: 10 }}>{msg.text}</div>}
    </Section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: C.tmut, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}
const inp: React.CSSProperties = { width: '100%', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 9, padding: '9px 10px', color: C.thi, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const sel: React.CSSProperties = { width: '100%', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 9, padding: '9px 10px', color: C.thi, fontSize: 13, outline: 'none' }
const smallBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: C.accent, background: C.accentSoft, border: `1px solid ${C.accent}55`, borderRadius: 8, padding: '0 12px', flexShrink: 0 }
const rmBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontSize: 13, fontWeight: 700, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}44`, flexShrink: 0 }
