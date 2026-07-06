'use client'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { C, DISP } from '@/components/ui'

// ── types coming from the server ──
export type Player = { uid: string; tag: string; name: string } | null
export type MatchDTO = {
  id: string; bracket: number; round: number; slot: number
  p1: Player; p2: Player; winnerUid?: string; score?: string
  status: 'pending' | 'ready' | 'done'
}
type Props = { matches: MatchDTO[]; meUid?: string }

// card + layout geometry (in canvas px, before zoom)
const CARD_W = 156, CARD_H = 52, COL_GAP = 52, ROW_H = 70

// Persian round name from how many players are in that round
function roundName(playersInRound: number): string {
  switch (playersInRound) {
    case 2:  return 'فینال'
    case 4:  return 'نیمه‌نهایی'
    case 8:  return 'یک‌چهارم نهایی'
    case 16: return 'یک‌هشتم نهایی'
    case 32: return 'مرحلهٔ ۳۲'
    case 64: return 'مرحلهٔ ۶۴'
    case 128:return 'مرحلهٔ ۱۲۸'
    default: return `${playersInRound} نفره`
  }
}

export default function BracketView({ matches, meUid }: Props) {
  // group by bracket index
  const bracketIds = useMemo(() => Array.from(new Set(matches.map(m => m.bracket))).sort((a, b) => a - b), [matches])
  // default to the bracket the viewer is in, else the first
  const myBracket = useMemo(() => {
    if (!meUid) return null
    const mine = matches.find(m => m.p1?.uid === meUid || m.p2?.uid === meUid)
    return mine ? mine.bracket : null
  }, [matches, meUid])

  const [bracket, setBracket] = useState<number>(myBracket ?? bracketIds[0] ?? 0)
  const [mode, setMode] = useState<'rounds' | 'tree'>('rounds')
  const [myPathOnly, setMyPathOnly] = useState(false)

  const bMatches = useMemo(() => matches.filter(m => m.bracket === bracket), [matches, bracket])
  const rounds = useMemo(() => Array.from(new Set(bMatches.map(m => m.round))).sort((a, b) => a - b), [bMatches])
  const maxRound = rounds[rounds.length - 1] ?? 1
  const r1count = bMatches.filter(m => m.round === (rounds[0] ?? 1)).length
  const totalPlayers = r1count * 2

  // the set of matches on the viewer's path (round by round, following wins)
  const myPath = useMemo(() => {
    if (!meUid) return new Set<string>()
    const ids = new Set<string>()
    for (const m of bMatches) if (m.p1?.uid === meUid || m.p2?.uid === meUid) ids.add(m.id)
    return ids
  }, [bMatches, meUid])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['rounds', 'tree'] as const).map(v => (
            <button key={v} onClick={() => setMode(v)} style={segBtn(mode === v)}>
              {v === 'rounds' ? 'نمای مرحله‌ای' : 'نمای کامل براکت'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {bracketIds.length > 1 && (
            <div style={{ display: 'flex', gap: 5, overflowX: 'auto', flex: 1 }}>
              {bracketIds.map(b => (
                <button key={b} onClick={() => setBracket(b)} style={chip(b === bracket)}>
                  {b === 0 ? 'فاینال' : `براکت ${b}`}{b === myBracket ? ' ★' : ''}
                </button>
              ))}
            </div>
          )}
          {meUid && myBracket === bracket && (
            <button onClick={() => setMyPathOnly(p => !p)} style={chip(myPathOnly)}>مسیر من</button>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.tmut }}>
          {totalPlayers} نفر · {rounds.length} مرحله · <span style={{ color: C.accent }}>■</span> بازی‌های تو با رنگ بنفش مشخصه
        </div>
      </div>

      {mode === 'rounds'
        ? <RoundsView bMatches={bMatches} rounds={rounds} totalPlayers={totalPlayers} maxRound={maxRound} meUid={meUid} myPathOnly={myPathOnly} myPath={myPath} />
        : <TreeView bMatches={bMatches} rounds={rounds} totalPlayers={totalPlayers} maxRound={maxRound} meUid={meUid} />}
    </div>
  )
}

// ─────────────────────────── ROUNDS VIEW (mobile-first, never breaks) ──────────
function RoundsView({ bMatches, rounds, totalPlayers, maxRound, meUid, myPathOnly, myPath }: {
  bMatches: MatchDTO[]; rounds: number[]; totalPlayers: number; maxRound: number
  meUid?: string; myPathOnly: boolean; myPath: Set<string>
}) {
  const [sel, setSel] = useState<number>(rounds[0] ?? 1)
  useEffect(() => { if (!rounds.includes(sel)) setSel(rounds[0] ?? 1) }, [rounds, sel])

  const playersInRound = (r: number) => totalPlayers / Math.pow(2, r - (rounds[0] ?? 1))
  let list = bMatches.filter(m => m.round === sel)
  if (myPathOnly) list = list.filter(m => myPath.has(m.id))

  return (
    <div>
      {/* round tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
        {rounds.map(r => (
          <button key={r} onClick={() => setSel(r)} style={{ ...chip(r === sel), whiteSpace: 'nowrap' }}>
            {roundName(playersInRound(r))}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.tmut, textAlign: 'center', padding: '20px 0' }}>
          {myPathOnly ? 'تو این مرحله بازی‌ای نداری' : 'هنوز بازی‌ای اینجا نیست'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(m => <MatchCardRow key={m.id} m={m} meUid={meUid} />)}
        </div>
      )}
    </div>
  )
}

function MatchCardRow({ m, meUid }: { m: MatchDTO; meUid?: string }) {
  const mine = m.p1?.uid === meUid || m.p2?.uid === meUid
  return (
    <div style={{
      background: C.sf1, border: `1px solid ${mine ? C.accent : C.line}`, borderRadius: 12, overflow: 'hidden',
      boxShadow: mine ? `0 0 0 1px ${C.accent}55` : 'none',
    }}>
      <PlayerLine p={m.p1} win={m.winnerUid === m.p1?.uid && m.status === 'done'} me={m.p1?.uid === meUid} score={m.score?.split('-')[0]} />
      <div style={{ height: 1, background: C.line }} />
      <PlayerLine p={m.p2} win={m.winnerUid === m.p2?.uid && m.status === 'done'} me={m.p2?.uid === meUid} score={m.score?.split('-')[1]} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 11px', background: C.ink }}>
        <StatusPill status={m.status} />
        <span style={{ fontSize: 10, color: C.tmut }}>{m.status === 'done' ? 'انجام شد' : m.status === 'ready' ? 'آماده — زمان‌بندی به‌زودی' : 'در انتظار حریف'}</span>
      </div>
    </div>
  )
}

function PlayerLine({ p, win, me, score }: { p: Player; win?: boolean; me?: boolean; score?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 11px', background: win ? C.goldSoft : 'transparent' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: win ? C.gold : p ? C.line2 : C.line, flexShrink: 0 }} />
      <span dir="ltr" style={{ flex: 1, fontFamily: DISP, fontSize: 14, fontWeight: win ? 800 : 600, color: p ? (win ? C.gold : C.thi) : C.tmut, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {p ? p.tag : '—'}{me ? ' (تو)' : ''}
      </span>
      {score != null && score !== '' && <span style={{ fontFamily: DISP, fontSize: 13, fontWeight: 800, color: win ? C.gold : C.tbody }}>{score}</span>}
    </div>
  )
}

function StatusPill({ status }: { status: MatchDTO['status'] }) {
  const map = { done: [C.win, C.winSoft, 'تمام'], ready: [C.accent, C.accentSoft, 'زنده'], pending: [C.tmut, C.sf2, 'انتظار'] } as const
  const [c, s, label] = map[status]
  return <span style={{ fontSize: 10, fontWeight: 700, color: c, background: s, padding: '2px 8px', borderRadius: 6 }}>{label}</span>
}

// ─────────────────────────── TREE VIEW (zoom + pan canvas) ─────────────────────
function TreeView({ bMatches, rounds, totalPlayers, maxRound, meUid }: {
  bMatches: MatchDTO[]; rounds: number[]; totalPlayers: number; maxRound: number; meUid?: string
}) {
  const firstRound = rounds[0] ?? 1
  // compute node positions: round r (index i from firstRound) → x; slot → y (centered on children)
  const pos = useMemo(() => {
    const p: Record<string, { x: number; y: number }> = {}
    const yByRound: Record<number, Record<number, number>> = {}
    rounds.forEach((r, ri) => {
      yByRound[r] = {}
      const ms = bMatches.filter(m => m.round === r).sort((a, b) => a.slot - b.slot)
      ms.forEach(m => {
        let y: number
        if (ri === 0) y = m.slot * ROW_H + ROW_H / 2
        else {
          const c1 = yByRound[rounds[ri - 1]]?.[m.slot * 2]
          const c2 = yByRound[rounds[ri - 1]]?.[m.slot * 2 + 1]
          y = c1 != null && c2 != null ? (c1 + c2) / 2 : (c1 ?? c2 ?? m.slot * ROW_H + ROW_H / 2)
        }
        yByRound[r][m.slot] = y
        p[m.id] = { x: ri * (CARD_W + COL_GAP), y }
      })
    })
    return p
  }, [bMatches, rounds])

  const canvasW = rounds.length * (CARD_W + COL_GAP) + CARD_W
  const canvasH = (bMatches.filter(m => m.round === firstRound).length) * ROW_H + ROW_H

  const viewportRef = useRef<HTMLDivElement>(null)
  const [t, setT] = useState({ scale: 1, x: 20, y: 10 })
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const pinch = useRef<{ d: number; scale: number } | null>(null)

  const fit = useCallback(() => {
    const vp = viewportRef.current; if (!vp) return
    const s = Math.min(1, Math.min(vp.clientWidth / (canvasW + 40), vp.clientHeight / (canvasH + 20)))
    setT({ scale: s, x: (vp.clientWidth - canvasW * s) / 2, y: 12 })
  }, [canvasW, canvasH])
  useEffect(() => { fit() }, [fit])

  const zoom = (factor: number) => setT(p => {
    const vp = viewportRef.current; if (!vp) return p
    const cx = vp.clientWidth / 2, cy = vp.clientHeight / 2
    const ns = Math.min(2.2, Math.max(0.18, p.scale * factor))
    return { scale: ns, x: cx - (cx - p.x) * (ns / p.scale), y: cy - (cy - p.y) * (ns / p.scale) }
  })

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, tx: t.x, ty: t.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setT(p => ({ ...p, x: drag.current!.tx + (e.clientX - drag.current!.x), y: drag.current!.ty + (e.clientY - drag.current!.y) }))
  }
  const onPointerUp = () => { drag.current = null }
  const onWheel = (e: React.WheelEvent) => { if (e.ctrlKey || e.metaKey) { e.preventDefault() } zoom(e.deltaY < 0 ? 1.12 : 0.89) }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button onClick={() => zoom(1.2)} style={zoomBtn}>+</button>
        <button onClick={() => zoom(0.83)} style={zoomBtn}>−</button>
        <button onClick={fit} style={{ ...zoomBtn, width: 'auto', padding: '0 12px', fontSize: 12 }}>نمای کامل</button>
        <span style={{ marginInlineStart: 'auto', fontSize: 10.5, color: C.tmut, alignSelf: 'center' }}>بکش برای جابه‌جایی · +/− زوم</span>
      </div>
      <div
        ref={viewportRef}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
        onWheel={onWheel}
        style={{
          position: 'relative', width: '100%', height: 'min(72vh, 560px)', overflow: 'hidden',
          background: C.ink, border: `1px solid ${C.line}`, borderRadius: 14, cursor: 'grab', touchAction: 'none',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${t.x}px,${t.y}px) scale(${t.scale})`, transformOrigin: '0 0', width: canvasW, height: canvasH, direction: 'ltr' }}>
          {/* connectors */}
          <svg width={canvasW} height={canvasH} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
            {bMatches.map(m => {
              const ri = rounds.indexOf(m.round)
              if (ri === 0) return null
              const me = pos[m.id]; if (!me) return null
              const kids = bMatches.filter(k => k.round === rounds[ri - 1] && (k.slot === m.slot * 2 || k.slot === m.slot * 2 + 1))
              return kids.map(k => {
                const kp = pos[k.id]; if (!kp) return null
                const x1 = kp.x + CARD_W, y1 = kp.y, x2 = me.x, y2 = me.y, midx = (x1 + x2) / 2
                const onPath = meUid && (k.winnerUid === meUid)
                return <path key={m.id + k.id} d={`M${x1},${y1} H${midx} V${y2} H${x2}`} fill="none" stroke={onPath ? C.accent : C.line2} strokeWidth={onPath ? 2 : 1.2} />
              })
            })}
          </svg>
          {/* nodes */}
          {bMatches.map(m => {
            const p = pos[m.id]; if (!p) return null
            const mine = m.p1?.uid === meUid || m.p2?.uid === meUid
            return (
              <div key={m.id} style={{ position: 'absolute', left: p.x, top: p.y - CARD_H / 2, width: CARD_W }}>
                <TreeCard m={m} meUid={meUid} mine={mine} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TreeCard({ m, meUid, mine }: { m: MatchDTO; meUid?: string; mine: boolean }) {
  return (
    <div style={{ background: C.sf1, border: `1.5px solid ${mine ? C.accent : C.line}`, borderRadius: 9, overflow: 'hidden', fontSize: 11.5, boxShadow: mine ? `0 0 10px ${C.accent}44` : 'none' }}>
      <TreeSlot p={m.p1} win={m.winnerUid === m.p1?.uid && m.status === 'done'} me={m.p1?.uid === meUid} score={m.score?.split('-')[0]} />
      <div style={{ height: 1, background: C.line }} />
      <TreeSlot p={m.p2} win={m.winnerUid === m.p2?.uid && m.status === 'done'} me={m.p2?.uid === meUid} score={m.score?.split('-')[1]} />
    </div>
  )
}
function TreeSlot({ p, win, me, score }: { p: Player; win?: boolean; me?: boolean; score?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: win ? C.goldSoft : me ? C.accentSoft : 'transparent' }}>
      <span dir="ltr" style={{ flex: 1, fontFamily: DISP, fontWeight: win ? 800 : 600, color: p ? (win ? C.gold : C.thi) : C.tmut, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p ? p.tag : '—'}</span>
      {score != null && score !== '' && <span style={{ fontFamily: DISP, fontWeight: 800, color: win ? C.gold : C.tbody }}>{score}</span>}
    </div>
  )
}

// ── small styles ──
const segBtn = (on: boolean): React.CSSProperties => ({
  all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 10, fontSize: 12.5, fontWeight: 700,
  background: on ? C.accentSoft : C.sf1, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}`,
})
const chip = (on: boolean): React.CSSProperties => ({
  all: 'unset', cursor: 'pointer', padding: '7px 12px', borderRadius: 9, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
  background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}`,
})
const zoomBtn: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', width: 38, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 9, fontSize: 18, fontWeight: 700, background: C.sf2, color: C.thi, border: `1px solid ${C.line}`,
}
