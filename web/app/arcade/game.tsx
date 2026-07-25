'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BUILDS, BUILD_BY_KIND, COLS, ROWS, W, H, TOTAL_WAVES, RES_META, FOES,
  canAfford, demolish, ignitePitch, newGame, place, repair, startWave, step, wavePreview,
  type BuildKind, type Game, type Res, type FoeKind,
} from './engine'
import { draw } from './render'

const BEST_KEY = 'gl.arcade.crusader.best'

const INK = '#0B0A08'
const SF1 = '#1D1913'
const SF2 = '#252017'
const LINE = '#2A241C'
const LINE2 = '#3A332A'
const THI = '#F2EDE4'
const TBODY = '#C9BFAF'
const TMUT = '#8A7F6E'
const GOLD = '#F5C84B'
const WIN = '#3ECF8E'
const LIVE = '#E24B4A'

type Tool = 'build' | 'repair' | 'raze'

interface Hud {
  res: Res
  income: Partial<Record<keyof Res, number>>
  wave: number
  phase: Game['phase']
  buildLeft: number
  keepHp: number
  keepMaxHp: number
  foes: number
  fireCd: number
  flash: string | null
  score: number
  kills: number
}

function snapshot(g: Game): Hud {
  const income: Partial<Record<keyof Res, number>> = {}
  for (const t of g.tiles) {
    if (t.kind === 'sand' || t.kind === 'keep') continue
    const p = BUILD_BY_KIND[t.kind as BuildKind].produces
    if (p) income[p.res] = (income[p.res] ?? 0) + p.amount
  }
  return {
    res: { ...g.res }, income,
    wave: g.wave, phase: g.phase, buildLeft: g.buildLeft,
    keepHp: g.keepHp, keepMaxHp: g.keepMaxHp,
    foes: g.foes.length + g.spawnQueue.length,
    fireCd: g.fireCd, flash: g.flash?.text ?? null,
    score: g.score, kills: g.kills,
  }
}

const GROUPS: { key: 'defence' | 'economy' | 'trap'; label: string }[] = [
  { key: 'defence', label: 'دفاع' },
  { key: 'economy', label: 'اقتصاد' },
  { key: 'trap', label: 'تله' },
]

const FOE_GLYPH: Record<FoeKind, string> = {
  foot: '🗡', bow: '🏹', shield: '🛡', knight: '⚔️', assassin: '🗡', catapult: '🎯',
}

export default function CrusaderGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<Game>(newGame())
  const selRef = useRef<BuildKind | null>('wall')
  const toolRef = useRef<Tool>('build')
  const hoverRef = useRef<[number, number] | null>(null)
  const speedRef = useRef(1)
  const pausedRef = useRef(false)

  const [sel, setSel] = useState<BuildKind | null>('wall')
  const [tool, setTool] = useState<Tool>('build')
  const [speed, setSpeed] = useState(1)
  const [paused, setPaused] = useState(false)
  const [group, setGroup] = useState<'defence' | 'economy' | 'trap'>('defence')
  const [hud, setHud] = useState<Hud>(() => snapshot(gameRef.current))
  const [best, setBest] = useState(0)

  useEffect(() => { selRef.current = sel }, [sel])
  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { pausedRef.current = paused }, [paused])

  useEffect(() => {
    const raw = window.localStorage.getItem(BEST_KEY)
    if (raw) setBest(parseInt(raw, 10) || 0)
  }, [])

  useEffect(() => {
    if (hud.wave > best) {
      setBest(hud.wave)
      try { window.localStorage.setItem(BEST_KEY, String(hud.wave)) } catch { /* private mode */ }
    }
  }, [hud.wave, best])

  // ── main loop ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let raf = 0
    let last = performance.now()
    let hudAcc = 0

    const frame = (now: number) => {
      // Clamp dt so a backgrounded tab doesn't fast-forward the siege.
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const g = gameRef.current
      if (!pausedRef.current) step(g, dt * speedRef.current)
      const showGhost = toolRef.current === 'build' ? selRef.current : null
      draw(ctx, g, showGhost, hoverRef.current, g.phase === 'build' || toolRef.current !== 'build')

      hudAcc += dt
      if (hudAcc >= 0.1) { hudAcc = 0; setHud(snapshot(g)) }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const cellFromEvent = useCallback((clientX: number, clientY: number): [number, number] | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const c = Math.floor(((clientX - rect.left) / rect.width) * COLS)
    const r = Math.floor(((clientY - rect.top) / rect.height) * ROWS)
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null
    return [c, r]
  }, [])

  const onTap = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const cell = cellFromEvent(e.clientX, e.clientY)
    if (!cell) return
    const g = gameRef.current
    if (g.phase === 'won' || g.phase === 'lost') return
    if (toolRef.current === 'raze') demolish(g, cell[0], cell[1])
    else if (toolRef.current === 'repair') repair(g, cell[0], cell[1])
    else if (selRef.current) place(g, cell[0], cell[1], selRef.current)
    setHud(snapshot(g))
  }, [cellFromEvent])

  const onMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    hoverRef.current = cellFromEvent(e.clientX, e.clientY)
  }, [cellFromEvent])

  const reset = () => {
    gameRef.current = newGame()
    setSel('wall'); setTool('build'); setPaused(false); setSpeed(1)
    setHud(snapshot(gameRef.current))
  }

  const keepPct = Math.max(0, hud.keepHp / hud.keepMaxHp)
  const over = hud.phase === 'won' || hud.phase === 'lost'
  const nextWave = Math.min(TOTAL_WAVES, hud.wave + 1)
  const preview = hud.phase === 'build' ? wavePreview(nextWave) : []
  const palette = BUILDS.filter(b => b.group === group)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>

      {/* ── resources ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
        {RES_META.map(m => {
          const inc = hud.income[m.key] ?? 0
          return (
            <div key={m.key} style={{ background: SF2, border: `1px solid ${LINE}`, borderRadius: 11, padding: '7px 4px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, lineHeight: 1 }}>{m.glyph}</div>
              <div className="gl-num" style={{ fontSize: 16, fontWeight: 800, color: m.color, marginTop: 3, lineHeight: 1 }}>{Math.floor(hud.res[m.key])}</div>
              <div style={{ fontSize: 8, color: inc > 0 ? WIN : TMUT, marginTop: 3 }}>
                {inc > 0 ? <span className="gl-num">+{inc}</span> : m.label}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── wave + keep ── */}
      <div style={{ background: SF1, border: `1px solid ${LINE}`, borderRadius: 13, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: THI }}>
            موج <span className="gl-num">{hud.wave}</span><span style={{ color: TMUT }}>/</span><span className="gl-num">{TOTAL_WAVES}</span>
          </span>
          <span style={{ display: 'flex', gap: 3, flex: 1 }}>
            {Array.from({ length: TOTAL_WAVES }, (_, i) => (
              <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < hud.wave ? GOLD : i === hud.wave && hud.phase === 'battle' ? LIVE : LINE2 }} />
            ))}
          </span>
          {hud.phase === 'build'
            ? <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, whiteSpace: 'nowrap' }}>آماده‌سازی <span className="gl-num">{Math.ceil(hud.buildLeft)}</span>ث</span>
            : hud.phase === 'battle'
              ? <span style={{ fontSize: 11, fontWeight: 700, color: LIVE, whiteSpace: 'nowrap' }}><span className="gl-num">{hud.foes}</span> دشمن</span>
              : null}
        </div>

        <div style={{ height: 7, borderRadius: 999, background: INK, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${keepPct * 100}%`, background: keepPct > .5 ? WIN : keepPct > .25 ? GOLD : LIVE, borderRadius: 999, transition: 'width .2s' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9.5, color: TMUT }}>
          <span>استحکام دژ</span>
          <span style={{ flex: 1 }} />
          <span>امتیاز <span className="gl-num" style={{ color: GOLD }}>{hud.score}</span></span>
          <span>کشته <span className="gl-num" style={{ color: TBODY }}>{hud.kills}</span></span>
          <span>رکورد موج <span className="gl-num" style={{ color: TBODY }}>{best}</span></span>
        </div>

        {/* next wave intel */}
        {preview.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', borderTop: `1px solid ${LINE}`, paddingTop: 8 }}>
            <span style={{ fontSize: 10, color: TMUT }}>موج بعد:</span>
            {preview.map(p => (
              <span key={p.kind} title={FOES[p.kind].name}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: TBODY, background: SF2, border: `1px solid ${LINE2}`, borderRadius: 7, padding: '3px 7px' }}>
                {FOE_GLYPH[p.kind]} {FOES[p.kind].name} <span className="gl-num" style={{ color: GOLD }}>×{p.n}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── board ── */}
      <div style={{ position: 'relative', borderRadius: 15, overflow: 'hidden', border: `1px solid ${LINE2}`, boxShadow: '0 10px 30px -14px rgba(0,0,0,.7)' }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onTap}
          onPointerMove={onMove}
          onPointerLeave={() => { hoverRef.current = null }}
          style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: `${W} / ${H}`, touchAction: 'manipulation', cursor: 'pointer' }}
        />

        {/* live toast */}
        {hud.flash && !over && (
          <div style={{ position: 'absolute', top: 8, insetInline: 8, textAlign: 'center', pointerEvents: 'none' }}>
            <span style={{ background: 'rgba(10,8,5,.88)', border: `1px solid ${LINE2}`, color: THI, fontSize: 11.5, fontWeight: 700, padding: '6px 13px', borderRadius: 999 }}>{hud.flash}</span>
          </div>
        )}

        {/* speed / pause */}
        {!over && (
          <div style={{ position: 'absolute', bottom: 8, insetInlineEnd: 8, display: 'flex', gap: 6 }}>
            <button onClick={() => setPaused(p => !p)} aria-label={paused ? 'ادامه' : 'مکث'} style={pill(paused)}>
              {paused ? '▶' : '❚❚'}
            </button>
            <button onClick={() => setSpeed(s => (s === 1 ? 2 : 1))} aria-label="سرعت" style={pill(speed === 2)}>
              <span className="gl-num">{speed}×</span>
            </button>
          </div>
        )}

        {/* result */}
        {over && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,8,5,.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 22, textAlign: 'center' }}>
            <div style={{ fontSize: 34 }}>{hud.phase === 'won' ? '🏆' : '🏴'}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: hud.phase === 'won' ? GOLD : LIVE }}>
              {hud.phase === 'won' ? 'قلعه ایستاد' : 'دژ سقوط کرد'}
            </div>
            <div style={{ fontSize: 12.5, color: TBODY, lineHeight: 1.95 }}>
              {hud.phase === 'won'
                ? `هر ${TOTAL_WAVES} موج صلیبیون را پس زدی.`
                : `تا موج ${hud.wave} دوام آوردی.`}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 2 }}>
              <Stat label="امتیاز" value={hud.score} color={GOLD} />
              <Stat label="کشته" value={hud.kills} color={THI} />
              <Stat label="موج" value={hud.wave} color={TBODY} />
            </div>
            <button onClick={reset} style={{ all: 'unset', cursor: 'pointer', marginTop: 6, background: GOLD, color: INK, fontWeight: 800, fontSize: 14, padding: '12px 28px', borderRadius: 12 }}>از نو</button>
          </div>
        )}
      </div>

      {/* ── actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button
          onClick={() => { startWave(gameRef.current); setHud(snapshot(gameRef.current)) }}
          disabled={hud.phase !== 'build'}
          style={action(hud.phase === 'build' ? GOLD : LINE2, hud.phase === 'build' ? INK : TMUT, hud.phase === 'build')}
        >
          {hud.phase === 'build' ? `شروع موج ${hud.wave + 1} ⚔` : 'نبرد در جریان'}
        </button>
        <button
          onClick={() => { ignitePitch(gameRef.current); setHud(snapshot(gameRef.current)) }}
          disabled={hud.fireCd > 0}
          style={action(hud.fireCd > 0 ? LINE2 : '#FF9A3C', hud.fireCd > 0 ? TMUT : INK, hud.fireCd === 0)}
        >
          {hud.fireCd > 0 ? <>مشعل <span className="gl-num">{Math.ceil(hud.fireCd)}</span>ث</> : 'آتش به قیر 🔥'}
        </button>
      </div>

      {/* ── tools ── */}
      <div style={{ display: 'flex', gap: 6 }}>
        {([['build', '🧱 ساخت'], ['repair', '🔧 تعمیر'], ['raze', '⛏ تخریب']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTool(k)}
            style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, fontSize: 12, fontWeight: 700, background: tool === k ? (k === 'raze' ? 'rgba(226,75,74,.16)' : k === 'repair' ? 'rgba(62,207,142,.14)' : 'rgba(245,200,75,.14)') : SF2, color: tool === k ? (k === 'raze' ? LIVE : k === 'repair' ? WIN : GOLD) : TBODY, border: `1px solid ${tool === k ? (k === 'raze' ? LIVE : k === 'repair' ? WIN : GOLD) : LINE}` }}>
            {label}
          </button>
        ))}
      </div>

      {tool === 'repair' && (
        <div style={{ fontSize: 10.5, color: WIN, background: 'rgba(62,207,142,.08)', border: `1px solid ${WIN}33`, borderRadius: 9, padding: '8px 11px', lineHeight: 1.8 }}>
          روی هر بنای آسیب‌دیده بزن تا با سنگ ترمیم شود — هزینه به اندازهٔ خرابی است.
        </div>
      )}
      {tool === 'raze' && (
        <div style={{ fontSize: 10.5, color: LIVE, background: 'rgba(226,75,74,.08)', border: `1px solid ${LIVE}33`, borderRadius: 9, padding: '8px 11px', lineHeight: 1.8 }}>
          تخریب نیمی از هزینهٔ ساخت را برمی‌گرداند.
        </div>
      )}

      {/* ── build palette ── */}
      {tool === 'build' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {GROUPS.map(gp => (
              <button key={gp.key} onClick={() => setGroup(gp.key)}
                style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, padding: '7px 14px', borderRadius: 999, background: group === gp.key ? 'rgba(245,200,75,.14)' : 'transparent', color: group === gp.key ? GOLD : TMUT, border: `1px solid ${group === gp.key ? GOLD + '66' : LINE}` }}>
                {gp.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {palette.map(b => {
              const ok = canAfford(hud.res, b.cost)
              const on = sel === b.kind
              return (
                <button key={b.kind} onClick={() => setSel(b.kind)}
                  style={{
                    all: 'unset', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 5,
                    padding: '10px 11px', borderRadius: 12, opacity: ok ? 1 : 0.45,
                    background: on ? 'rgba(245,200,75,.12)' : SF1,
                    border: `1px solid ${on ? GOLD : LINE}`,
                  }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: on ? GOLD : THI }}>{b.name}</span>
                    {b.gun && <span style={{ fontSize: 8.5, color: TMUT, background: SF2, borderRadius: 5, padding: '2px 5px' }}>برد {b.gun.range}</span>}
                  </span>
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(Object.keys(b.cost) as (keyof Res)[]).map(k => {
                      const meta = RES_META.find(m => m.key === k)!
                      const short = hud.res[k] < (b.cost[k] ?? 0)
                      return (
                        <span key={k} className="gl-num" style={{ fontSize: 9.5, fontWeight: 700, color: short ? LIVE : meta.color, background: SF2, borderRadius: 5, padding: '2px 6px' }}>
                          {meta.glyph} {b.cost[k]}
                        </span>
                      )
                    })}
                  </span>
                  <span style={{ fontSize: 9.5, color: TMUT, lineHeight: 1.7 }}>{b.desc}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span style={{ textAlign: 'center' }}>
      <span className="gl-num" style={{ display: 'block', fontSize: 19, fontWeight: 800, color }}>{value}</span>
      <span style={{ display: 'block', fontSize: 9.5, color: TMUT, marginTop: 1 }}>{label}</span>
    </span>
  )
}

const pill = (on: boolean): React.CSSProperties => ({
  all: 'unset', cursor: 'pointer', width: 34, height: 30,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 9, fontSize: 11, fontWeight: 800,
  background: on ? 'rgba(245,200,75,.22)' : 'rgba(10,8,5,.6)',
  backdropFilter: 'blur(6px)',
  border: `1px solid ${on ? GOLD : LINE2}`,
  color: on ? GOLD : THI,
})

const action = (bg: string, fg: string, enabled: boolean): React.CSSProperties => ({
  all: 'unset', cursor: enabled ? 'pointer' : 'default', textAlign: 'center',
  minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 12, background: enabled ? bg : SF2, color: fg,
  border: `1px solid ${enabled ? bg : LINE}`,
  fontWeight: 800, fontSize: 13,
})
