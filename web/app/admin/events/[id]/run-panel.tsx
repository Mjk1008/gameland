'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, DISP } from '@/components/ui'

export type RunPlayer = { uid: string; tag: string; attempts: number; entry?: number } | null
export type RunMatch = {
  id: string; groupKey: string; groupLabel: string; bracket: number; round: number; slot: number
  roundLabel: string
  p1: RunPlayer; p2: RunPlayer; winnerUid?: string
  status: 'pending' | 'ready' | 'done'
  selfMatch: boolean
}

type Props = { compId: string; matches: RunMatch[] }

export default function RunPanel({ compId, matches }: Props) {
  const router = useRouter()
  const [showDone, setShowDone] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)   // matchId:uid pending confirm
  const [editId, setEditId] = useState<string | null>(null)
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

  async function commit(m: RunMatch, uid: string, correct: boolean) {
    setBusyId(m.id); setErr(null)
    try {
      const res = await fetch('/api/admin/match', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: m.id, winnerUserId: uid, correct }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ثبت نشد')
      setConfirmId(null); setEditId(null)
      router.refresh()   // ← re-fetch server data, NO full page reload
    } catch (e: any) { setErr(e.message) }
    finally { setBusyId(null) }
  }

  const pending = matches.filter(m => m.status === 'ready').length
  const done = matches.filter(m => m.status === 'done').length

  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 15, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.thi }}>ثبت نتیجهٔ بازی‌ها</div>
          <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 3 }}>{pending} بازیِ آماده · {done} ثبت‌شده</div>
        </div>
        <button type="button" onClick={() => setShowDone(s => !s)} style={chip(showDone)}>نمایش ثبت‌شده‌ها</button>
      </div>

      {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, borderRadius: 9, padding: 9 }}>{err}</div>}

      {groups.map(g => {
        const visible = g.ms.filter(m => m.status === 'ready' || (showDone && m.status === 'done'))
        if (visible.length === 0) return null
        return (
          <div key={g.gk}>
            {groups.length > 1 && <div style={{ fontSize: 12, fontWeight: 800, color: C.tbody, margin: '4px 0 6px' }}>{g.label}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {visible.map(m => (
                <MatchRow
                  key={m.id} m={m}
                  busy={busyId === m.id}
                  confirmUid={confirmId?.startsWith(m.id + ':') ? confirmId.slice(m.id.length + 1) : null}
                  editing={editId === m.id}
                  onPick={(uid) => setConfirmId(m.id + ':' + uid)}
                  onCancel={() => { setConfirmId(null); setEditId(null) }}
                  onConfirm={(uid) => commit(m, uid, false)}
                  onEdit={() => { setEditId(m.id); setConfirmId(null) }}
                  onEditPick={(uid) => commit(m, uid, true)}
                />
              ))}
            </div>
          </div>
        )
      })}
      {pending === 0 && !showDone && (
        <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: '10px 0' }}>بازیِ آماده‌ای برای ثبت نیست.</div>
      )}
    </div>
  )
}

function MatchRow({ m, busy, confirmUid, editing, onPick, onCancel, onConfirm, onEdit, onEditPick }: {
  m: RunMatch; busy: boolean; confirmUid: string | null; editing: boolean
  onPick: (uid: string) => void; onCancel: () => void; onConfirm: (uid: string) => void
  onEdit: () => void; onEditPick: (uid: string) => void
}) {
  const meta = `${m.roundLabel}${m.bracket ? ` · براکت ${m.bracket}` : ''} · مسابقهٔ ${m.slot + 1}`
  return (
    <div style={{ background: C.ink, border: `1px solid ${m.selfMatch ? C.gold + '66' : C.line}`, borderRadius: 11, padding: '9px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
        <span style={{ fontSize: 10, color: C.tmut }}>{meta}</span>
        {m.selfMatch && <span style={{ fontSize: 9.5, fontWeight: 800, color: C.gold, background: C.goldSoft, borderRadius: 5, padding: '1px 6px' }}>خودی — کدوم ورودی ادامه بده؟</span>}
      </div>

      {m.status === 'done' && !editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 12.5 }}>
            <Name p={m.p1} win={m.winnerUid === m.p1?.uid} self={m.selfMatch} />
            <span style={{ color: C.tmut }}> — </span>
            <Name p={m.p2} win={m.winnerUid === m.p2?.uid} self={m.selfMatch} />
          </span>
          <button type="button" disabled={busy} onClick={onEdit} style={miniBtn}>ویرایش</button>
        </div>
      ) : confirmUid ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 12.5, color: C.thi }}>
            برنده: <b dir="ltr" style={{ fontFamily: DISP }}>{confirmUid === m.p1?.uid ? m.p1?.tag : m.p2?.tag}</b>
            {m.selfMatch && <> · ورودی {confirmUid === m.p1?.uid ? (m.p1?.entry ?? 1) : (m.p2?.entry ?? 2)}</>}
          </span>
          <button type="button" disabled={busy} onClick={() => (editing ? onEditPick(confirmUid) : onConfirm(confirmUid))} style={{ ...winBtn, background: C.win, color: '#08110B' }}>{busy ? '…' : 'تأیید'}</button>
          <button type="button" disabled={busy} onClick={onCancel} style={miniBtn}>لغو</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" disabled={busy || !m.p1} onClick={() => onPick(m.p1!.uid)} style={winBtn}>
            <SlotLabel p={m.p1} self={m.selfMatch} fallback="۱" />
          </button>
          <button type="button" disabled={busy || !m.p2} onClick={() => onPick(m.p2!.uid)} style={winBtn}>
            <SlotLabel p={m.p2} self={m.selfMatch} fallback="۲" />
          </button>
          {editing && <button type="button" disabled={busy} onClick={onCancel} style={miniBtn}>لغو</button>}
        </div>
      )}
    </div>
  )
}

function SlotLabel({ p, self, fallback }: { p: RunPlayer; self: boolean; fallback: string }) {
  if (!p) return <span style={{ color: C.tmut }}>—</span>
  return (
    <span dir="ltr" style={{ fontFamily: DISP, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {self ? `ورودی ${p.entry ?? fallback}` : p.tag}
      {!self && p.attempts > 1 && <span style={{ opacity: 0.7, marginInlineStart: 4 }}>×{p.attempts}{p.entry && p.entry > 1 ? ` #${p.entry}` : ''}</span>}
    </span>
  )
}
function Name({ p, win, self }: { p: RunPlayer; win: boolean; self: boolean }) {
  if (!p) return <span style={{ color: C.tmut }}>—</span>
  return (
    <span dir="ltr" style={{ fontFamily: DISP, fontWeight: win ? 800 : 500, color: win ? C.gold : C.tbody }}>
      {self ? `ورودی ${p.entry ?? '?'}` : p.tag}
    </span>
  )
}

const winBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 40, lineHeight: '40px', fontWeight: 700, fontSize: 12.5, color: C.accent, background: C.accentSoft, border: `1px solid ${C.accent}55`, borderRadius: 8, overflow: 'hidden', padding: '0 8px' }
const miniBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 32, lineHeight: '32px', padding: '0 12px', fontWeight: 700, fontSize: 11.5, color: C.tbody, background: C.sf2, border: `1px solid ${C.line2}`, borderRadius: 8 }
const chip = (on: boolean): React.CSSProperties => ({ all: 'unset', cursor: 'pointer', padding: '6px 11px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}` })
