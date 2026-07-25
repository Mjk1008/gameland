// «جنگ‌های صلیبی — قلعهٔ خان» — a small Stronghold-Crusader-flavoured
// castle-defence sim. Pure logic, no React and no DOM: the component owns the
// canvas and just calls step()/draw-data off this state.
//
// Self-contained by design — imports nothing from the rest of the app.

export const COLS = 11
export const ROWS = 12
export const TILE = 40
export const W = COLS * TILE
export const H = ROWS * TILE

// ── tiles ──────────────────────────────────────────────────────────────────

export type BuildKind =
  | 'wall' | 'tower' | 'palm' | 'quarry' | 'forge' | 'pitchwell' | 'pitch' | 'caravan' | 'merc'

export type TileKind = 'sand' | 'keep' | BuildKind

export interface Cost { wood?: number; stone?: number; iron?: number; pitch?: number; gold?: number }

export interface BuildSpec {
  kind: BuildKind
  name: string
  cost: Cost
  hp: number
  /** units of upkeep-free output added every PRODUCE_MS */
  produces?: { res: keyof Res; amount: number }
  desc: string
}

export const BUILDS: BuildSpec[] = [
  { kind: 'wall',      name: 'دیوار',        cost: { stone: 10 },            hp: 220, desc: 'مسیر دشمن را می‌بندد' },
  { kind: 'tower',     name: 'برج کماندار',  cost: { wood: 15, stone: 20 },  hp: 130, desc: 'از راه دور تیر می‌زند' },
  { kind: 'palm',      name: 'نخلستان',      cost: { wood: 10 },             hp: 80,  produces: { res: 'wood',  amount: 6 }, desc: 'چوب تولید می‌کند' },
  { kind: 'quarry',    name: 'معدن سنگ',     cost: { wood: 20 },             hp: 80,  produces: { res: 'stone', amount: 5 }, desc: 'سنگ تولید می‌کند' },
  { kind: 'forge',     name: 'کورهٔ آهن',    cost: { wood: 25, stone: 15 },  hp: 80,  produces: { res: 'iron',  amount: 3 }, desc: 'آهن تولید می‌کند' },
  { kind: 'pitchwell', name: 'چاه قیر',      cost: { wood: 20, iron: 10 },   hp: 80,  produces: { res: 'pitch', amount: 3 }, desc: 'قیر تولید می‌کند' },
  { kind: 'pitch',     name: 'گودال قیر',    cost: { pitch: 10 },            hp: 40,  desc: 'دشمن رویش برود، آتشش بزن' },
  { kind: 'caravan',   name: 'کاروان‌سرا',   cost: { wood: 30, stone: 20 },  hp: 80,  produces: { res: 'gold',  amount: 5 }, desc: 'طلا تولید می‌کند' },
  { kind: 'merc',      name: 'اردوگاه مزدور',cost: { gold: 40, wood: 15 },   hp: 90,  desc: 'آدمکش می‌فرستد' },
]

export const BUILD_BY_KIND: Record<BuildKind, BuildSpec> =
  Object.fromEntries(BUILDS.map(b => [b.kind, b])) as Record<BuildKind, BuildSpec>

/** Enemies can walk over these; everything else has to be broken through. */
const WALKABLE = new Set<TileKind>(['sand', 'pitch'])

export interface Tile { kind: TileKind; hp: number; maxHp: number; cd: number; burn: number }

// ── resources ──────────────────────────────────────────────────────────────

export interface Res { wood: number; stone: number; iron: number; pitch: number; gold: number }

export const RES_META: { key: keyof Res; label: string; glyph: string; color: string }[] = [
  { key: 'wood',  label: 'چوب', glyph: '🌴', color: '#7FB069' },
  { key: 'stone', label: 'سنگ', glyph: '🪨', color: '#B9AFA1' },
  { key: 'iron',  label: 'آهن', glyph: '⛓',  color: '#9FB4C7' },
  { key: 'pitch', label: 'قیر', glyph: '🛢', color: '#8E7CC3' },
  { key: 'gold',  label: 'طلا', glyph: '🪙', color: '#F5A623' },
]

// ── units ──────────────────────────────────────────────────────────────────

export type FoeKind = 'foot' | 'bow' | 'knight' | 'catapult'

interface FoeSpec {
  name: string
  hp: number
  /** tiles per second */
  speed: number
  dps: number
  /** attack range in tiles; <=1 means melee against the blocking tile */
  range: number
  r: number
  body: string
  trim: string
}

export const FOES: Record<FoeKind, FoeSpec> = {
  foot:     { name: 'پیاده‌نظام', hp: 70,  speed: 0.95, dps: 9,  range: 1,   r: 7,  body: '#DED7CB', trim: '#C0392B' },
  bow:      { name: 'کمانْدار',   hp: 55,  speed: 0.9,  dps: 7,  range: 2.6, r: 7,  body: '#C9B489', trim: '#7A4B2A' },
  knight:   { name: 'شوالیه',     hp: 180, speed: 1.35, dps: 15, range: 1,   r: 9,  body: '#AEB6BF', trim: '#C0392B' },
  catapult: { name: 'منجنیق',     hp: 140, speed: 0.45, dps: 34, range: 3.4, r: 11, body: '#6E5231', trim: '#3E2E1C' },
}

export interface Foe {
  id: number
  kind: FoeKind
  x: number; y: number     // pixel centre
  hp: number; maxHp: number
  burn: number             // seconds of remaining fire
  hitFlash: number
}

export interface Ally {
  id: number
  x: number; y: number
  hp: number; maxHp: number
  cd: number
}

export interface Shot { x: number; y: number; tx: number; ty: number; t: number; life: number; kind: 'arrow' | 'rock' }

// ── waves ──────────────────────────────────────────────────────────────────

export const TOTAL_WAVES = 10

/** Deterministic roster per wave — readable and tunable. */
export function waveRoster(w: number): FoeKind[] {
  const out: FoeKind[] = []
  const push = (k: FoeKind, n: number) => { for (let i = 0; i < n; i++) out.push(k) }
  push('foot', 3 + Math.floor(w * 1.6))
  if (w >= 2) push('bow', Math.floor((w - 1) * 0.9))
  if (w >= 4) push('knight', Math.floor((w - 3) * 0.8) + 1)
  if (w >= 6) push('catapult', Math.floor((w - 5) / 2) + 1)
  return out
}

// ── state ──────────────────────────────────────────────────────────────────

export type Phase = 'build' | 'battle' | 'won' | 'lost'

export interface Game {
  tiles: Tile[]
  res: Res
  wave: number
  phase: Phase
  /** seconds left of the build window */
  buildLeft: number
  keepHp: number
  keepMaxHp: number
  foes: Foe[]
  allies: Ally[]
  shots: Shot[]
  /** queue of foes still to walk on this wave, with a spawn delay each */
  spawnQueue: { kind: FoeKind; at: number }[]
  clock: number
  fireCd: number
  produceAcc: number
  nextId: number
  /** transient log line for the HUD */
  flash: { text: string; t: number } | null
}

export const BUILD_SECONDS = 25
const PRODUCE_MS = 4
export const FIRE_COOLDOWN = 14
const KEEP_HP = 1200

export const KEEP_CELLS: [number, number][] = [[5, 10], [6, 10], [5, 11], [6, 11]]

export const idx = (c: number, r: number) => r * COLS + c
export const inBounds = (c: number, r: number) => c >= 0 && c < COLS && r >= 0 && r < ROWS

export function newGame(): Game {
  const tiles: Tile[] = Array.from({ length: COLS * ROWS }, () => ({
    kind: 'sand' as TileKind, hp: 0, maxHp: 0, cd: 0, burn: 0,
  }))
  for (const [c, r] of KEEP_CELLS) tiles[idx(c, r)] = { kind: 'keep', hp: KEEP_HP, maxHp: KEEP_HP, cd: 0, burn: 0 }

  return {
    tiles,
    res: { wood: 70, stone: 70, iron: 0, pitch: 0, gold: 0 },
    wave: 0,
    phase: 'build',
    buildLeft: BUILD_SECONDS,
    keepHp: KEEP_HP,
    keepMaxHp: KEEP_HP,
    foes: [], allies: [], shots: [],
    spawnQueue: [],
    clock: 0,
    fireCd: 0,
    produceAcc: 0,
    nextId: 1,
    flash: null,
  }
}

// ── economy ────────────────────────────────────────────────────────────────

export function canAfford(res: Res, cost: Cost): boolean {
  return (Object.keys(cost) as (keyof Res)[]).every(k => res[k] >= (cost[k] ?? 0))
}

function pay(res: Res, cost: Cost) {
  for (const k of Object.keys(cost) as (keyof Res)[]) res[k] -= cost[k] ?? 0
}

export function missingFor(res: Res, cost: Cost): string {
  const short = (Object.keys(cost) as (keyof Res)[])
    .filter(k => res[k] < (cost[k] ?? 0))
    .map(k => RES_META.find(m => m.key === k)!.label)
  return short.length ? `${short.join(' و ')} کم داری` : ''
}

/** Placement rules: only bare sand, and never on the two rows foes spawn into. */
export function canPlace(g: Game, c: number, r: number): boolean {
  if (!inBounds(c, r)) return false
  if (r === 0) return false
  return g.tiles[idx(c, r)].kind === 'sand'
}

export function place(g: Game, c: number, r: number, kind: BuildKind): boolean {
  const spec = BUILD_BY_KIND[kind]
  if (!canPlace(g, c, r)) { flash(g, 'اینجا نمی‌شود ساخت'); return false }
  if (!canAfford(g.res, spec.cost)) { flash(g, missingFor(g.res, spec.cost)); return false }
  pay(g.res, spec.cost)
  g.tiles[idx(c, r)] = { kind, hp: spec.hp, maxHp: spec.hp, cd: 0, burn: 0 }
  return true
}

export function demolish(g: Game, c: number, r: number): boolean {
  if (!inBounds(c, r)) return false
  const t = g.tiles[idx(c, r)]
  if (t.kind === 'sand' || t.kind === 'keep') return false
  g.tiles[idx(c, r)] = { kind: 'sand', hp: 0, maxHp: 0, cd: 0, burn: 0 }
  return true
}

export function flash(g: Game, text: string) { g.flash = { text, t: 2.2 } }

// ── pathing ────────────────────────────────────────────────────────────────
//
// Dijkstra out from the keep. Buildings stay traversable but at a stiff cost,
// so foes prefer an open lane and otherwise chew through the cheapest wall —
// which is what makes walling off a side actually mean something.

const BLOCK_COST = 9

export function computeField(g: Game): Float32Array {
  const dist = new Float32Array(COLS * ROWS).fill(Infinity)
  const queue: number[] = []
  for (const [c, r] of KEEP_CELLS) { dist[idx(c, r)] = 0; queue.push(idx(c, r)) }

  // Small grid (132 cells) — a plain queue with re-relaxation is plenty.
  while (queue.length) {
    const cur = queue.shift()!
    const cc = cur % COLS, cr = (cur / COLS) | 0
    const d = dist[cur]
    const around: [number, number][] = [[cc + 1, cr], [cc - 1, cr], [cc, cr + 1], [cc, cr - 1]]
    for (const [nc, nr] of around) {
      if (!inBounds(nc, nr)) continue
      const ni = idx(nc, nr)
      const k = g.tiles[ni].kind
      if (k === 'keep') continue
      const step = WALKABLE.has(k) ? 1 : BLOCK_COST
      if (d + step < dist[ni] - 1e-6) { dist[ni] = d + step; queue.push(ni) }
    }
  }
  return dist
}

/** Neighbour with the lowest field value — the direction a foe wants to go. */
function bestStep(g: Game, field: Float32Array, c: number, r: number): [number, number] | null {
  let best: [number, number] | null = null
  let bestD = field[idx(c, r)]
  const around: [number, number][] = [[c, r + 1], [c + 1, r], [c - 1, r], [c, r - 1]]
  for (const [nc, nr] of around) {
    if (!inBounds(nc, nr)) continue
    const d = field[idx(nc, nr)]
    if (d < bestD - 1e-6) { bestD = d; best = [nc, nr] }
  }
  return best
}

// ── damage helpers ─────────────────────────────────────────────────────────

const cx = (c: number) => c * TILE + TILE / 2
const cy = (r: number) => r * TILE + TILE / 2

function hurtTile(g: Game, c: number, r: number, dmg: number) {
  const t = g.tiles[idx(c, r)]
  if (t.kind === 'sand') return
  if (t.kind === 'keep') {
    g.keepHp = Math.max(0, g.keepHp - dmg)
    for (const [kc, kr] of KEEP_CELLS) g.tiles[idx(kc, kr)].hp = g.keepHp
    if (g.keepHp <= 0) g.phase = 'lost'
    return
  }
  t.hp -= dmg
  if (t.hp <= 0) g.tiles[idx(c, r)] = { kind: 'sand', hp: 0, maxHp: 0, cd: 0, burn: 0 }
}

function nearestFoe(g: Game, x: number, y: number, maxPx: number): Foe | null {
  let best: Foe | null = null, bestD = maxPx * maxPx
  for (const f of g.foes) {
    const d = (f.x - x) ** 2 + (f.y - y) ** 2
    if (d < bestD) { bestD = d; best = f }
  }
  return best
}

// ── the fire button ────────────────────────────────────────────────────────

/** Ignite every pitch tile that currently has a foe standing on it. */
export function ignitePitch(g: Game): boolean {
  if (g.fireCd > 0) { flash(g, 'مشعل هنوز آماده نیست'); return false }
  let lit = 0
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const t = g.tiles[idx(c, r)]
    if (t.kind !== 'pitch' || t.burn > 0) continue
    const hasFoe = g.foes.some(f => ((f.x / TILE) | 0) === c && ((f.y / TILE) | 0) === r)
    if (hasFoe) { t.burn = 3.2; lit++ }
  }
  if (!lit) { flash(g, 'دشمنی روی قیر نیست'); return false }
  g.fireCd = FIRE_COOLDOWN
  flash(g, `${lit} گودال شعله گرفت`)
  return true
}

// ── waves ──────────────────────────────────────────────────────────────────

export function startWave(g: Game) {
  if (g.phase !== 'build') return
  g.wave += 1
  g.phase = 'battle'
  const roster = waveRoster(g.wave)
  let at = 0
  g.spawnQueue = roster.map(kind => {
    at += 0.55 + (kind === 'catapult' ? 1.4 : 0)
    return { kind, at }
  })
  flash(g, `موج ${g.wave} رسید`)
}

function spawnFoe(g: Game, kind: FoeKind) {
  const spec = FOES[kind]
  // Spread arrivals across the top edge, biased toward the keep's columns.
  const lane = 1 + ((g.nextId * 7) % (COLS - 2))
  g.foes.push({
    id: g.nextId++, kind,
    x: cx(lane), y: -TILE * 0.3,
    hp: spec.hp, maxHp: spec.hp, burn: 0, hitFlash: 0,
  })
}

function spawnAllies(g: Game) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (g.tiles[idx(c, r)].kind !== 'merc') continue
    g.allies.push({ id: g.nextId++, x: cx(c), y: cy(r), hp: 70, maxHp: 70, cd: 0 })
  }
}

// ── main step ──────────────────────────────────────────────────────────────

export function step(g: Game, dt: number) {
  if (g.phase === 'won' || g.phase === 'lost') return
  g.clock += dt
  if (g.flash) { g.flash.t -= dt; if (g.flash.t <= 0) g.flash = null }
  if (g.fireCd > 0) g.fireCd = Math.max(0, g.fireCd - dt)

  // production
  g.produceAcc += dt
  while (g.produceAcc >= PRODUCE_MS) {
    g.produceAcc -= PRODUCE_MS
    for (const t of g.tiles) {
      const spec = t.kind !== 'sand' && t.kind !== 'keep' ? BUILD_BY_KIND[t.kind as BuildKind] : null
      if (spec?.produces) g.res[spec.produces.res] += spec.produces.amount
    }
  }

  if (g.phase === 'build') {
    g.buildLeft -= dt
    if (g.buildLeft <= 0) startWave(g)
    return
  }

  // spawn schedule — each entry counts its own delay down
  for (let i = g.spawnQueue.length - 1; i >= 0; i--) {
    g.spawnQueue[i].at -= dt
    if (g.spawnQueue[i].at <= 0) { spawnFoe(g, g.spawnQueue[i].kind); g.spawnQueue.splice(i, 1) }
  }
  if (g.allies.length === 0 && g.foes.length > 0) spawnAllies(g)

  const field = computeField(g)

  // burning pitch
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const t = g.tiles[idx(c, r)]
    if (t.burn <= 0) continue
    t.burn -= dt
    for (const f of g.foes) {
      if (((f.x / TILE) | 0) === c && ((f.y / TILE) | 0) === r) f.burn = Math.max(f.burn, 0.9)
    }
    if (t.burn <= 0 && t.kind === 'pitch') g.tiles[idx(c, r)] = { kind: 'sand', hp: 0, maxHp: 0, cd: 0, burn: 0 }
  }

  // towers
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const t = g.tiles[idx(c, r)]
    if (t.kind !== 'tower') continue
    t.cd -= dt
    if (t.cd > 0) continue
    const target = nearestFoe(g, cx(c), cy(r), TILE * 3.2)
    if (!target) continue
    t.cd = 0.85
    target.hp -= 16
    target.hitFlash = 0.12
    g.shots.push({ x: cx(c), y: cy(r), tx: target.x, ty: target.y, t: 0, life: 0.16, kind: 'arrow' })
  }

  // foes
  for (const f of g.foes) {
    const spec = FOES[f.kind]
    if (f.hitFlash > 0) f.hitFlash -= dt
    if (f.burn > 0) { f.burn -= dt; f.hp -= 38 * dt }

    const c = Math.min(COLS - 1, Math.max(0, (f.x / TILE) | 0))
    const r = Math.min(ROWS - 1, Math.max(0, (f.y / TILE) | 0))

    // Ranged foes stop and shell the nearest structure in range.
    if (spec.range > 1) {
      const t = structureInRange(g, f.x, f.y, spec.range * TILE)
      if (t) {
        hurtTile(g, t[0], t[1], spec.dps * dt)
        if (Math.random() < dt * 1.6) g.shots.push({ x: f.x, y: f.y, tx: cx(t[0]), ty: cy(t[1]), t: 0, life: 0.2, kind: f.kind === 'catapult' ? 'rock' : 'arrow' })
        continue
      }
    }

    const nxt = bestStep(g, field, c, r)
    if (!nxt) continue
    const [nc, nr] = nxt
    const blocking = g.tiles[idx(nc, nr)]
    const solid = !WALKABLE.has(blocking.kind)
    if (solid) { hurtTile(g, nc, nr, spec.dps * dt); continue }

    const tx = cx(nc), ty = cy(nr)
    const dx = tx - f.x, dy = ty - f.y
    const len = Math.hypot(dx, dy) || 1
    const move = spec.speed * TILE * dt
    f.x += (dx / len) * move
    f.y += (dy / len) * move
  }

  // allies
  for (const a of g.allies) {
    a.cd -= dt
    const t = nearestFoe(g, a.x, a.y, TILE * 9)
    if (!t) continue
    const dx = t.x - a.x, dy = t.y - a.y
    const len = Math.hypot(dx, dy) || 1
    if (len > TILE * 0.6) {
      a.x += (dx / len) * 1.4 * TILE * dt
      a.y += (dy / len) * 1.4 * TILE * dt
    } else {
      t.hp -= 13 * dt
      t.hitFlash = 0.1
      a.hp -= FOES[t.kind].dps * 0.5 * dt
    }
  }
  g.allies = g.allies.filter(a => a.hp > 0)

  // shots decay
  for (const s of g.shots) s.t += dt
  g.shots = g.shots.filter(s => s.t < s.life)

  // deaths + payout
  const before = g.foes.length
  g.foes = g.foes.filter(f => f.hp > 0)
  const killed = before - g.foes.length
  if (killed > 0) g.res.gold += killed * 2

  // wave resolution
  if (g.phase === 'battle' && g.spawnQueue.length === 0 && g.foes.length === 0) {
    if (g.wave >= TOTAL_WAVES) { g.phase = 'won'; return }
    g.phase = 'build'
    g.buildLeft = BUILD_SECONDS
    g.allies = []
    g.res.gold += 25
    flash(g, `موج ${g.wave} دفع شد — ۲۵ طلا غنیمت`)
  }
}

/** Nearest player structure within range — what bows and catapults shell. */
function structureInRange(g: Game, x: number, y: number, maxPx: number): [number, number] | null {
  let best: [number, number] | null = null
  let bestD = maxPx * maxPx
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const k = g.tiles[idx(c, r)].kind
    if (k === 'sand' || k === 'pitch') continue
    const d = (cx(c) - x) ** 2 + (cy(r) - y) ** 2
    if (d < bestD) { bestD = d; best = [c, r] }
  }
  return best
}
