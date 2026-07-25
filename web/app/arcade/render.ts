// Canvas painter for «قلعهٔ خان». Reads Game, writes pixels — no mutation.
//
// Look: warm desert dusk, soft top-left key light, everything sits on a
// contact shadow so the board reads as objects on sand rather than flat tiles.
import {
  COLS, ROWS, TILE, W, H, idx, KEEP_CELLS, FOES, BUILD_BY_KIND,
  type Game, type Foe, type TileKind, type BuildKind,
} from './engine'

const GOLD = '#F5C84B'
const SAND_HI = '#8A6C41'
const SAND_LO = '#5E4A2B'

const cxp = (c: number) => c * TILE + TILE / 2
const cyp = (r: number) => r * TILE + TILE / 2

// ── static desert, painted once ────────────────────────────────────────────
let floor: HTMLCanvasElement | null = null

function buildFloor(): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const x = cv.getContext('2d')!

  const g = x.createLinearGradient(0, 0, W * 0.4, H)
  g.addColorStop(0, SAND_HI)
  g.addColorStop(1, SAND_LO)
  x.fillStyle = g
  x.fillRect(0, 0, W, H)

  // wind-blown dune bands
  for (let i = 0; i < 26; i++) {
    const y = (i / 26) * H + Math.sin(i * 1.7) * 8
    x.strokeStyle = `rgba(255,226,176,${0.018 + (i % 3) * 0.012})`
    x.lineWidth = 3 + (i % 4)
    x.beginPath()
    x.moveTo(-10, y)
    x.bezierCurveTo(W * 0.3, y - 10, W * 0.7, y + 12, W + 10, y - 4)
    x.stroke()
  }

  // grain — deterministic so it never shimmers between frames
  let seed = 7
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
  for (let i = 0; i < 2600; i++) {
    const px = rnd() * W, py = rnd() * H
    x.fillStyle = rnd() > 0.5 ? 'rgba(255,235,190,.05)' : 'rgba(60,40,18,.06)'
    x.fillRect(px, py, 1.4, 1.4)
  }

  // vignette
  const v = x.createRadialGradient(W / 2, H * 0.55, W * 0.25, W / 2, H * 0.55, W * 0.95)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(20,12,4,.42)')
  x.fillStyle = v
  x.fillRect(0, 0, W, H)
  return cv
}

// ── helpers ────────────────────────────────────────────────────────────────
function shadow(x: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry = rx * 0.42) {
  x.fillStyle = 'rgba(28,16,4,.30)'
  x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill()
}

function roundRect(x: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, r: number) {
  x.beginPath()
  x.moveTo(px + r, py)
  x.arcTo(px + w, py, px + w, py + h, r)
  x.arcTo(px + w, py + h, px, py + h, r)
  x.arcTo(px, py + h, px, py, r)
  x.arcTo(px, py, px + w, py, r)
  x.closePath()
}

// ── main ───────────────────────────────────────────────────────────────────
export function draw(
  ctx: CanvasRenderingContext2D,
  g: Game,
  selected: TileKind | null,
  hoverCell: [number, number] | null,
  showGrid = true,
) {
  if (!floor) floor = buildFloor()

  ctx.save()
  if (g.shake > 0.05) ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake)

  ctx.clearRect(-12, -12, W + 24, H + 24)
  ctx.drawImage(floor, 0, 0)

  // ── build grid, only while placing ──
  if (showGrid) {
    ctx.strokeStyle = 'rgba(255,225,170,.10)'
    ctx.lineWidth = 1
    for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c * TILE + .5, 0); ctx.lineTo(c * TILE + .5, H); ctx.stroke() }
    for (let r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * TILE + .5); ctx.lineTo(W, r * TILE + .5); ctx.stroke() }
  }

  // ── invasion edge ──
  const pulse = 0.16 + Math.sin(g.clock * 3) * 0.06
  const eg = ctx.createLinearGradient(0, 0, 0, TILE * 1.1)
  eg.addColorStop(0, `rgba(192,57,43,${pulse + 0.2})`)
  eg.addColorStop(1, 'rgba(192,57,43,0)')
  ctx.fillStyle = eg
  ctx.fillRect(0, 0, W, TILE * 1.1)
  ctx.strokeStyle = `rgba(226,75,74,${0.4 + pulse})`
  ctx.lineWidth = 2
  ctx.setLineDash([9, 7])
  ctx.lineDashOffset = -g.clock * 22
  ctx.beginPath(); ctx.moveTo(0, TILE); ctx.lineTo(W, TILE); ctx.stroke()
  ctx.setLineDash([])

  // ── placement preview + range ring ──
  if (selected && hoverCell) {
    const [hc, hr] = hoverCell
    const ok = hr !== 0 && g.tiles[idx(hc, hr)].kind === 'sand'
    const spec = selected !== 'sand' && selected !== 'keep' ? BUILD_BY_KIND[selected as BuildKind] : null
    if (spec?.gun && ok) {
      ctx.fillStyle = 'rgba(245,200,75,.07)'
      ctx.strokeStyle = 'rgba(245,200,75,.34)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 5])
      ctx.beginPath(); ctx.arc(cxp(hc), cyp(hr), spec.gun.range * TILE, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.fillStyle = ok ? 'rgba(245,200,75,.22)' : 'rgba(226,75,74,.26)'
    roundRect(ctx, hc * TILE + 2, hr * TILE + 2, TILE - 4, TILE - 4, 6); ctx.fill()
    ctx.strokeStyle = ok ? GOLD : '#E24B4A'
    ctx.lineWidth = 2
    roundRect(ctx, hc * TILE + 2, hr * TILE + 2, TILE - 4, TILE - 4, 6); ctx.stroke()
  }

  // ── structures ──
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = g.tiles[idx(c, r)]
      if (t.kind === 'sand' || t.kind === 'keep') continue
      drawBuilding(ctx, c, r, t.kind, t.hp / (t.maxHp || 1), t.burn, g.clock)
    }
  }

  drawKeep(ctx, g)

  // ── allies ──
  for (const a of g.allies) {
    shadow(ctx, a.x, a.y + 7, 7)
    ctx.fillStyle = '#3ECF8E'
    ctx.beginPath(); ctx.arc(a.x, a.y, 6.5, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(16,10,4,.6)'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.fillStyle = '#14110D'
    ctx.fillRect(a.x - 1, a.y - 11, 2, 6)
  }

  // ── foes ──
  for (const f of g.foes) drawFoe(ctx, f, g.clock)

  // ── shots ──
  for (const s of g.shots) {
    const k = Math.min(1, s.t / s.life)
    const bx = s.x + (s.tx - s.x) * k
    const by = s.y + (s.ty - s.y) * k
    if (s.kind === 'rock') {
      const y = by - Math.sin(k * Math.PI) * 18
      shadow(ctx, bx, by + 4, 4, 2)
      ctx.fillStyle = '#8A7A66'
      ctx.beginPath(); ctx.arc(bx, y, 4.5, 0, Math.PI * 2); ctx.fill()
    } else {
      const ang = Math.atan2(s.ty - s.y, s.tx - s.x)
      const len = s.kind === 'bolt' ? 15 : 10
      const grd = ctx.createLinearGradient(bx - Math.cos(ang) * len, by - Math.sin(ang) * len, bx, by)
      grd.addColorStop(0, 'rgba(255,235,180,0)')
      grd.addColorStop(1, s.kind === 'bolt' ? '#FFF3CF' : '#F0DFAE')
      ctx.strokeStyle = grd
      ctx.lineWidth = s.kind === 'bolt' ? 2.6 : 1.6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(bx - Math.cos(ang) * len, by - Math.sin(ang) * len)
      ctx.lineTo(bx, by)
      ctx.stroke()
    }
  }

  // ── particles ──
  for (const p of g.parts) {
    const k = 1 - p.t / p.life
    if (p.kind === 'ring') {
      ctx.strokeStyle = p.hue ?? 'rgba(245,200,75,.5)'
      ctx.globalAlpha = Math.max(0, k)
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size + (1 - k) * 22, 0, Math.PI * 2); ctx.stroke()
      ctx.globalAlpha = 1
      continue
    }
    ctx.globalAlpha = Math.max(0, k)
    ctx.fillStyle = p.hue ??
      (p.kind === 'dust' ? '#C4A97A'
        : p.kind === 'spark' ? '#FFE9A8'
        : p.kind === 'ember' ? '#FF9A3C'
        : p.kind === 'coin' ? GOLD
        : '#A03A32')
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + k * 0.7), 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1

  // ── floating numbers ──
  ctx.textAlign = 'center'
  for (const ft of g.floats) {
    ctx.globalAlpha = Math.max(0, 1 - ft.t)
    ctx.font = '800 12px Vazirmatn, sans-serif'
    ctx.fillStyle = 'rgba(11,10,8,.7)'
    ctx.fillText(ft.text, ft.x + 1, ft.y + 1)
    ctx.fillStyle = ft.color
    ctx.fillText(ft.text, ft.x, ft.y)
  }
  ctx.globalAlpha = 1

  ctx.restore()
}

// ── the keep ───────────────────────────────────────────────────────────────
function drawKeep(ctx: CanvasRenderingContext2D, g: Game) {
  let minC = COLS, minR = ROWS, maxC = 0, maxR = 0
  for (const [c, r] of KEEP_CELLS) {
    minC = Math.min(minC, c); maxC = Math.max(maxC, c)
    minR = Math.min(minR, r); maxR = Math.max(maxR, r)
  }
  const x = minC * TILE, y = minR * TILE
  const w = (maxC - minC + 1) * TILE, h = (maxR - minR + 1) * TILE
  const pct = g.keepHp / g.keepMaxHp

  shadow(ctx, x + w / 2, y + h - 4, w * 0.46, h * 0.16)

  const grd = ctx.createLinearGradient(x, y, x, y + h)
  grd.addColorStop(0, '#A79B8B')
  grd.addColorStop(1, '#6B6156')
  ctx.fillStyle = grd
  roundRect(ctx, x + 4, y + 6, w - 8, h - 10, 6); ctx.fill()

  for (const [tx, ty] of [[x + 8, y + 8], [x + w - 20, y + 8], [x + 8, y + h - 24], [x + w - 20, y + h - 24]]) {
    ctx.fillStyle = '#8C8175'
    roundRect(ctx, tx, ty, 12, 15, 3); ctx.fill()
    ctx.fillStyle = '#5A5149'
    ctx.fillRect(tx, ty, 12, 3)
  }

  ctx.fillStyle = '#B7AB9A'
  for (let i = 0; i < 6; i++) ctx.fillRect(x + 8 + i * ((w - 16) / 6), y + 4, (w - 16) / 12, 5)

  ctx.fillStyle = '#3A2E22'
  roundRect(ctx, x + w / 2 - 7, y + h - 22, 14, 15, 5); ctx.fill()

  // banner
  ctx.fillStyle = pct > 0.5 ? GOLD : pct > 0.25 ? '#F5A623' : '#E24B4A'
  ctx.fillRect(x + w / 2 - 1, y - 10, 2, 14)
  ctx.beginPath()
  ctx.moveTo(x + w / 2 + 1, y - 10)
  ctx.lineTo(x + w / 2 + 13, y - 6)
  ctx.lineTo(x + w / 2 + 1, y - 2)
  ctx.closePath(); ctx.fill()

  ctx.fillStyle = 'rgba(11,10,8,.6)'
  roundRect(ctx, x + 6, y + h - 5, w - 12, 4, 2); ctx.fill()
  ctx.fillStyle = pct > 0.5 ? '#3ECF8E' : pct > 0.25 ? GOLD : '#E24B4A'
  roundRect(ctx, x + 6, y + h - 5, (w - 12) * pct, 4, 2); ctx.fill()
}

// ── structures ─────────────────────────────────────────────────────────────
function drawBuilding(ctx: CanvasRenderingContext2D, c: number, r: number, kind: TileKind, pct: number, burn: number, clock: number) {
  const x = c * TILE, y = r * TILE, m = cxp(c), n = cyp(r)

  if (kind !== 'pitch' && kind !== 'spikes') shadow(ctx, m, y + TILE - 5, TILE * 0.34, TILE * 0.14)

  switch (kind) {
    case 'wall': {
      const grd = ctx.createLinearGradient(x, y, x, y + TILE)
      grd.addColorStop(0, '#9A9186'); grd.addColorStop(1, '#635B52')
      ctx.fillStyle = grd
      roundRect(ctx, x + 3, y + 5, TILE - 6, TILE - 9, 3); ctx.fill()
      ctx.fillStyle = 'rgba(0,0,0,.16)'
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 4, y + 11 + i * 8, TILE - 8, 1.5)
      ctx.fillStyle = '#B0A79A'
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 4 + i * 8, y + 2, 5, 4)
      break
    }
    case 'tower': {
      const grd = ctx.createLinearGradient(x, y, x, y + TILE)
      grd.addColorStop(0, '#A79B8B'); grd.addColorStop(1, '#655C51')
      ctx.fillStyle = grd
      roundRect(ctx, x + 8, y + 8, TILE - 16, TILE - 12, 4); ctx.fill()
      ctx.fillStyle = '#BEB2A2'
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 9 + i * 8, y + 4, 5, 5)
      ctx.fillStyle = '#2F2A22'
      ctx.beginPath(); ctx.arc(m, n - 1, 3.4, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = GOLD; ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.arc(m + 5, n - 1, 4.5, -1.1, 1.1); ctx.stroke()
      break
    }
    case 'ballista': {
      const grd = ctx.createLinearGradient(x, y, x, y + TILE)
      grd.addColorStop(0, '#8E7B60'); grd.addColorStop(1, '#4E4132')
      ctx.fillStyle = grd
      roundRect(ctx, x + 6, y + 9, TILE - 12, TILE - 13, 4); ctx.fill()
      ctx.save(); ctx.translate(m, n); ctx.rotate(Math.sin(clock * 1.2 + c) * 0.25)
      ctx.strokeStyle = '#C9B489'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(9, -4); ctx.stroke()
      ctx.strokeStyle = '#E8DCC0'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 7); ctx.stroke()
      ctx.restore()
      break
    }
    case 'palm': {
      ctx.strokeStyle = '#6B4E2E'; ctx.lineWidth = 3; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(m, y + TILE - 7); ctx.quadraticCurveTo(m - 2, n, m + 1, y + 11); ctx.stroke()
      const sway = Math.sin(clock * 1.4 + c) * 1.6
      ctx.fillStyle = '#5E8C43'
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.62
        ctx.beginPath(); ctx.ellipse(m + 1 + sway, y + 11, 10, 3.4, a, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = '#7FB069'
      ctx.beginPath(); ctx.arc(m + 1 + sway, y + 11, 2.6, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 'quarry': {
      ctx.fillStyle = '#6B645B'
      roundRect(ctx, x + 5, y + 12, TILE - 10, TILE - 17, 4); ctx.fill()
      ctx.fillStyle = '#B9AFA1'
      for (const [ox, oy, rr] of [[10, 20, 5], [22, 17, 6], [17, 26, 4.5]]) {
        ctx.beginPath(); ctx.arc(x + ox, y + oy, rr, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = 'rgba(255,255,255,.22)'
      ctx.beginPath(); ctx.arc(x + 20, y + 15, 2.4, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 'forge': {
      ctx.fillStyle = '#4A3F35'
      roundRect(ctx, x + 6, y + 12, TILE - 12, TILE - 17, 4); ctx.fill()
      ctx.fillStyle = '#2C2520'
      ctx.fillRect(x + 11, y + 6, 7, 9)
      const glow = 0.55 + Math.sin(clock * 6 + c) * 0.3
      ctx.fillStyle = `rgba(255,140,40,${glow})`
      ctx.beginPath(); ctx.arc(m + 2, n + 5, 5, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = `rgba(255,220,150,${glow * 0.8})`
      ctx.beginPath(); ctx.arc(m + 2, n + 5, 2.2, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 'pitchwell': {
      ctx.fillStyle = '#4A4458'
      roundRect(ctx, x + 7, y + 11, TILE - 14, TILE - 16, 5); ctx.fill()
      ctx.strokeStyle = '#8E7CC3'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x + 9, y + 11); ctx.lineTo(m, y + 4); ctx.lineTo(x + TILE - 9, y + 11); ctx.stroke()
      ctx.fillStyle = '#1E1A29'
      ctx.beginPath(); ctx.ellipse(m, n + 4, 7, 4, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = `rgba(142,124,195,${0.35 + Math.sin(clock * 3 + r) * 0.15})`
      ctx.beginPath(); ctx.ellipse(m, n + 4, 4, 2.2, 0, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 'caravan': {
      ctx.fillStyle = '#7A6547'
      roundRect(ctx, x + 5, y + 14, TILE - 10, TILE - 19, 3); ctx.fill()
      ctx.fillStyle = '#D8C9A8'
      ctx.beginPath(); ctx.moveTo(x + 4, y + 15); ctx.lineTo(m, y + 5); ctx.lineTo(x + TILE - 4, y + 15); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#B8A382'
      ctx.beginPath(); ctx.moveTo(m, y + 5); ctx.lineTo(x + TILE - 4, y + 15); ctx.lineTo(m, y + 15); ctx.closePath(); ctx.fill()
      ctx.fillStyle = GOLD
      ctx.beginPath(); ctx.arc(m, n + 7, 2.6, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 'merc': {
      ctx.fillStyle = '#3F3A33'
      ctx.beginPath(); ctx.moveTo(x + 5, y + TILE - 7); ctx.lineTo(m, y + 8); ctx.lineTo(x + TILE - 5, y + TILE - 7); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#2A2620'
      ctx.beginPath(); ctx.moveTo(m, y + 8); ctx.lineTo(x + TILE - 5, y + TILE - 7); ctx.lineTo(m, y + TILE - 7); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#3ECF8E'
      ctx.beginPath(); ctx.arc(m, y + 7, 2.4, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 'pitch': {
      ctx.fillStyle = '#221C2E'
      ctx.beginPath(); ctx.ellipse(m, n, TILE * 0.36, TILE * 0.27, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(142,124,195,.30)'
      ctx.beginPath(); ctx.ellipse(m - 3, n - 3, TILE * 0.16, TILE * 0.1, 0, 0, Math.PI * 2); ctx.fill()
      if (burn > 0) {
        for (let i = 0; i < 5; i++) {
          const a = clock * 7 + i * 1.3
          ctx.fillStyle = i % 2 ? 'rgba(255,150,40,.85)' : 'rgba(255,215,120,.8)'
          ctx.beginPath()
          ctx.arc(m + Math.sin(a) * 7, n - 3 + Math.cos(a * 1.7) * 4, 4 - i * 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }
    case 'spikes': {
      ctx.strokeStyle = '#9FB4C7'; ctx.lineWidth = 2; ctx.lineCap = 'round'
      for (const [ox, oy] of [[10, 26], [20, 22], [30, 27], [15, 16], [26, 15]]) {
        ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + ox + 3, y + oy - 8); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x + ox + 6, y + oy); ctx.lineTo(x + ox + 3, y + oy - 8); ctx.stroke()
      }
      break
    }
  }

  if (pct < 0.999) {
    ctx.fillStyle = `rgba(20,10,4,${(1 - pct) * 0.42})`
    roundRect(ctx, x + 2, y + 2, TILE - 4, TILE - 4, 5); ctx.fill()
    ctx.fillStyle = 'rgba(11,10,8,.65)'
    roundRect(ctx, x + 7, y + TILE - 6, TILE - 14, 3.4, 2); ctx.fill()
    ctx.fillStyle = pct > 0.5 ? '#3ECF8E' : pct > 0.25 ? GOLD : '#E24B4A'
    roundRect(ctx, x + 7, y + TILE - 6, (TILE - 14) * pct, 3.4, 2); ctx.fill()
  }
}

// ── foes ───────────────────────────────────────────────────────────────────
function drawFoe(ctx: CanvasRenderingContext2D, f: Foe, clock: number) {
  const spec = FOES[f.kind]
  const bob = Math.sin(clock * 9 + f.id) * 1.1

  shadow(ctx, f.x, f.y + spec.r * 0.95, spec.r * 0.9, spec.r * 0.38)

  if (f.slow > 0) {
    ctx.strokeStyle = 'rgba(159,180,199,.6)'
    ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.arc(f.x, f.y, spec.r + 4, 0, Math.PI * 2); ctx.stroke()
  }

  ctx.fillStyle = f.hitFlash > 0 ? '#FFFFFF' : spec.body
  ctx.beginPath(); ctx.arc(f.x, f.y + bob, spec.r, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(16,10,4,.55)'; ctx.lineWidth = 1.4; ctx.stroke()

  ctx.fillStyle = spec.trim
  ctx.beginPath()
  ctx.arc(f.x, f.y + bob, spec.r, Math.PI * 0.15, Math.PI * 0.85)
  ctx.closePath(); ctx.fill()

  ctx.lineWidth = 1.6; ctx.lineCap = 'round'
  if (f.kind === 'bow') {
    ctx.strokeStyle = '#6B4E2E'
    ctx.beginPath(); ctx.arc(f.x + spec.r + 2, f.y + bob, 5, -1.2, 1.2); ctx.stroke()
  } else if (f.kind === 'knight') {
    ctx.strokeStyle = '#E8E2D6'
    ctx.beginPath(); ctx.moveTo(f.x + spec.r - 1, f.y + bob - 8); ctx.lineTo(f.x + spec.r + 5, f.y + bob + 4); ctx.stroke()
  } else if (f.kind === 'shield') {
    ctx.fillStyle = '#2E5B7A'
    roundRect(ctx, f.x - spec.r - 5, f.y + bob - 7, 6, 14, 2); ctx.fill()
    ctx.strokeStyle = '#9FB4C7'; ctx.lineWidth = 1
    roundRect(ctx, f.x - spec.r - 5, f.y + bob - 7, 6, 14, 2); ctx.stroke()
  } else if (f.kind === 'assassin') {
    ctx.strokeStyle = '#C9B7F0'
    ctx.beginPath(); ctx.moveTo(f.x - 4, f.y + bob - 7); ctx.lineTo(f.x + 5, f.y + bob + 2); ctx.stroke()
  } else if (f.kind === 'catapult') {
    ctx.fillStyle = '#3E2E1C'
    ctx.fillRect(f.x - spec.r, f.y + bob + 3, spec.r * 2, 4)
    ctx.strokeStyle = '#8A6E44'; ctx.lineWidth = 2.2
    ctx.beginPath(); ctx.moveTo(f.x - 4, f.y + bob + 3); ctx.lineTo(f.x + 6, f.y + bob - 8); ctx.stroke()
  }

  if (f.burn > 0) {
    ctx.fillStyle = `rgba(255,150,40,${0.4 + Math.sin(clock * 14 + f.id) * 0.25})`
    ctx.beginPath(); ctx.arc(f.x, f.y + bob - spec.r, 4, 0, Math.PI * 2); ctx.fill()
  }

  const pct = f.hp / f.maxHp
  if (pct < 0.995) {
    const w = spec.r * 2.2
    ctx.fillStyle = 'rgba(11,10,8,.7)'
    roundRect(ctx, f.x - w / 2, f.y - spec.r - 8, w, 3.2, 1.6); ctx.fill()
    ctx.fillStyle = pct > 0.5 ? '#3ECF8E' : pct > 0.25 ? GOLD : '#E24B4A'
    roundRect(ctx, f.x - w / 2, f.y - spec.r - 8, w * pct, 3.2, 1.6); ctx.fill()
  }
}
