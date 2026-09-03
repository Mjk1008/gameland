'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { C } from '@/components/ui'
import { MatchOps, PlayerPeek, ANNOUNCE } from './match-ops'

export type RunPlayer = { uid: string; name: string; attempts: number; entry?: number } | null
export type RunMatch = {
  id: string; groupKey: string; groupLabel: string; bracket: number; round: number; slot: number
  roundLabel: string
  p1: RunPlayer; p2: RunPlayer; winnerUid?: string
  status: 'pending' | 'ready' | 'done'
  cancelled?: boolean
  selfMatch: boolean
}

type Props = { matches: RunMatch[] }

export default function RunPanel({ matches }: Props) {
  const router = useRouter()
  const [showDone, setShowDone] = useState(false)
  const [open, setOpen] = useState<RunMatch | null>(null)
  const [peek, setPeek] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const groups = useMemo(() => {
    const byG = new Map<string, RunMatch[]>()
    for (const m of matches) {
      if (!byG.has(m.groupKey)) byG.set(m.groupKey, [])
      byG.get(m.groupKey)!.push(m)
    }
    return [...byG.entries()].map(([gk, ms]) => ({
      gk, label: ms[0]?.groupLabel || 'جدول',
      ms: ms.slice().sort((a, b) => a.bracket - b.bracket || a.round - b.round || a.slot - b.slot),
    }))
  }, [matches])

  async function post(body: object) {
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/admin/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ثبت نشد')
      setOpen(null)
      router.refresh()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }
  async function announce(kind: typeof ANNOUNCE[number]['id'], who: 'p1' | 'p2' | 'both') {
    if (!open) return
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/admin/match-announce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId: open.id, kind, who }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ارسال نشد')
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  const pending = matches.filter(m => m.status === 'ready').length
  const done = matches.filter(m => m.status === 'done').length
  const live = open && matches.find(x => x.id === open.id) || open

  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 15, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: C.thi }}>ثبت نتیجهٔ بازی‌ها</div>
        <button type="button" onClick={() => setShowDone(s => !s)} style={chip(showDone)}>نمایش ثبت‌شده‌ها</button>
      </div>
      <div style={{ fontSize: 11.5, color: C.tmut }}>{pending} آماده · {done} ثبت‌شده</div>

      {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, borderRadius: 9, padding: 9 }}>{err}</div>}

      {groups.map(g => {
        const visible = g.ms.filter(m => m.status === 'ready' || m.cancelled || (showDone && m.status === 'done'))
        if (visible.length === 0) return null
        return (
          <div key={g.gk}>
            {groups.length > 1 && <div style={{ fontSize: 12, fontWeight: 800, color: C.tbody, margin: '4px 0 6px' }}>{g.label}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {visible.map(m => (
                <button key={m.id} type="button" onClick={() => { setOpen(m); setErr(null) }} style={rowBtn}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: C.tmut }}>{m.roundLabel}{m.bracket ? ` · براکت ${m.bracket}` : ''} · مسابقهٔ {m.slot + 1}</span>
                    {m.cancelled && <span style={miniBadge}>لغو شده</span>}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.thi, textAlign: 'right' }}>
                    <span style={{ color: !m.cancelled && m.winnerUid === m.p1?.uid ? C.gold : C.thi }}>{m.p1?.name ?? '—'}</span>
                    <span style={{ color: C.tmut, fontWeight: 500 }}> — </span>
                    <span style={{ color: !m.cancelled && m.winnerUid === m.p2?.uid ? C.gold : C.thi }}>{m.p2?.name ?? '—'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      })}
      {pending === 0 && !showDone && matches.every(m => !m.cancelled) && (
        <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: '10px 0' }}>بازیِ آماده‌ای برای ثبت نیست.</div>
      )}

      {live && typeof document !== 'undefined' && createPortal(
        <div onClick={() => !busy && setOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(8,6,4,.62)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: C.sf1, borderRadius: '18px 18px 0 0', padding: '12px 16px calc(20px + env(safe-area-inset-bottom))' }}>
            <div style={{ width: 38, height: 4, borderRadius: 3, background: C.line2, margin: '0 auto 12px' }} />
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.tmut, textAlign: 'center', marginBottom: 12 }}>
              {live.roundLabel}{live.bracket ? ` · براکت ${live.bracket}` : ''}
            </div>
            <NameRow p={live.p1} win={!live.cancelled && live.winnerUid === live.p1?.uid} onPeek={() => live.p1 && setPeek(live.p1.uid)} />
            <NameRow p={live.p2} win={!live.cancelled && live.winnerUid === live.p2?.uid} onPeek={() => live.p2 && setPeek(live.p2.uid)} />
            <MatchOps
              p1={live.p1} p2={live.p2} cancelled={live.cancelled} status={live.status} busy={busy}
              onWin={uid => post({ matchId: live.id, winnerUserId: uid, correct: live.status === 'done' })}
              onCancelMatch={() => post({ matchId: live.id, cancel: true })}
              onAnnounce={announce}
              winnerUid={live.winnerUid}
            />
          </div>
        </div>,
        document.body,
      )}
      {peek && <PlayerPeek uid={peek} onClose={() => setPeek(null)} />}
    </div>
  )
}

function NameRow({ p, win, onPeek }: { p: RunPlayer; win: boolean; onPeek: () => void }) {
  return (
    <button type="button" disabled={!p} onClick={onPeek} style={{ all: 'unset', cursor: p ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 11, background: win ? C.goldSoft : C.sf2, border: `1px solid ${win ? C.gold + '55' : C.line}`, marginBottom: 7, width: '100%', boxSizing: 'border-box' }}>
      <span style={{ flex: 1, fontSize: 15, fontWeight: win ? 800 : 700, color: p ? (win ? C.gold : C.thi) : C.tmut, textAlign: 'right' }}>{p?.name ?? '—'}</span>
    </button>
  )
}

const rowBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', background: C.ink, border: `1px solid ${C.line}`, borderRadius: 11, padding: '9px 11px', display: 'block', width: '100%', boxSizing: 'border-box' }
const miniBadge: React.CSSProperties = { fontSize: 10, fontWeight: 800, color: C.live, background: C.liveSoft, borderRadius: 5, padding: '1px 6px' }
const chip = (on: boolean): React.CSSProperties => ({ all: 'unset', cursor: 'pointer', padding: '6px 11px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}` })
