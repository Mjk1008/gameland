'use client'
import { useMemo, useRef, useState } from 'react'
import { C, DISP } from '@/components/ui'
import type { MatchDTO, Player } from './BracketView'

// Radial single-elim bracket (World-Cup-poster style): players on the outer ring,
// rounds converge inward to the champion at center. Rotate (drag), zoom (±), reset.
export default function RadialBracket({ bMatches, rounds, meUid }: {
  bMatches: MatchDTO[]; rounds: number[]; meUid?: string
}) {
  const geo = useMemo(() => {
    const R = rounds.length
    const first = rounds[0]
    const r1 = bMatches.filter(m => m.round === first).sort((a, b) => a.slot - b.slot)
    const n1 = r1.length
    const leaves = Math.max(1, n1 * 2)
    const SIZE = 1000, cx = SIZE / 2, cy = SIZE / 2
    const outerR = SIZE / 2 - 70
    const TAU = Math.PI * 2
    const ringR = (ri: number) => outerR * (R - ri) / (R + 1)   // ri: 0=outer round … R-1=final
    const playerAngle = (li: number) => (li + 0.5) / leaves * TAU - Math.PI / 2

    const angleOf: Record<string, number> = {}
    const matchPos: Record<string, { x: number; y: number }> = {}
    const nodes: { x: number; y: number; player: Player; win: boolean; me: boolean }[] = []
    const links: { x1: number; y1: number; x2: number; y2: number; gold: boolean; me: boolean }[] = []

    rounds.forEach((rd, ri) => {
      bMatches.filter(m => m.round === rd).forEach(m => {
        let ang: number
        if (ri === 0) ang = (m.slot * 2 + 1) / leaves * TAU - Math.PI / 2
        else {
          const a = angleOf[`${rounds[ri - 1]}:${m.slot * 2}`], b = angleOf[`${rounds[ri - 1]}:${m.slot * 2 + 1}`]
          ang = a != null && b != null ? (a + b) / 2 : (a ?? b ?? 0)
        }
        angleOf[`${rd}:${m.slot}`] = ang
        const rad = ringR(ri)
        matchPos[m.id] = { x: cx + rad * Math.cos(ang), y: cy + rad * Math.sin(ang) }
      })
    })

    r1.forEach(m => {
      const mp = matchPos[m.id]
      ;[{ p: m.p1, li: m.slot * 2 }, { p: m.p2, li: m.slot * 2 + 1 }].forEach(({ p, li }) => {
        const ang = playerAngle(li)
        const x = cx + outerR * Math.cos(ang), y = cy + outerR * Math.sin(ang)
        const win = m.status === 'done' && !!p && m.winnerUid === p?.uid
        const me = !!meUid && p?.uid === meUid
        nodes.push({ x, y, player: p, win, me })
        links.push({ x1: x, y1: y, x2: mp.x, y2: mp.y, gold: win, me })
      })
    })
    rounds.slice(1).forEach((rd, i) => {
      const ri = i + 1
      bMatches.filter(m => m.round === rd).forEach(m => {
        const mp = matchPos[m.id]
        ;[m.slot * 2, m.slot * 2 + 1].forEach(cs => {
          const child = bMatches.find(x => x.round === rounds[ri - 1] && x.slot === cs)
          const cpos = child && matchPos[child.id]
          if (!child || !cpos) return
          const gold = child.status === 'done' && !!child.winnerUid && (child.winnerUid === m.p1?.uid || child.winnerUid === m.p2?.uid)
          const me = !!meUid && !!child.winnerUid && child.winnerUid === meUid
          links.push({ x1: cpos.x, y1: cpos.y, x2: mp.x, y2: mp.y, gold, me })
        })
      })
    })

    const finalM = bMatches.find(m => m.round === rounds[R - 1])
    const champ: Player = finalM && finalM.status === 'done'
      ? (finalM.winnerUid === finalM.p1?.uid ? finalM.p1 : finalM.p2) : null

    return { SIZE, cx, cy, nodes, links, champ }
  }, [bMatches, rounds, meUid])

  const [rot, setRot] = useState(0)
  const [scale, setScale] = useState(1)
  const drag = useRef<{ x: number; y: number; rot: number } | null>(null)

  const onDown = (e: React.PointerEvent) => { (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, rot } }
  const onMove = (e: React.PointerEvent) => { if (drag.current) setRot(drag.current.rot + (e.clientX - drag.current.x) * 0.3) }
  const onUp = () => { drag.current = null }
  const zoom = (f: number) => setScale(s => Math.min(3, Math.max(0.5, s * f)))
  const reset = () => { setRot(0); setScale(1) }

  const { SIZE, cx, cy, nodes, links, champ } = geo

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button onClick={() => zoom(1.25)} style={ctrl}>+</button>
        <button onClick={() => zoom(0.8)} style={ctrl}>−</button>
        <button onClick={reset} style={{ ...ctrl, width: 'auto', padding: '0 12px', fontSize: 12 }}>نمای کامل</button>
        <span style={{ marginInlineStart: 'auto', fontSize: 10.5, color: C.tmut, alignSelf: 'center' }}>بکش برای چرخش · +/− زوم</span>
      </div>
      <div
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
        style={{ position: 'relative', width: '100%', height: 'min(80vw, 460px)', overflow: 'hidden', background: `radial-gradient(circle at center, ${C.sf1}, ${C.ink})`, border: `1px solid ${C.line}`, borderRadius: 16, cursor: 'grab', touchAction: 'none' }}
      >
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" style={{ transform: `scale(${scale})`, transition: drag.current ? 'none' : 'transform .15s', maxWidth: '100%', maxHeight: '100%' }}>
            <g transform={`rotate(${rot} ${cx} ${cy})`}>
              {links.map((l, i) => (
                <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                  stroke={l.me ? C.accent : l.gold ? C.gold : C.line2} strokeWidth={l.me ? 5 : l.gold ? 4 : 2.5} strokeLinecap="round" />
              ))}
              {/* center trophy / champion */}
              <circle cx={cx} cy={cy} r={40} fill={C.sf2} stroke={champ ? C.gold : C.line2} strokeWidth={3} />
              {champ
                ? <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontFamily={DISP} fontSize={30} fontWeight={800} fill={C.gold} transform={`rotate(${-rot} ${cx} ${cy})`}>{champ.tag[0]?.toUpperCase()}</text>
                : <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={34} transform={`rotate(${-rot} ${cx} ${cy})`}>🏆</text>}
              {/* player leaves */}
              {nodes.map((n, i) => (
                <g key={i}>
                  <circle cx={n.x} cy={n.y} r={16} fill={n.win ? C.gold : n.player ? C.sf2 : C.ink} stroke={n.me ? C.accent : n.win ? C.gold : C.line2} strokeWidth={n.me ? 4 : 2} />
                  <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central" fontFamily={DISP} fontSize={15} fontWeight={800} fill={n.win ? C.ink : n.player ? C.thi : C.tmut} transform={`rotate(${-rot} ${n.x} ${n.y})`}>
                    {n.player ? n.player.tag[0]?.toUpperCase() : '—'}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.tmut, textAlign: 'center', marginTop: 8 }}>
        دایرهٔ بیرونی = بازیکن‌ها · هرچی به مرکز نزدیک‌تر، مرحلهٔ بالاتر · وسط = قهرمان{meUid ? ' · مسیرِ تو بنفشه' : ''}
      </div>
    </div>
  )
}

const ctrl: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', width: 38, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 9, fontSize: 18, fontWeight: 700, background: C.sf2, color: C.thi, border: `1px solid ${C.line}`,
}
