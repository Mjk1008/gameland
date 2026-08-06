// Dev/local demo data for Play Arena — simulates ~1 month post-launch.
// Force re-seed: ARENA_SEED=force  or  POST /api/arena/seed

import { PLAYERS, type Disc } from './mock-data'
import { IRAN_GEO } from './iran-geo'
import { isArenaEnabled } from './arena-enabled'
import { persist } from './db/persistence'
import {
  createUser, getUserByTag, getUserByPhone, updateUser,
  createGamenet, allGamenets, verifyGamenet, getSetting, setSetting,
} from './store'
import {
  seedPlayRequestRaw, seedPlayMatchRaw, clearAllArenaData,
  listOpenRequests, arenaMonthStats, type ArenaMonthStats,
  type PlayRequest, type PlayMatch,
} from './arena'
import { ARENA_REQUEST_TTL_HOURS, ARENA_CONFIRM_WINDOW_HOURS } from './arena-config'

const SEED_VERSION = 'v2-month'
const DAY = 86400000
const HOUR = 3600000
const DISCS: Disc[] = ['fc26', 'pes21', 'efootball', 'ufc6', 'nba2k26']
const BEST_OF: (1 | 3 | 5)[] = [1, 3, 5]

export type ArenaSeedResult =
  | { ok: true; stats: ArenaMonthStats; message: string }
  | { ok: false; message: string }

function provinceOf(city: string): string {
  for (const p of IRAN_GEO) if (p.cities.includes(city)) return p.province
  return 'تهران'
}

function ensureGamer(tag: string, phone: string, city?: string, disc?: Disc): string {
  let u = getUserByTag(tag)
  const p = PLAYERS.find(x => x.tag.toLowerCase() === tag.toLowerCase())
  const resolvedCity = city ?? p?.city ?? 'تهران'
  const resolvedDisc = disc ?? p?.disc ?? 'fc26'
  const prov = provinceOf(resolvedCity)
  if (!u) {
    u = createUser({
      phone,
      name: p?.name ?? tag,
      tag,
      city: resolvedCity,
      province: prov,
      primaryDisc: resolvedDisc,
      discs: [resolvedDisc],
      role: 'gamer',
    })
  } else {
    updateUser(u.id, {
      city: resolvedCity,
      province: prov,
      primaryDisc: resolvedDisc,
      discs: [resolvedDisc],
      name: p?.name ?? u.name,
    })
  }
  return u.id
}

function ensureVerifiedGamenet(ownerId: string, name: string, province: string, city: string) {
  const existing = allGamenets().find(g => g.name === name)
  if (existing) {
    if (existing.status !== 'verified') verifyGamenet(existing.id, true)
    return existing
  }
  const g = createGamenet({
    ownerId,
    name,
    province,
    city,
    address: `${city}، خیابان گیم‌لند، پلاک ۱۲`,
    consoles: [{ kind: 'ps5', count: 8 }, { kind: 'pc', count: 4 }],
    disciplines: ['fc26', 'efootball', 'pes21'],
    games: [],
    features: [],
  })
  verifyGamenet(g.id, true)
  return g
}

function cityPool(): { city: string; province: string }[] {
  const out: { city: string; province: string }[] = []
  for (const p of IRAN_GEO) {
    out.push({ city: p.cities[0], province: p.province })
    if (p.cities[1]) out.push({ city: p.cities[1], province: p.province })
  }
  return out
}

function pickDisc(i: number): Disc { return DISCS[i % DISCS.length] }
function pickBestOf(i: number): 1 | 3 | 5 { return BEST_OF[i % BEST_OF.length] }

function seedArenaTrackEvents(userIds: string[]) {
  persist.track.deleteByIdPrefix('demo_tr_')
  const funnel: [string, number][] = [
    ['arena_tab_open', 518],
    ['arena_feed_view', 376],
    ['arena_request_create', 162],
    ['arena_request_accept', 94],
    ['arena_pair_confirm', 71],
    ['arena_book_complete', 52],
    ['arena_result_confirm', 44],
    ['arena_points_awarded', 38],
  ]
  const rows: { id: string; userId?: string; sessionId: string; name: string; path: string; props: string }[] = []
  let sess = 0
  for (const [name, count] of funnel) {
    for (let i = 0; i < count; i++) {
      rows.push({
        id: `demo_tr_${name}_${i}`,
        userId: userIds[i % userIds.length],
        sessionId: `demo_sess_${sess++}`,
        name,
        path: '/arena',
        props: '{}',
      })
    }
  }
  persist.track.insertMany(rows)
}

export async function seedArenaDemo(force = false): Promise<ArenaSeedResult> {
  if (!isArenaEnabled()) return { ok: false, message: 'ARENA_ENABLED=false' }
  if (process.env.NODE_ENV === 'production' && process.env.ARENA_SEED !== 'true' && !force) {
    return { ok: false, message: 'production seed blocked' }
  }
  if (process.env.ARENA_SEED === 'false' && !force) return { ok: false, message: 'ARENA_SEED=false' }

  if (!force && getSetting('arena_demo_seeded') === SEED_VERSION && listOpenRequests({}).length >= 20) {
    return { ok: true, stats: arenaMonthStats(), message: 'already seeded (1 month demo)' }
  }

  if (force) {
    clearAllArenaData()
    await persist.playArena.deleteDemo()
  }

  const now = Date.now()
  const ago = (days: number, hours = 0) => now - days * DAY - hours * HOUR

  const admin = getUserByPhone('09120000000')
  if (admin) {
    updateUser(admin.id, {
      province: 'تهران',
      primaryDisc: 'fc26',
      discs: ['fc26', 'efootball'],
      city: admin.city || 'تهران',
    })
  }

  const ownerId = admin?.id ?? ensureGamer('ZEUS', '09121111111')

  const coreTags = ['ZEUS', 'v1per', 'Phantom', 'RAGE', 'Shadow', 'Falcon', 'Maestro', 'Frost', 'Blaze', 'Vortex', 'Echo', 'Nyx'] as const
  const corePhones = ['09121111111', '09122222222', '09123333333', '09124444444', '09125555555', '09126666666', '09127777777', '09128888888', '09129999999', '09121010101', '09122020202', '09123030303']
  const playerIds = coreTags.map((tag, i) => ensureGamer(tag, corePhones[i]))

  const extraIds: string[] = []
  const extraSpecs: { tag: string; city: string; disc: Disc }[] = [
    { tag: 'Cyclone', city: 'ساری', disc: 'fc26' },
    { tag: 'Dagger', city: 'بندرعباس', disc: 'efootball' },
    { tag: 'Glitch', city: 'اراک', disc: 'pes21' },
    { tag: 'Havoc', city: 'زنجان', disc: 'fc26' },
    { tag: 'Iron', city: 'بجنورد', disc: 'ufc6' },
    { tag: 'Jade', city: 'سنندج', disc: 'pes21' },
    { tag: 'Karma', city: 'بیرجند', disc: 'efootball' },
    { tag: 'Lunar', city: 'یاسوج', disc: 'nba2k26' },
    { tag: 'Myth', city: 'گرگان', disc: 'fc26' },
    { tag: 'Nova', city: 'بوشهر', disc: 'pes21' },
    { tag: 'Onyx', city: 'قزوین', disc: 'fc26' },
    { tag: 'Pulse', city: 'شهرکرد', disc: 'efootball' },
    { tag: 'Quake', city: 'خرم‌آباد', disc: 'ufc6' },
    { tag: 'Rift', city: 'همدان', disc: 'nba2k26' },
    { tag: 'Spark', city: 'اردبیل', disc: 'fc26' },
    { tag: 'Titan', city: 'سمنان', disc: 'pes21' },
    { tag: 'Ultra', city: 'زاهدان', disc: 'efootball' },
    { tag: 'Venom', city: 'ایلام', disc: 'fc26' },
  ]
  extraSpecs.forEach((s, i) => {
    extraIds.push(ensureGamer(s.tag, `09124${String(i).padStart(6, '0')}`, s.city, s.disc))
  })
  const allPlayerIds = [...playerIds, ...extraIds]

  ensureVerifiedGamenet(ownerId, 'گیم‌نت آرتمیس', 'تهران', 'تهران')
  ensureVerifiedGamenet(ownerId, 'گیم‌نت زاگرس', 'فارس', 'شیراز')
  ensureVerifiedGamenet(ownerId, 'گیم‌نت سیمرغ', 'خراسان رضوی', 'مشهد')
  ensureVerifiedGamenet(ownerId, 'گیم‌نت زاینده', 'اصفهان', 'اصفهان')
  ensureVerifiedGamenet(ownerId, 'گیم‌نت اروند', 'خوزستان', 'اهواز')
  ensureVerifiedGamenet(ownerId, 'گیم‌نت باران', 'گیلان', 'رشت')
  ensureVerifiedGamenet(ownerId, 'گیم‌نت خزر', 'مازندران', 'ساری')
  ensureVerifiedGamenet(ownerId, 'گیم‌نت دریا', 'هرمزگان', 'بندرعباس')
  ensureVerifiedGamenet(ownerId, 'گیم‌نت کویر', 'کرمان', 'کرمان')
  ensureVerifiedGamenet(ownerId, 'گیم‌نت آذربایجان', 'آذربایجان شرقی', 'تبریز')

  const cities = cityPool()
  const gamenets = allGamenets().filter(g => g.status === 'verified')
  const gnFor = (city: string, province: string) =>
    gamenets.find(g => g.city === city) ?? gamenets.find(g => g.province === province) ?? gamenets[0]

  let reqIdx = 0
  let matchIdx = 0
  const mkReqId = () => `demo_pr_${String(++reqIdx).padStart(4, '0')}`
  const mkMatchId = () => `demo_pm_${String(++matchIdx).padStart(4, '0')}`

  const seedReq = (partial: Omit<PlayRequest, 'id'> & { id?: string }) => {
    const id = partial.id ?? mkReqId()
    seedPlayRequestRaw({ ...partial, id })
    return id
  }

  const seedMatch = (partial: Omit<PlayMatch, 'id'> & { id?: string }) => {
    const id = partial.id ?? mkMatchId()
    seedPlayMatchRaw({ ...partial, id })
    return id
  }

  // —— Month 1 history: expired requests (~148)
  for (let i = 0; i < 148; i++) {
    const loc = cities[i % cities.length]
    const createdAt = ago(3 + (i % 27), i % 20)
    seedReq({
      userId: allPlayerIds[i % allPlayerIds.length],
      disc: pickDisc(i + 2),
      bestOf: pickBestOf(i),
      city: loc.city,
      province: loc.province,
      note: i % 5 === 0 ? 'Bo3 عصر' : '',
      status: 'expired',
      expiresAt: createdAt + ARENA_REQUEST_TTL_HOURS * HOUR,
      createdAt,
    })
  }

  // —— Cancelled requests (~26)
  for (let i = 0; i < 26; i++) {
    const loc = cities[(i * 3) % cities.length]
    const createdAt = ago(1 + (i % 20), (i * 2) % 18)
    seedReq({
      userId: allPlayerIds[(i + 5) % allPlayerIds.length],
      disc: pickDisc(i + 1),
      bestOf: pickBestOf(i + 1),
      city: loc.city,
      province: loc.province,
      note: '',
      status: 'cancelled',
      expiresAt: createdAt + ARENA_REQUEST_TTL_HOURS * HOUR,
      createdAt,
    })
  }

  // —— Confirmed matches (~38) — the CCR story
  for (let i = 0; i < 38; i++) {
    const requester = allPlayerIds[i % allPlayerIds.length]
    let acceptor = allPlayerIds[(i + 7) % allPlayerIds.length]
    if (acceptor === requester) acceptor = allPlayerIds[(i + 9) % allPlayerIds.length]
    const loc = cities[(i * 5) % cities.length]
    const createdAt = ago(2 + (i % 26), (i * 3) % 22)
    const reqId = seedReq({
      userId: requester,
      disc: pickDisc(i),
      bestOf: pickBestOf(i),
      city: loc.city,
      province: loc.province,
      note: '',
      status: 'matched',
      expiresAt: createdAt + ARENA_REQUEST_TTL_HOURS * HOUR,
      createdAt,
    })
    const gn = gnFor(loc.city, loc.province)
    const scheduledAt = createdAt + 2 * DAY + (i % 6) * HOUR
    const winner = i % 2 === 0 ? requester : acceptor
    const confirmedAt = scheduledAt + 4 * HOUR
    seedMatch({
      requestId: reqId,
      requesterId: requester,
      acceptorId: acceptor,
      status: 'confirmed',
      requesterConfirmedAt: createdAt + 6 * HOUR,
      acceptorConfirmedAt: createdAt + 8 * HOUR,
      bookInitiatorId: requester,
      gamenetId: gn.id,
      scheduledAt,
      confirmDeadline: scheduledAt + ARENA_CONFIRM_WINDOW_HOURS * HOUR,
      requesterResult: winner,
      acceptorResult: winner,
      winnerUserId: winner,
      confirmedAt,
      createdAt: createdAt + 5 * HOUR,
    })
  }

  // —— Lapsed (~11)
  for (let i = 0; i < 11; i++) {
    const requester = allPlayerIds[(i + 3) % allPlayerIds.length]
    let acceptor = allPlayerIds[(i + 11) % allPlayerIds.length]
    if (acceptor === requester) acceptor = allPlayerIds[(i + 13) % allPlayerIds.length]
    const loc = cities[(i * 9) % cities.length]
    const createdAt = ago(4 + (i % 18), i % 16)
    const reqId = seedReq({
      userId: requester,
      disc: pickDisc(i + 3),
      bestOf: pickBestOf(i + 2),
      city: loc.city,
      province: loc.province,
      note: '',
      status: 'matched',
      expiresAt: createdAt + ARENA_REQUEST_TTL_HOURS * HOUR,
      createdAt,
    })
    const scheduledAt = createdAt + 3 * DAY
    seedMatch({
      requestId: reqId,
      requesterId: requester,
      acceptorId: acceptor,
      status: 'lapsed',
      requesterConfirmedAt: createdAt + 12 * HOUR,
      acceptorConfirmedAt: createdAt + 14 * HOUR,
      bookInitiatorId: requester,
      gamenetId: gnFor(loc.city, loc.province).id,
      scheduledAt,
      confirmDeadline: scheduledAt + ARENA_CONFIRM_WINDOW_HOURS * HOUR,
      requesterResult: requester,
      acceptorResult: acceptor,
      createdAt: createdAt + 10 * HOUR,
    })
  }

  // —— Cancelled matches (~7)
  for (let i = 0; i < 7; i++) {
    const requester = allPlayerIds[(i + 2) % allPlayerIds.length]
    let acceptor = allPlayerIds[(i + 15) % allPlayerIds.length]
    if (acceptor === requester) acceptor = allPlayerIds[(i + 17) % allPlayerIds.length]
    const loc = cities[(i * 11) % cities.length]
    const createdAt = ago(1 + (i % 12), i % 10)
    const reqId = seedReq({
      userId: requester,
      disc: pickDisc(i + 4),
      bestOf: 3,
      city: loc.city,
      province: loc.province,
      note: '',
      status: 'matched',
      expiresAt: createdAt + ARENA_REQUEST_TTL_HOURS * HOUR,
      createdAt,
    })
    seedMatch({
      requestId: reqId,
      requesterId: requester,
      acceptorId: acceptor,
      status: 'cancelled',
      createdAt: createdAt + 2 * HOUR,
    })
  }

  // —— Open requests now (~32) — nationwide map pins
  const openNotes = ['Bo3 عصر', 'Quick Bo1', 'Bo5 جدی', 'eFootball فقط', '', 'Tabriz arena', 'UFC KO', '2K pickup']
  for (let i = 0; i < 32; i++) {
    const loc = cities[(i * 2) % cities.length]
    const uid = allPlayerIds[(i * 3) % allPlayerIds.length]
    seedReq({
      userId: uid,
      disc: pickDisc(i),
      bestOf: pickBestOf(i),
      city: loc.city,
      province: loc.province,
      note: openNotes[i % openNotes.length],
      status: 'open',
      expiresAt: now + (12 + (i % 48)) * HOUR,
      createdAt: now - (i % 60) * HOUR,
    })
  }

  // —— Active pipeline (visible in /me/arena)
  // pending_confirm ×4
  for (let i = 0; i < 4; i++) {
    const requester = playerIds[i]
    const acceptor = playerIds[(i + 4) % playerIds.length]
    const loc = cities[i + 5]
    const createdAt = now - (2 + i) * HOUR
    const reqId = seedReq({
      userId: requester,
      disc: pickDisc(i),
      bestOf: 3,
      city: loc.city,
      province: loc.province,
      note: 'منتظر تأیید',
      status: 'matched',
      expiresAt: now + 40 * HOUR,
      createdAt,
    })
    seedMatch({
      requestId: reqId,
      requesterId: requester,
      acceptorId: acceptor,
      status: 'pending_confirm',
      requesterConfirmedAt: i % 2 === 0 ? createdAt + HOUR : undefined,
      createdAt: createdAt + 30 * 60 * 1000,
    })
  }

  // agreed ×3 (need book)
  for (let i = 0; i < 3; i++) {
    const requester = playerIds[i + 1]
    const acceptor = playerIds[(i + 6) % playerIds.length]
    const loc = cities[i + 10]
    const createdAt = now - (5 + i) * HOUR
    const reqId = seedReq({
      userId: requester,
      disc: 'fc26',
      bestOf: 3,
      city: loc.city,
      province: loc.province,
      note: 'آماده بوک',
      status: 'matched',
      expiresAt: now + 36 * HOUR,
      createdAt,
    })
    seedMatch({
      requestId: reqId,
      requesterId: requester,
      acceptorId: acceptor,
      status: 'agreed',
      requesterConfirmedAt: createdAt + HOUR,
      acceptorConfirmedAt: createdAt + 2 * HOUR,
      createdAt: createdAt + 45 * 60 * 1000,
    })
  }

  // scheduled ×5 (2 upcoming, 1 playable for result in dev)
  for (let i = 0; i < 5; i++) {
    const requester = playerIds[(i + 2) % playerIds.length]
    const acceptor = playerIds[(i + 8) % playerIds.length]
    const loc = cities[i + 15]
    const createdAt = now - (8 + i) * HOUR
    const gn = gnFor(loc.city, loc.province)
    const scheduledAt = i === 0 ? now - 2 * HOUR : now + (6 + i * 8) * HOUR
    const reqId = seedReq({
      userId: requester,
      disc: pickDisc(i + 1),
      bestOf: i === 0 ? 1 : 3,
      city: loc.city,
      province: loc.province,
      note: i === 0 ? 'نتیجه آماده' : 'بوک شده',
      status: 'matched',
      expiresAt: now + 30 * HOUR,
      createdAt,
    })
    seedMatch({
      requestId: reqId,
      requesterId: requester,
      acceptorId: acceptor,
      status: 'scheduled',
      requesterConfirmedAt: createdAt + HOUR,
      acceptorConfirmedAt: createdAt + 2 * HOUR,
      bookInitiatorId: requester,
      gamenetId: gn.id,
      scheduledAt,
      confirmDeadline: scheduledAt + ARENA_CONFIRM_WINDOW_HOURS * HOUR,
      createdAt: createdAt + 3 * HOUR,
    })
  }

  seedArenaTrackEvents(allPlayerIds)
  setSetting('arena_demo_seeded', SEED_VERSION)

  const stats = arenaMonthStats()
  return {
    ok: true,
    stats,
    message: `۱ ماه میدون: ${stats.requestsTotal} درخواست · ${stats.requestsOpen} باز · ${stats.matchesConfirmed} تأیید · CCR ${stats.ccrPercent}%`,
  }
}

export function seedArenaDemoIfEmpty() {
  if (process.env.ARENA_SEED === 'force') {
    void seedArenaDemo(true)
    return
  }
  const ver = getSetting('arena_demo_seeded')
  if (ver === SEED_VERSION && listOpenRequests({}).length >= 20) return
  if (ver === '1') {
    void seedArenaDemo(true)
    return
  }
  if (listOpenRequests({}).length >= 20) return
  void seedArenaDemo(false)
}
