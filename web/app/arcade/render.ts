// Canvas painter for «قلعهٔ خان». Reads Game, writes pixels — no mutation.
import {
  COLS, ROWS, TILE, W, H, idx, KEEP_CELLS, FOES,
  type Game, type TileKind,
} from './engine'

const SAND_A = '#7A6039'
const SAND_B = '#6E5632'
const GRID    = 'rgba(0,0,0,.16)'
const STONE   = '#9A9186'
const STONE_D = '#6F675E'
const GOLD    = '#F5A623'

const cxp = (c: number) => c * TILE + TILE / 2
const cyp = (r: number) => r * TILE + TILE / 2

export function draw(ctx: CanvasRenderingContext2D, g: Game, selected: TileKind | null, hoverCell: [number, number] | null) {
  ctx.clearRect(0, 0, W, H)

  // ── desert floor ──
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (c + r) % 2 === 0 ? SAND_A : SAND_B
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE)
    }
  }
  // dune banding, purely decorative
  ctx.fillStyle = 'rgba(255,225,170,.045)'
  for (let r = 1; r < ROWS; r += 3) ctx.fillRect(0, r * TILE + 6, W, 3)

  ctx.strokeStyle = GRID
  ctx.lineWidth = 1
  for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c * TILE + .5, 0); ctx.lineTo(c * TILE + .5, H); ctx.stroke() }
  for (let r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * TILE + .5); ctx.lineTo(W, r * TILE + .5); ctx.stroke() }

  // spawn edge marker
  ctx.fillStyle = 'rgba(192,57,43,.22)'
  ctx.fillRect(0, 0, W, TILE)
  ctx.strokeStyle = 'rgba(192,57,43,.5)'
  ctx.beginPath(); ctx.moveTo(0, TILE + .5); ctx.lineTo(W, TILE + .5); ctx.stroke()

  // ── placement hint ──
  if (selected && hoverCell) {
    const [hc, hr] = hoverCell
    const ok = hr !== 0 && g.tiles[idx(hc, hr)].kind === 'sand'
    ctx.fillStyle = ok ? 'rgba(245,166,35,.26)' : 'rgba(192,57,43,.26)'
    ctx.fillRect(hc * TILE, hr * TILE, TILE, TILE)
  }

  // ── tiles ──
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = g.tiles[idx(c, r)]
      if (t.kind === 'sand' || t.kind === 'keep') continue
      drawBuilding(ctx, c, r, t.kind, t.hp / (t.maxHp || 1), t.burn)
    }
  }

  drawKeep(ctx, g)

  // ── shots ──
  for (const s of g.shots) {
    const a = 1 - s.t / s.life
    ctx.globalAlpha = a
    ctx.strokeStyle = s.kind === 'rock' ? '#4A3826' : '#F0E4C8'
    ctx.lineWidth = s.kind === 'rock' ? 4 : 2
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.tx, s.ty); ctx.stroke()
    ctx.globalAlpha = 1
  }

  for (const a of g.allies) drawAlly(ctx, a.x, a.y, a.hp / a.maxHp)
  for (const f of g.foes) drawFoe(ctx, f.x, f.y, f.kind, f.hp / f.maxHp, f.hitFlash > 0, f.burn > 0)
}

function drawKeep(ctx: CanvasRenderingContext2D, g: Game) {
  const xs = KEEP_CELLS.map(([c]) => c), ys = KEEP_CELLS.map(([, r]) => r)
  const x = Math.min(...xs) * TILE, y = Math.min(...ys) * TILE
  const w = (Math.max(...xs) - Math.min(...xs) + 1) * TILE
  const h = (Math.max(...ys) - Math.min(...ys) + 1) * TILE

  ctx.fillStyle = STONE_D
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6)
  ctx.fillStyle = STONE
  ctx.fillRect(x + 6, y + 8, w - 12, h - 14)

  // crenellations
  ctx.fillStyle = STONE
  for (let i = 0; i < 5; i++) ctx.fillRect(x + 6 + i * ((w - 12) / 5), y + 2, (w - 12) / 9, 8)

  // corner turrets
  ctx.fillStyle = STONE_D
  for (const [tx, ty] of [[x + 4, y + 6], [x + w - 14, y + 6]]) ctx.fillRect(tx, ty, 10, h - 16)

  // banner
  ctx.fillStyle = GOLD
  ctx.fillRect(x + w / 2 - 1, y - 12, 2, 16)
  ctx.beginPath(); ctx.moveTo(x + w / 2 + 1, y - 12); ctx.lineTo(x + w / 2 + 15, y - 8); ctx.lineTo(x + w / 2 + 1, y - 3); ctx.closePath(); ctx.fill()

  // health bar under the keep
  const p = Math.max(0, g.keepHp / g.keepMaxHp)
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x + 6, y + h - 9, w - 12, 5)
  ctx.fillStyle = p > .5 ? '#3FBE86' : p > .25 ? GOLD : '#FF5A4E'
  ctx.fillRect(x + 6, y + h - 9, (w - 12) * p, 5)
}

function drawBuilding(ctx: CanvasRenderingContext2D, c: number, r: number, kind: TileKind, hpFrac: number, burn: number) {
  const x = c * TILE, y = r * TILE
  const pad = 4
  const s = TILE - pad * 2

  switch (kind) {
    case 'wall':
      ctx.fillStyle = STONE_D; ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4)
      ctx.fillStyle = STONE
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        ctx.fillRect(x + 5 + i * 11 + (j % 2 ? 4 : 0), y + 6 + j * 14, 9, 11)
      }
      break

    case 'tower': {
      ctx.fillStyle = STONE_D; ctx.fillRect(x + pad, y + pad, s, s)
      ctx.fillStyle = STONE; ctx.fillRect(x + pad + 3, y + pad + 5, s - 6, s - 8)
      ctx.fillStyle = STONE_D
      for (let i = 0; i < 3; i++) ctx.fillRect(x + pad + 2 + i * 10, y + pad, 6, 6)
      ctx.fillStyle = GOLD; ctx.fillRect(x + TILE / 2 - 1, y + 8, 2, 10)
      ctx.beginPath(); ctx.arc(x + TILE / 2, y + TILE / 2 + 4, 3.5, 0, Math.PI * 2); ctx.fill()
      break
    }

    case 'palm':
      ctx.fillStyle = '#5B4526'; ctx.fillRect(x + TILE / 2 - 2, y + 16, 4, 16)
      ctx.fillStyle = '#7FB069'
      for (const a of [-0.9, -0.3, 0.3, 0.9]) {
        ctx.beginPath()
        ctx.ellipse(x + TILE / 2 + Math.sin(a) * 9, y + 15 - Math.cos(a) * 4, 9, 4.5, a, 0, Math.PI * 2)
        ctx.fill()
      }
      break

    case 'quarry':
      ctx.fillStyle = '#4E4438'; ctx.fillRect(x + pad, y + pad, s, s)
      ctx.fillStyle = STONE
      ctx.beginPath(); ctx.moveTo(x + 9, y + 27); ctx.lineTo(x + 17, y + 12); ctx.lineTo(x + 25, y + 27); ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.moveTo(x + 20, y + 28); ctx.lineTo(x + 27, y + 17); ctx.lineTo(x + 33, y + 28); ctx.closePath(); ctx.fill()
      break

    case 'forge':
      ctx.fillStyle = '#463A2E'; ctx.fillRect(x + pad, y + pad, s, s)
      ctx.fillStyle = '#2C241C'; ctx.fillRect(x + 11, y + 14, 18, 15)
      ctx.fillStyle = '#FF7A3D'; ctx.fillRect(x + 15, y + 20, 10, 9)
      ctx.fillStyle = '#9FB4C7'; ctx.fillRect(x + 24, y + 8, 5, 9)
      break

    case 'pitchwell':
      ctx.fillStyle = '#4A3F33'; ctx.fillRect(x + pad, y + pad, s, s)
      ctx.fillStyle = '#1B1510'; ctx.beginPath(); ctx.arc(x + TILE / 2, y + TILE / 2 + 2, 8, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#8E7CC3'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x + 12, y + 10); ctx.lineTo(x + TILE / 2, y + 18); ctx.lineTo(x + 28, y + 10); ctx.stroke()
      break

    case 'pitch': {
      ctx.fillStyle = '#241C15'; ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2)
      ctx.fillStyle = 'rgba(142,124,195,.35)'
      ctx.beginPath(); ctx.ellipse(x + TILE / 2, y + TILE / 2, 13, 8, 0, 0, Math.PI * 2); ctx.fill()
      if (burn > 0) {
        const f = Math.min(1, burn / 3.2)
        ctx.fillStyle = `rgba(255,${100 + Math.round(90 * f)},40,${.55 + .35 * f})`
        ctx.beginPath(); ctx.ellipse(x + TILE / 2, y + TILE / 2, 16, 12, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(255,225,120,.85)'
        ctx.beginPath(); ctx.ellipse(x + TILE / 2, y + TILE / 2, 7, 5, 0, 0, Math.PI * 2); ctx.fill()
      }
      return // no hp bar on ditches
    }

    case 'caravan':
      ctx.fillStyle = '#5A4A33'; ctx.fillRect(x + pad, y + pad, s, s)
      ctx.fillStyle = '#C9B489'
      ctx.beginPath(); ctx.moveTo(x + 7, y + 26); ctx.lineTo(x + TILE / 2, y + 9); ctx.lineTo(x + 33, y + 26); ctx.closePath(); ctx.fill()
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(x + TILE / 2, y + 30, 3.5, 0, Math.PI * 2); ctx.fill()
      break

    case 'merc':
      ctx.fillStyle = '#3A3A44'; ctx.fillRect(x + pad, y + pad, s, s)
      ctx.fillStyle = '#22222A'
      ctx.beginPath(); ctx.moveTo(x + 8, y + 28); ctx.lineTo(x + TILE / 2, y + 10); ctx.lineTo(x + 32, y + 28); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = '#C0392B'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x + 14, y + 31); ctx.lineTo(x + 26, y + 31); ctx.stroke()
      break

    default:
      break
  }

  if (hpFrac < 0.999) {
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x + 5, y + TILE - 6, TILE - 10, 3)
    ctx.fillStyle = hpFrac > .5 ? '#3FBE86' : hpFrac > .25 ? GOLD : '#FF5A4E'
    ctx.fillRect(x + 5, y + TILE - 6, (TILE - 10) * hpFrac, 3)
  }
}

function drawFoe(ctx: CanvasRenderingContext2D, x: number, y: number, kind: keyof typeof FOES, hpFrac: number, flash: boolean, burning: boolean) {
  const spec = FOES[kind]
  const r = spec.r

  ctx.fillStyle = 'rgba(0,0,0,.3)'
  ctx.beginPath(); ctx.ellipse(x, y + r * .75, r * .9, r * .4, 0, 0, Math.PI * 2); ctx.fill()

  if (kind === 'catapult') {
    ctx.fillStyle = spec.body; ctx.fillRect(x - r, y - r * .6, r * 2, r * 1.2)
    ctx.strokeStyle = spec.trim; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(x - r * .5, y); ctx.lineTo(x + r * .8, y - r * 1.2); ctx.stroke()
    ctx.fillStyle = '#3E2E1C'
    ctx.beginPath(); ctx.arc(x - r * .6, y + r * .6, 3.5, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x + r * .6, y + r * .6, 3.5, 0, Math.PI * 2); ctx.fill()
  } else {
    ctx.fillStyle = flash ? '#FFFFFF' : spec.body
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    // crusader surcoat cross
    ctx.strokeStyle = spec.trim; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(x, y - r * .7); ctx.lineTo(x, y + r * .7); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x - r * .7, y); ctx.lineTo(x + r * .7, y); ctx.stroke()
    if (kind === 'knight') { ctx.strokeStyle = '#EDEFF2'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, Math.PI * 2); ctx.stroke() }
    if (kind === 'bow') { ctx.strokeStyle = '#7A4B2A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + r * .8, y, r * .8, -1.1, 1.1); ctx.stroke() }
  }

  if (burning) {
    ctx.fillStyle = 'rgba(255,140,40,.75)'
    ctx.beginPath(); ctx.ellipse(x, y - r, r * .7, r * .95, 0, 0, Math.PI * 2); ctx.fill()
  }

  if (hpFrac < 0.999) {
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - r, y - r - 7, r * 2, 3)
    ctx.fillStyle = '#FF5A4E'; ctx.fillRect(x - r, y - r - 7, r * 2 * hpFrac, 3)
  }
}

function drawAlly(ctx: CanvasRenderingContext2D, x: number, y: number, hpFrac: number) {
  ctx.fillStyle = 'rgba(0,0,0,.3)'
  ctx.beginPath(); ctx.ellipse(x, y + 5, 6, 3, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#2F2F38'
  ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#8E7CC3'
  ctx.beginPath(); ctx.arc(x, y - 1, 3, 0, Math.PI * 2); ctx.fill()
  if (hpFrac < 0.999) {
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - 7, y - 13, 14, 3)
    ctx.fillStyle = '#3FBE86'; ctx.fillRect(x - 7, y - 13, 14 * hpFrac, 3)
  }
}

export { cxp, cyp }
