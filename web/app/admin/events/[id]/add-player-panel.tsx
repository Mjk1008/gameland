'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'

export type EmptySlot = {
  groupKey: string; groupLabel: string; bracket: number; slot: number
  matchId: string; side: 1 | 2; restName: string
  filledWith?: string
  state: 'not-started' | 'running' | 'done'
}
export type LeftoverOpt = { uid: string; name: string; tag: string; leftover: number; groupKey?: string }

export default function AddPlayerPanel({ compId: _compId, slots, leftovers }: { compId: string; slots: EmptySlot[]; leftovers: LeftoverOpt[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<EmptySlot | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const live = slots.filter(s => s.state !== 'done')
  if (live.length === 0) return null

  async function add(u: LeftoverOpt) {
    if (!target) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/bracket-add', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: target.matchId, side: target.side, userId: u.uid }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'اضافه نشد')
      setMsg(`@${u.tag}`)
      setTarget(null)
      router.refresh()
    } catch (e: any) { setMsg(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 15 }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', width: '100%', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: C.thi, flex: 1 }}>بازماندگان</span>
        <span style={{ fontSize: 11.5, color: C.tmut }}>{leftovers.length}</span>
        <span style={{ color: C.tmut }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {msg && <div style={{ fontSize: 12, color: C.tbody, background: C.sf2, borderRadius: 8, padding: 8 }}>{msg}</div>}

          {!target ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {live.map(s => (
                <button key={s.matchId + s.side} type="button" onClick={() => { setQ(''); setTarget(s) }} style={rowBtn}>
                  <span style={{ flex: 1, fontSize: 12 }}>
                    {s.groupLabel} · براکت {s.bracket} · {s.restName}
                    {s.filledWith && <span style={{ color: C.tmut }} dir="ltr"> (مقابل {s.filledWith})</span>}
                  </span>
                  {s.state === 'running' && <span style={{ fontSize: 9.5, fontWeight: 800, color: C.gold }}>در جریان</span>}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11.5, color: C.tmut }}>
                {target.groupLabel} · براکت {target.bracket} · {target.restName}
                <button type="button" onClick={() => setTarget(null)} style={{ all: 'unset', cursor: 'pointer', color: C.accent, marginInlineStart: 8, fontWeight: 700 }}>تغییر</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {target.groupKey === 'province:تهران' && (
                  <input
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="جستجو"
                    style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, fontWeight: 600, color: C.thi, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 9, padding: '9px 11px', outline: 'none' }}
                  />
                )}
                {leftovers.filter(u => {
                  const tehran = target.groupKey === 'province:تهران'
                  if (!tehran && u.groupKey && u.groupKey !== target.groupKey) return false
                  if (!tehran || !q.trim()) return true
                  const needle = q.trim()
                  const prov = (u.groupKey || '').split(':')[1] || ''
                  return [u.name, u.tag, '@' + u.tag, prov].some(x => String(x).includes(needle))
                }).map(u => (
                  <button key={u.uid} type="button" disabled={busy} onClick={() => add(u)} style={rowBtn}>
                    <span style={{ flex: 1, fontSize: 12.5, color: C.thi }}>{u.name}</span>
                    {target.groupKey === 'province:تهران' && u.groupKey && <span style={{ fontSize: 11, color: C.tmut }}>{u.groupKey.split(':')[1]}</span>}
                    <span dir="ltr" style={{ fontSize: 11, color: C.tmut }}>@{u.tag}</span>
                    <span className="gl-num" style={{ fontSize: 12, fontWeight: 800, color: C.accent }}>×{u.leftover}</span>
                  </button>
                ))}
                {leftovers.filter(u => {
                  const tehran = target.groupKey === 'province:تهران'
                  if (!tehran && u.groupKey && u.groupKey !== target.groupKey) return false
                  if (!tehran || !q.trim()) return true
                  const needle = q.trim()
                  const prov = (u.groupKey || '').split(':')[1] || ''
                  return [u.name, u.tag, '@' + u.tag, prov].some(x => String(x).includes(needle))
                }).length === 0 && <div style={{ fontSize: 11.5, color: C.tmut }}>کسی نیست</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const rowBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: C.ink, border: `1px solid ${C.line}`, borderRadius: 9, padding: '9px 11px' }
