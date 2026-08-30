'use client'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { C, DISP } from '@/components/ui'
import type { MatchDTO, Player } from './BracketView'
import MatchSheet, { roundLabel } from './MatchSheet'

// ── Radial single-elim bracket (World-Cup-poster style) ───────────────────────
// Players on the outer ring; rounds converge inward to the champion at center.
//
// Interaction model (rewritten — the old version crashed):
//   • pan  = one finger drag  → translate
//   • zoom = two-finger pinch → scale toward the pinch centroid (focal point)
//   • +/−  buttons zoom toward the view centre
//   • tap a player dot → detail sheet
// All gesture math is rAF-coalesced and written straight to the <g> transform
// attribute via ref; React state only updates on gesture-end. The heavy SVG body
// is a memoised child so a pan/zoom never re-renders a single node.  (MD-9/MD-10)

const SIZE = 1000
const MIN_K = 0.55
const MAX_K = 6

type Node = { x: number; y: number; ang: number; player: Player; win: boolean; me: boolean; matchId: string }
type Geo = {
  cx: number; cy: number; outerR: number
  nodes: Node[]
  links: { x1: number; y1: number; x2: number; y2: number; gold: boolean; me: boolean; done: boolean }[]
  rings: { r: number; label: string }[]
  champ: Player
}

export default function RadialBracket({ bMatches, rounds, meUid }: {
  bMatches: MatchDTO[]; rounds: number[]; meUid?: string
}) {
  const geo = useMemo<Geo>(() => buildGeo(bMatches, rounds, meUid), [bMatches, rounds, meUid])

  const wrapRef = useRef<HTMLDivElement>(null)
  const gRef = useRef<SVGGElement>(null)
  // committed transform (buttons / gesture-end) + a live ref the gesture mutates
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const vRef = useRef(view)
  const raf = useRef(0)

  // active pointers (screen coords) + pinch memory
  const ptrs = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinch = useRef<{ dist: number; mid: { x: number; y: number } } | null>(null)
  const tap = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  const [sel, setSel] = useState<MatchDTO | null>(null)

  // screen-px → viewBox-user-units factor for the current render size
  const f = useCallback(() => {
    const r = wrapRef.current?.getBoundingClientRect()
    return r && r.width ? SIZE / r.width : 1
  }, [])

  // write vRef → DOM. Called directly (safe when rAF is throttled, e.g. tab
  // hidden) and also via rAF for smoothness during a live gesture.
  const apply = useCallback(() => {
    raf.current = 0
    const g = gRef.current
    if (g) {
      const v = vRef.current
      g.setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.k})`)
    }
  }, [])
  const schedule = useCallback(() => {
    if (typeof requestAnimationFrame !== 'function') { apply(); return }
    if (!raf.current) raf.current = requestAnimationFrame(apply)
  }, [apply])
  // commit the live ref to React state (buttons + gesture-end) — the effect below
  // then guarantees the DOM is in sync even if the last rAF never fired
  const commit = useCallback(() => setView({ ...vRef.current }), [])
  useEffect(() => { vRef.current = view; apply() }, [view, apply])

  const clampK = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k))

  // zoom about a focal point given in viewBox-user coords (measured from svg origin)
  const zoomAt = useCallback((nextK: number, fx: number, fy: number) => {
    const v = vRef.current
    const k2 = clampK(nextK)
    v.x = fx - (fx - v.x) * (k2 / v.k)
    v.y = fy - (fy - v.y) * (k2 / v.k)
    v.k = k2
    commit()
  }, [commit])

  const onPointerDown = (e: React.PointerEvent) => {
    try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId) } catch { /* synthetic / unknown pointer */ }
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    tap.current = { x: e.clientX, y: e.clientY, moved: false }
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = ptrs.current.get(e.pointerId)
    if (!prev) return
    const cur = { x: e.clientX, y: e.clientY }
    ptrs.current.set(e.pointerId, cur)
    const scale = f()

    if (ptrs.current.size >= 2 && pinch.current) {
      const [a, b] = [...ptrs.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const rect = wrapRef.current!.getBoundingClientRect()
      // focal in user coords, then pan by centroid drift so it stays under the fingers
      const fx = (mid.x - rect.left) * scale
      const fy = (mid.y - rect.top) * scale
      const ratio = pinch.current.dist ? dist / pinch.current.dist : 1
      const v = vRef.current
      const k2 = clampK(v.k * ratio)
      v.x = fx - (fx - v.x) * (k2 / v.k) + (mid.x - pinch.current.mid.x) * scale
      v.y = fy - (fy - v.y) * (k2 / v.k) + (mid.y - pinch.current.mid.y) * scale
      v.k = k2
      pinch.current = { dist, mid }
      tap.current && (tap.current.moved = true)
      schedule()
      return
    }

    // one finger → pan
    const dx = (cur.x - prev.x) * scale
    const dy = (cur.y - prev.y) * scale
    vRef.current.x += dx
    vRef.current.y += dy
    if (tap.current && Math.hypot(cur.x - tap.current.x, cur.y - tap.current.y) > 6) tap.current.moved = true
    schedule()
  }

  const endPointer = (e: React.PointerEvent) => {
    try { (e.currentTarget as Element).releasePointerCapture?.(e.pointerId) } catch { /* noop */ }
    ptrs.current.delete(e.pointerId)
    if (ptrs.current.size < 2) pinch.current = null

    // tap → hit-test the outer player dots
    if (ptrs.current.size === 0 && tap.current && !tap.current.moved) {
      const rect = wrapRef.current!.getBoundingClientRect()
      const scale = f()
      const v = vRef.current
      let best: { d: number; n: Node } | null = null
      for (const n of geo.nodes) {
        if (!n.player) continue
        const sx = rect.left + (v.x + n.x * v.k) / scale
        const sy = rect.top + (v.y + n.y * v.k) / scale
        const d = Math.hypot(sx - tap.current.x, sy - tap.current.y)
        if (d < 26 && (!best || d < best.d)) best = { d, n }
      }
      if (best) {
        const m = bMatches.find(mm => mm.id === best!.n.matchId)
        if (m) setSel(m)
      }
    }
    tap.current = null
    if (ptrs.current.size === 0) commit()   // sync state + guarantee DOM apply
  }

  const btnZoom = (factor: number) => zoomAt(vRef.current.k * factor, SIZE / 2, SIZE / 2)
  const reset = () => { vRef.current = { x: 0, y: 0, k: 1 }; commit() }

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])
  // re-fit transform if the bracket data changes underneath us
  useEffect(() => { vRef.current = { x: 0, y: 0, k: 1 }; setView({ x: 0, y: 0, k: 1 }) }, [geo])

  const kPct = Math.round(view.k * 100)

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button onClick={() => btnZoom(1.3)} style={ctrl} aria-label="بزرگ‌نمایی">+</button>
        <button onClick={() => btnZoom(1 / 1.3)} style={ctrl} aria-label="کوچک‌نمایی">−</button>
        <button onClick={reset} style={{ ...ctrl, width: 'auto', padding: '0 12px', fontSize: 12 }}>نمای کامل</button>
        <span style={{ marginInlineStart: 'auto', fontSize: 10.5, color: C.tmut, alignSelf: 'center' }} dir="ltr">{kPct}%</span>
      </div>

      <div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        style={{
          position: 'relative', width: '100%', aspectRatio: '1 / 1', maxHeight: '78vh', overflow: 'hidden',
          background: `radial-gradient(circle at center, ${C.sf1}, ${C.ink})`,
          border: `1px solid ${C.line}`, borderRadius: 16, cursor: 'grab', touchAction: 'none',
          userSelect: 'none', WebkitUserSelect: 'none',
        }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" style={{ display: 'block' }}>
          <g ref={gRef}>
            <RadialBody geo={geo} />
          </g>
        </svg>
      </div>

      <div style={{ fontSize: 11, color: C.tmut, textAlign: 'center', marginTop: 8, lineHeight: 1.7 }}>
        بازیکن‌ها روی حلقهٔ بیرونی · وسط = قهرمان · با دو انگشت زوم کن، با یک انگشت بکش
        {meUid ? ' · مسیرِ تو بنفشه' : ''} · خطِ طلایی = برنده · روی نقطهٔ هر بازیکن بزن
      </div>

      <MatchSheet
        match={sel}
        roundName={sel ? roundLabel(seatsInRound(bMatches, rounds, sel.round)) : undefined}
        meUid={meUid}
        onClose={() => setSel(null)}
      />
    </div>
  )
}

function seatsInRound(bMatches: MatchDTO[], rounds: number[], round: number): number {
  const first = rounds[0] ?? 1
  const r1 = bMatches.filter(m => m.round === first).length * 2
  return Math.max(2, Math.round(r1 / Math.pow(2, rounds.indexOf(round))))
}

// ── the heavy, static SVG body — never re-rendered by a gesture ───────────────
const RadialBody = memo(function RadialBody({ geo }: { geo: Geo }) {
  const { cx, cy, outerR, nodes, links, rings, champ } = geo
  // ≤20 seats: every name fits. More: only the ones that matter (advanced or you),
  // the rest are dots — tap to read, or pinch in. Keeps the ring from turning to mush.
  const labelAll = nodes.length <= 20

  return (
    <>
      {/* faint round rings + labels */}
      {rings.map((rg, i) => (
        <g key={'ring' + i}>
          <circle cx={cx} cy={cy} r={rg.r} fill="none" stroke={C.line} strokeWidth={1} strokeDasharray="3 7" opacity={0.5} />
          <text x={cx} y={cy - rg.r} textAnchor="middle" dominantBaseline="central" fontFamily={DISP} fontSize={17} fontWeight={700} fill={C.tmut}>
            {rg.label}
          </text>
        </g>
      ))}

      {/* links — decided ones solid, undecided ones faint & dashed */}
      {links.map((l, i) => (
        <line
          key={i}
          x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={l.me ? C.accent : l.gold ? C.gold : l.done ? C.line2 : C.line}
          strokeWidth={l.me ? 5 : l.gold ? 4 : 2}
          strokeLinecap="round"
          strokeDasharray={l.done ? undefined : '2 8'}
          opacity={l.done ? 1 : 0.55}
        />
      ))}

      {/* champion hub */}
      <circle cx={cx} cy={cy} r={44} fill={C.sf2} stroke={champ ? C.gold : C.line2} strokeWidth={3} />
      {champ
        ? <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontFamily={DISP} fontWeight={800} fill={C.gold}
            fontSize={(champ.tag ?? '').length > 8 ? 16 : 24}>{champ.tag ?? ''}</text>
        : <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={36}>🏆</text>}

      {/* player leaves — dot + (optionally) full @tag pushed radially outward */}
      {nodes.map((n, i) => {
        const lx = cx + (outerR + 26) * Math.cos(n.ang)
        const ly = cy + (outerR + 26) * Math.sin(n.ang)
        const rightSide = Math.cos(n.ang) >= -0.01
        return (
          <g key={i}>
            <circle
              cx={n.x} cy={n.y} r={n.me ? 9 : 7}
              fill={n.win ? C.gold : n.player ? C.sf2 : C.ink}
              stroke={n.me ? C.accent : n.win ? C.gold : C.line2}
              strokeWidth={n.me ? 3.5 : 1.5}
            />
            {n.player && (labelAll || n.win || n.me) && (
              <text
                x={lx} y={ly}
                textAnchor={rightSide ? 'start' : 'end'} dominantBaseline="central"
                fontFamily={DISP} fontSize={n.me ? 20 : 17} fontWeight={n.win || n.me ? 800 : 500}
                fill={n.me ? C.accent : n.win ? C.gold : C.tbody}
              >
                {n.player.tag}
              </text>
            )}
          </g>
        )
      })}
    </>
  )
})

// ── geometry (unchanged math, minus the per-frame rotation) ───────────────────
function buildGeo(bMatches: MatchDTO[], rounds: number[], meUid?: string): Geo {
  const R = rounds.length
  const first = rounds[0]
  const r1 = bMatches.filter(m => m.round === first).sort((a, b) => a.slot - b.slot)
  const leaves = Math.max(2, r1.length * 2)
  const cx = SIZE / 2, cy = SIZE / 2
  const outerR = SIZE / 2 - 96
  const TAU = Math.PI * 2
  const ringR = (ri: number) => outerR * (R - ri) / (R + 1)
  const playerAngle = (li: number) => (li + 0.5) / leaves * TAU - Math.PI / 2

  const angleOf: Record<string, number> = {}
  const matchPos: Record<string, { x: number; y: number }> = {}
  const nodes: Node[] = []
  const links: Geo['links'] = []

  const rn = (players: number) =>
    players === 2 ? 'فینال' : players === 4 ? 'نیمه‌نهایی' : players === 8 ? 'یک‌چهارم' :
    players === 16 ? 'یک‌هشتم' : players === 32 ? 'مرحلهٔ ۳۲' : players === 64 ? 'مرحلهٔ ۶۴' : `${players} نفره`
  const rings = rounds.map((_, ri) => ({
    r: ringR(ri),
    label: rn(Math.max(2, Math.round(leaves / Math.pow(2, ri)))),
  }))

  rounds.forEach((rd, ri) => {
    bMatches.filter(m => m.round === rd).forEach(m => {
      let ang: number
      if (ri === 0) ang = (m.slot * 2 + 1) / leaves * TAU - Math.PI / 2
      else {
        const a = angleOf[`${rounds[ri - 1]}:${m.slot * 2}`]
        const b = angleOf[`${rounds[ri - 1]}:${m.slot * 2 + 1}`]
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
      nodes.push({ x, y, ang, player: p, win, me, matchId: m.id })
      links.push({ x1: x, y1: y, x2: mp.x, y2: mp.y, gold: win, me: me && win, done: m.status === 'done' })
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
        const advanced = child.status === 'done' && !!child.winnerUid && (child.winnerUid === m.p1?.uid || child.winnerUid === m.p2?.uid)
        const me = !!meUid && !!child.winnerUid && child.winnerUid === meUid
        links.push({ x1: cpos.x, y1: cpos.y, x2: mp.x, y2: mp.y, gold: advanced, me: me && advanced, done: child.status === 'done' })
      })
    })
  })

  const finalM = bMatches.find(m => m.round === rounds[R - 1])
  const champ: Player = finalM && finalM.status === 'done'
    ? (finalM.winnerUid === finalM.p1?.uid ? finalM.p1 : finalM.p2) : null

  return { cx, cy, outerR, nodes, links, rings, champ }
}

const ctrl: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', width: 40, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 9, fontSize: 18, fontWeight: 700, background: C.sf2, color: C.thi, border: `1px solid ${C.line}`,
}
