'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, DISP } from '@/components/ui'

export type EmptySlot = {
  groupKey: string; groupLabel: string; bracket: number; slot: number
  matchId: string; filledWith?: string   // tag already in the other side, if any
  state: 'not-started' | 'running' | 'done'
}
type Found = { id: string; name: string; tag: string; city: string }

export default function AddPlayerPanel({ compId, slots }: { compId: string; slots: EmptySlot[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<EmptySlot | null>(null)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Found[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (slots.length === 0) return null

  async function search(v: string) {
    setQ(v)
    if (v.trim().length < 2) { setResults([]); return }
    try {
      const res = await fetch('/api/admin/promoter-user-search?q=' + encodeURIComponent(v.trim()))
      const j = await res.json()
      setResults(Array.isArray(j.users) ? j.users.slice(0, 10) : [])
    } catch { setResults([]) }
  }

  async function add(u: Found) {
    if (!target) return
    if (target.state !== 'not-started' && !confirm('این براکت شروع شده — مطمئنی می‌خوای بازیکن اضافه کنی؟')) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/bracket-add', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compId, groupKey: target.groupKey, bracket: target.bracket, slot: target.slot, userId: u.id }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'اضافه نشد')
      setMsg(`@${u.tag} اضافه شد`)
      setTarget(null); setQ(''); setResults([])
      router.refresh()
    } catch (e: any) { setMsg(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 15 }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', width: '100%', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: C.thi, flex: 1 }}>افزودن بازیکن به جدول</span>
        <span style={{ fontSize: 11.5, color: C.tmut }}>{slots.length} جای خالی</span>
        <span style={{ color: C.tmut }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {msg && <div style={{ fontSize: 12, color: C.tbody, background: C.sf2, borderRadius: 8, padding: 8 }}>{msg}</div>}

          {!target ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {slots.map(s => (
                <button key={s.matchId + s.slot} type="button" onClick={() => setTarget(s)} style={rowBtn}>
                  <span style={{ flex: 1, fontSize: 12 }}>
                    {s.groupLabel} · براکت {s.bracket} · مسابقهٔ {s.slot + 1}
                    {s.filledWith && <span style={{ color: C.tmut }} dir="ltr"> (مقابل {s.filledWith})</span>}
                  </span>
                  {s.state !== 'not-started' && <span style={{ fontSize: 9.5, fontWeight: 800, color: C.gold }}>{s.state === 'running' ? 'در جریان' : 'تمام‌شده'}</span>}
                  <span style={{ color: C.accent, fontSize: 12, fontWeight: 700 }}>+ افزودن</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11.5, color: C.tmut }}>
                {target.groupLabel} · براکت {target.bracket} · مسابقهٔ {target.slot + 1}
                <button type="button" onClick={() => { setTarget(null); setResults([]); setQ('') }} style={{ all: 'unset', cursor: 'pointer', color: C.accent, marginInlineStart: 8, fontWeight: 700 }}>تغییر</button>
              </div>
              <input autoFocus value={q} onChange={e => search(e.target.value)} placeholder="جستجوی نام، تگ، شماره یا شهر…" style={inp} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {results.map(u => (
                  <button key={u.id} type="button" disabled={busy} onClick={() => add(u)} style={rowBtn}>
                    <span style={{ flex: 1, fontSize: 12.5, color: C.thi }} dir="ltr">@{u.tag}</span>
                    <span style={{ fontSize: 11, color: C.tmut }}>{u.name} · {u.city}</span>
                  </button>
                ))}
                {q.trim().length >= 2 && results.length === 0 && <div style={{ fontSize: 11.5, color: C.tmut }}>کسی پیدا نشد</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const inp: React.CSSProperties = { background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '11px 12px', color: C.thi, fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: DISP }
const rowBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: C.ink, border: `1px solid ${C.line}`, borderRadius: 9, padding: '9px 11px' }
