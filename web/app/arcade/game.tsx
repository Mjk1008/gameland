'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BUILDS, COLS, ROWS, W, H, TOTAL_WAVES, RES_META,
  canAfford, demolish, ignitePitch, newGame, place, startWave, step,
  type BuildKind, type Game, type Res,
} from './engine'
import { draw } from './render'

const BEST_KEY = 'gl.arcade.crusader.best'

/** Everything the HUD needs, sampled off the sim a few times a second. */
interface Hud {
  res: Res
  wave: number
  phase: Game['phase']
  buildLeft: number
  keepHp: number
  keepMaxHp: number
  foes: number
  fireCd: number
  flash: string | null
}

function snapshot(g: Game): Hud {
  return {
    res: { ...g.res }, wave: g.wave, phase: g.phase, buildLeft: g.buildLeft,
    keepHp: g.keepHp, keepMaxHp: g.keepMaxHp, foes: g.foes.length + g.spawnQueue.length,
    fireCd: g.fireCd, flash: g.flash?.text ?? null,
  }
}

export default function CrusaderGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<Game>(newGame())
  const selRef = useRef<BuildKind | null>('wall')
  const hoverRef = useRef<[number, number] | null>(null)
  const razeRef = useRef(false)

  const [sel, setSel] = useState<BuildKind | null>('wall')
  const [raze, setRaze] = useState(false)
  const [hud, setHud] = useState<Hud>(() => snapshot(gameRef.current))
  const [best, setBest] = useState(0)

  useEffect(() => { selRef.current = sel }, [sel])
  useEffect(() => { razeRef.current = raze }, [raze])

  useEffect(() => {
    const raw = window.localStorage.getItem(BEST_KEY)
    if (raw) setBest(parseInt(raw, 10) || 0)
  }, [])

  // Persist the furthest wave reached — local only, nothing hits the server.
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
      step(g, dt)
      draw(ctx, g, selRef.current && !razeRef.current ? selRef.current : null, hoverRef.current)

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
    if (razeRef.current) demolish(g, cell[0], cell[1])
    else if (selRef.current) place(g, cell[0], cell[1], selRef.current)
    setHud(snapshot(g))
  }, [cellFromEvent])

  const onMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    hoverRef.current = cellFromEvent(e.clientX, e.clientY)
  }, [cellFromEvent])

  const reset = () => {
    gameRef.current = newGame()
    setSel('wall'); setRaze(false)
    setHud(snapshot(gameRef.current))
  }

  const keepPct = Math.max(0, hud.keepHp / hud.keepMaxHp)
  const over = hud.phase === 'won' || hud.phase === 'lost'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* resources */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
        {RES_META.map(m => (
          <div key={m.key} style={{ background: SF2, border: `1px solid ${LINE}`, borderRadius: 10, padding: '7px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, lineHeight: 1 }}>{m.glyph}</div>
            <div className="gl-num" style={{ fontSize: 15, fontWeight: 800, color: m.color, marginTop: 3 }}>{Math.floor(hud.res[m.key])}</div>
            <div style={{ fontSize: 8.5, color: TMUT, marginTop: 1 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* wave + keep status */}
      <div style={{ background: SF1, border: `1px solid ${LINE}`, borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: THI }}>
            موج <span className="gl-num">{hud.wave}</span> / <span className="gl-num">{TOTAL_WAVES}</span>
          </span>
          <span style={{ flex: 1 }} />
          {hud.phase === 'build'
            ? <span style={{ fontSize: 11.5, color: GOLD }}>آماده‌سازی — <span className="gl-num">{Math.ceil(hud.buildLeft)}</span> ثانیه</span>
            : hud.phase === 'battle'
              ? <span style={{ fontSize: 11.5, color: LIVE }}>نبرد — <span className="gl-num">{hud.foes}</span> دشمن</span>
              : null}
        </div>
        <div style={{ height: 7, borderRadius: 999, background: INK, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${keepPct * 100}%`, background: keepPct > .5 ? WIN : keepPct > .25 ? GOLD : LIVE, borderRadius: 999, transition: 'width .2s' }} />
        </div>
        <div style={{ fontSize: 10, color: TMUT }}>استحکام دژ · بهترین رکورد: موج <span className="gl-num">{best}</span></div>
      </div>

      {/* board */}
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: `1px solid ${LINE}` }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onTap}
          onPointerMove={onMove}
          onPointerLeave={() => { hoverRef.current = null }}
          style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: `${W} / ${H}`, touchAction: 'manipulation', cursor: 'pointer' }}
        />

        {hud.flash && !over && (
          <div style={{ position: 'absolute', top: 8, insetInline: 8, textAlign: 'center', pointerEvents: 'none' }}>
            <span style={{ background: 'rgba(10,8,5,.85)', border: `1px solid ${LINE2}`, color: THI, fontSize: 11.5, padding: '5px 12px', borderRadius: 999 }}>{hud.flash}</span>
          </div>
        )}

        {over && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,8,5,.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: hud.phase === 'won' ? GOLD : LIVE }}>
              {hud.phase === 'won' ? 'قلعه پابرجا ماند' : 'دژ سقوط کرد'}
            </div>
            <div style={{ fontSize: 13, color: TBODY, lineHeight: 1.9 }}>
              {hud.phase === 'won'
                ? `هر ${TOTAL_WAVES} موج صلیبیون را پس زدی.`
                : `تا موج ${hud.wave} دوام آوردی.`}
            </div>
            <button onClick={reset} style={btn(GOLD, INK)}>از نو</button>
          </div>
        )}
      </div>

      {/* actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button
          onClick={() => { ignitePitch(gameRef.current); setHud(snapshot(gameRef.current)) }}
          disabled={hud.fireCd > 0 || over}
          style={btn(hud.fireCd > 0 ? LINE : '#FF7A3D', hud.fireCd > 0 ? TMUT : INK, hud.fireCd > 0 || over)}
        >
          🔥 آتش به قیر{hud.fireCd > 0 ? ` (${Math.ceil(hud.fireCd)})` : ''}
        </button>
        <button
          onClick={() => { startWave(gameRef.current); setHud(snapshot(gameRef.current)) }}
          disabled={hud.phase !== 'build' || over}
          style={btn(hud.phase === 'build' && !over ? ACCENT : LINE, hud.phase === 'build' && !over ? '#fff' : TMUT, hud.phase !== 'build' || over)}
        >
          ⚔ شروع موج
        </button>
      </div>

      {/* build palette */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: THI }}>ساخت‌وساز</span>
          <span style={{ flex: 1, height: 1, background: LINE }} />
          <button
            onClick={() => setRaze(v => !v)}
            style={{ ...btn(raze ? LIVE : SF2, raze ? '#fff' : TBODY), padding: '5px 12px', fontSize: 11.5 }}
          >
            ⛏ تخریب{raze ? ' (روشن)' : ''}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {BUILDS.map(b => {
            const affordable = canAfford(hud.res, b.cost)
            const active = sel === b.kind && !raze
            return (
              <button
                key={b.kind}
                onClick={() => { setRaze(false); setSel(b.kind) }}
                style={{
                  all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
                  background: active ? 'rgba(245,166,35,.12)' : SF2,
                  border: `1px solid ${active ? GOLD : LINE}`,
                  borderRadius: 11, padding: '9px 10px',
                  opacity: affordable ? 1 : 0.5,
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? GOLD : THI }}>{b.name}</div>
                <div style={{ fontSize: 10, color: TMUT, marginTop: 3, lineHeight: 1.6 }}>{b.desc}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  {(Object.keys(b.cost) as (keyof Res)[]).map(k => {
                    const m = RES_META.find(x => x.key === k)!
                    const short = hud.res[k] < (b.cost[k] ?? 0)
                    return (
                      <span key={k} style={{ fontSize: 10.5, color: short ? LIVE : m.color }}>
                        {m.glyph} <span className="gl-num">{b.cost[k]}</span>
                      </span>
                    )
                  })}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* how to play */}
      <div style={{ background: SF1, border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 14px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: THI, marginBottom: 7 }}>راهنما</div>
        <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 11.5, color: TBODY, lineHeight: 2 }}>
          <li>یک بنا انتخاب کن، بعد روی خانهٔ خالی بزن تا ساخته شود.</li>
          <li>صلیبیون از نوار قرمز بالا می‌آیند و سراغ دژ می‌روند.</li>
          <li>دیوار مسیرشان را می‌بندد؛ اگر راه نباشد دیوار را می‌شکنند.</li>
          <li>گودال قیر بساز، دشمن که رویش رفت دکمهٔ آتش را بزن.</li>
          <li>منجنیق از دور می‌کوبد — با برج کماندار جوابش را بده.</li>
          <li>هر کشته ۲ طلا می‌دهد؛ اردوگاه مزدور آدمکش می‌فرستد.</li>
        </ul>
      </div>
    </div>
  )
}

// ── local tokens (mirrors components/ui.tsx; kept inline so this feature
// stays self-contained and deleting it touches nothing shared) ──
const INK = '#14110D'
const SF1 = '#1E1A14'
const SF2 = '#262019'
const LINE = '#322A1F'
const LINE2 = '#40362A'
const THI = '#F6EFE4'
const TBODY = '#A89A88'
const TMUT = '#6E6252'
const GOLD = '#F5A623'
const ACCENT = '#A855F7'
const WIN = '#3FBE86'
const LIVE = '#FF5A4E'

function btn(bg: string, fg: string, disabled = false): React.CSSProperties {
  return {
    all: 'unset', boxSizing: 'border-box', display: 'block', textAlign: 'center',
    background: bg, color: fg, fontSize: 13, fontWeight: 700,
    padding: '11px 14px', borderRadius: 11,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.65 : 1,
  }
}
