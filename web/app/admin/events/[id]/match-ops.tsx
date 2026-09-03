'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { C } from '@/components/ui'

export type OpsPlayer = { uid: string; name: string } | null
export const ANNOUNCE = [
  { id: 'elim5', label: 'حذف تا پنج دقیقه آینده' },
  { id: 'play', label: 'اعلان بازی' },
  { id: 'cancel', label: 'اعلان لغو بازی' },
] as const

export function MatchOps({
  p1, p2, cancelled, status, busy, onWin, onCancelMatch, onAnnounce, winnerUid,
}: {
  p1: OpsPlayer; p2: OpsPlayer; cancelled?: boolean
  status: 'pending' | 'ready' | 'done'
  busy: boolean
  onWin: (uid: string) => void
  onCancelMatch: () => void
  onAnnounce: (kind: typeof ANNOUNCE[number]['id'], who: 'p1' | 'p2' | 'both') => void
  winnerUid?: string
}) {
  const [announce, setAnnounce] = useState(false)
  const [who, setWho] = useState<'p1' | 'p2' | 'both'>('both')
  const canRecord = status === 'ready' && !cancelled
  const canEdit = status === 'done' && !cancelled
  const canRestore = status === 'done' && !!cancelled
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
      {canRecord && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" disabled={busy || !p1} onClick={() => p1 && onWin(p1.uid)} style={winBtn}>وین {p1?.name ?? ''}</button>
          <button type="button" disabled={busy || !p2} onClick={() => p2 && onWin(p2.uid)} style={winBtn}>وین {p2?.name ?? ''}</button>
        </div>
      )}
      {(canEdit || canRestore) && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" disabled={busy || !p1 || (!canRestore && p1.uid === winnerUid)} onClick={() => p1 && onWin(p1.uid)} style={editBtn}>وین {p1?.name ?? ''}</button>
          <button type="button" disabled={busy || !p2 || (!canRestore && p2.uid === winnerUid)} onClick={() => p2 && onWin(p2.uid)} style={editBtn}>وین {p2?.name ?? ''}</button>
        </div>
      )}
      {canRecord && (
        <button type="button" disabled={busy} onClick={onCancelMatch} style={ghostBtn}>لغو مسابقه</button>
      )}
      <button type="button" disabled={busy || (!p1 && !p2)} onClick={() => setAnnounce(a => !a)} style={ghostBtn}>اعلان به بازیکن</button>
      {announce && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {p1 && <button type="button" onClick={() => setWho('p1')} style={seg(who === 'p1')}>{p1.name}</button>}
            {p2 && p2.uid !== p1?.uid && <button type="button" onClick={() => setWho('p2')} style={seg(who === 'p2')}>{p2.name}</button>}
            {p1 && p2 && p1.uid !== p2.uid && <button type="button" onClick={() => setWho('both')} style={seg(who === 'both')}>هر دو</button>}
          </div>
          {ANNOUNCE.map(k => (
            <button key={k.id} type="button" disabled={busy} onClick={() => onAnnounce(k.id, who)} style={ghostBtn}>{k.label}</button>
          ))}
        </div>
      )}
      {cancelled && !canRestore && <span style={badge}>لغو شده</span>}
    </div>
  )
}

export function PlayerPeek({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [data, setData] = useState<{ name: string; phone: string; events: { title: string; attempts: number }[] } | null>(null)
  useEffect(() => {
    let live = true
    fetch(`/api/admin/player/${uid}`).then(r => r.json()).then(j => { if (live && !j.error) setData(j) })
    return () => { live = false }
  }, [uid])
  if (typeof document === 'undefined') return null
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(8,6,4,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 340, background: C.sf1, border: `1px solid ${C.line2}`, borderRadius: 14, padding: '14px 16px 16px', position: 'relative' }}>
        <button type="button" onClick={onClose} aria-label="بستن" style={{ all: 'unset', cursor: 'pointer', position: 'absolute', top: 10, left: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.tbody, fontSize: 20, lineHeight: 1 }}>×</button>
        {!data ? (
          <div style={{ fontSize: 12, color: C.tmut, padding: '18px 0 8px' }}>…</div>
        ) : (
          <div style={{ paddingTop: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.thi, paddingLeft: 36 }}>{data.name}</div>
            {data.phone && <div dir="ltr" style={{ fontSize: 13.5, fontWeight: 700, color: C.tbody, marginTop: 6 }}>{data.phone}</div>}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.events.map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5 }}>
                  <span style={{ color: C.thi, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                  <span style={{ color: C.tmut, flexShrink: 0 }}>{e.attempts} سهم</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

const winBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 42, lineHeight: '42px', fontWeight: 800, fontSize: 13, color: '#0B0A08', background: C.accent, borderRadius: 9, overflow: 'hidden', padding: '0 8px' }
const editBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 42, lineHeight: '42px', fontWeight: 800, fontSize: 13, color: C.accent, background: C.accentSoft, border: `1px solid ${C.accent}`, borderRadius: 9, overflow: 'hidden', padding: '0 8px' }
const ghostBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 40, lineHeight: '40px', fontWeight: 700, fontSize: 13, color: C.tbody, background: C.sf2, border: `1px solid ${C.line2}`, borderRadius: 9 }
const seg = (on: boolean): React.CSSProperties => ({ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 38, lineHeight: '38px', fontSize: 12, fontWeight: 700, borderRadius: 8, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}`, overflow: 'hidden', padding: '0 6px' })
const badge: React.CSSProperties = { display: 'inline-block', alignSelf: 'flex-start', fontSize: 11, fontWeight: 800, color: C.live, background: C.liveSoft, borderRadius: 7, padding: '3px 8px' }
