// In-memory store with write-through to Postgres when DATABASE_URL is set.
// All public APIs are sync (reads from memory cache); DB writes are
// fire-and-forget. On first request, ensureHydrated() pulls existing rows
// from DB into the cache.
//
// Buyer flip: provision Postgres → apply lib/db/init.sql → set DATABASE_URL
// → restart. Data persists across restarts automatically.

import { Disc } from './mock-data'
import { persist, startHydration } from './db/persistence'
import { usingDb } from './db/client'

// ─── Users ──────────────────────────────────────────────────────────────────

export type Role = 'gamer' | 'organizer' | 'admin'

export type Messenger = 'whatsapp' | 'telegram' | 'both'

export interface User {
  id: string
  email?: string
  googleSub?: string
  avatarUrl?: string
  phone?: string
  name: string
  firstName?: string
  lastName?: string
  tag: string
  province?: string
  city: string
  messenger?: Messenger
  primaryDisc: Disc | null
  discs?: Disc[]           // all disciplines the player competes in
  experienceYears?: number
  teamName?: string
  nationalId?: string
  passwordHash?: string    // phone+password auth (scrypt); undefined for Google-only accounts
  role: Role
  coinBalance: number
  createdAt: number
  deletedAt?: number
  playerId?: string
}

const users = new Map<string, User>()
const usersByPhone = new Map<string, string>()
const usersByTag = new Map<string, string>()
const usersByEmail = new Map<string, string>()
const usersByGoogleSub = new Map<string, string>()

// Seed a default admin so you can log in immediately (phone: 09120000000, OTP: 123456)
seedAdmin()

// Trigger DB hydration on module load. Loaders merge into the same maps so
// in-memory queries see persisted rows after the async load completes.
ensureHydrated()
function ensureHydrated() {
  startHydration({
    loadUser:      (u: User) => upsertUserInMemory(u, /*fromDb*/ true),
    loadEvent:     (e: Event) => { events.set(e.id, e) },
    loadReg:       (r: Registration) => { regs.set(r.userId + '|' + r.compId, r) },
    loadNotif:     (n: Notification) => { notifs.push(n) },
    loadPlacement: (pl: Placement) => { if (!placements.find(p => p.id === pl.id)) placements.push(pl) },
    loadMatch:     (m: Match) => { if (!matches.find(x => x.id === m.id)) matches.push(m) },
  })
}

function indexUser(u: User) {
  if (u.phone) usersByPhone.set(u.phone, u.id)
  usersByTag.set(u.tag.toLowerCase(), u.id)
  if (u.email) usersByEmail.set(u.email.toLowerCase(), u.id)
  if (u.googleSub) usersByGoogleSub.set(u.googleSub, u.id)
}

function upsertUserInMemory(u: User, fromDb = false) {
  const existing = users.get(u.id)
  if (existing) {
    Object.assign(existing, u)
    indexUser(existing)
    return existing
  }
  users.set(u.id, u)
  indexUser(u)
  return u
}
function seedAdmin() {
  const id = 'u_admin'
  const admin: User = {
    id,
    phone: '09120000000',
    name: 'مدیر گیم‌لند',
    tag: 'admin',
    city: 'تهران',
    primaryDisc: null,
    role: 'admin',
    coinBalance: 0,
    createdAt: Date.now(),
  }
  users.set(id, admin)
  indexUser(admin)
  // No demo gamer — clean slate. Real users create their profile on first login.
}

export function getUserByPhone(phone: string): User | undefined {
  const id = usersByPhone.get(phone)
  return id ? users.get(id) : undefined
}

export function getUserById(id: string): User | undefined {
  return users.get(id)
}

export function getUserByTag(tag: string): User | undefined {
  const id = usersByTag.get(tag.toLowerCase())
  return id ? users.get(id) : undefined
}

export function getUserByEmail(email: string): User | undefined {
  const id = usersByEmail.get(email.toLowerCase())
  return id ? users.get(id) : undefined
}

export function getUserByGoogleSub(sub: string): User | undefined {
  const id = usersByGoogleSub.get(sub)
  return id ? users.get(id) : undefined
}

// Google sign-in: find existing user by sub/email, or create a shell account
// that still needs profile completion (no tag/city yet → needsProfile=true).
// isAdmin (from the email allow-list) promotes the account to role=admin.
export function upsertGoogleUser(input: { googleSub: string; email: string; name: string; avatarUrl?: string; isAdmin?: boolean }): User {
  const existing = getUserByGoogleSub(input.googleSub) || getUserByEmail(input.email)
  if (existing) {
    const patch: Partial<User> = {}
    if (!existing.googleSub) patch.googleSub = input.googleSub
    if (!existing.avatarUrl && input.avatarUrl) patch.avatarUrl = input.avatarUrl
    if (!existing.email) patch.email = input.email
    if (Object.keys(patch).length) {
      Object.assign(existing, patch)
      indexUser(existing)
      persist.user.update(existing.id, patch)
    }
    // Promote to admin if allow-listed and not already staff.
    if (input.isAdmin && existing.role === 'gamer') {
      existing.role = 'admin'
      persist.user.setRole(existing.id, 'admin')
    }
    return existing
  }
  const id = 'u_' + Math.random().toString(36).slice(2, 10)
  // Provisional tag from email local-part; user completes profile on first login.
  const base = (input.email.split('@')[0] || 'gamer').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16) || 'gamer'
  let tag = base
  let n = 1
  while (usersByTag.has(tag.toLowerCase())) tag = `${base}${n++}`
  const u: User = {
    id, email: input.email, googleSub: input.googleSub, avatarUrl: input.avatarUrl,
    name: input.name, tag, city: '', primaryDisc: null,
    role: input.isAdmin ? 'admin' : 'gamer', coinBalance: 0, createdAt: Date.now(),
  }
  users.set(id, u)
  indexUser(u)
  persist.user.insert(u)
  return u
}

// A gamer still needs to complete their profile when city/disc are unset.
// Staff (admin/organizer) don't need a gamer profile.
export function userNeedsProfile(u: User): boolean {
  if (u.role !== 'gamer') return false
  return !u.city || !u.primaryDisc
}

export function createUser(input: Omit<User, 'id' | 'createdAt' | 'role' | 'coinBalance'> & { role?: Role; coinBalance?: number }): User {
  if (input.phone && usersByPhone.has(input.phone)) throw new Error('PHONE_TAKEN')
  if (usersByTag.has(input.tag.toLowerCase())) throw new Error('TAG_TAKEN')
  if (input.nationalId) {
    for (const u of users.values()) if (u.nationalId === input.nationalId) throw new Error('NATIONAL_ID_TAKEN')
  }
  const id = 'u_' + Math.random().toString(36).slice(2, 10)
  const role: Role = (input.phone && isAdminPhone(input.phone)) ? 'admin' : (input.role ?? 'gamer')
  const u: User = { ...input, id, role, coinBalance: input.coinBalance ?? 0, createdAt: Date.now() }
  users.set(id, u)
  indexUser(u)
  persist.user.insert(u)
  return u
}

// Admin phone allow-list (env ADMIN_PHONES, comma-separated). These numbers get
// role=admin on signup, and are promoted on login if they registered earlier.
export function isAdminPhone(phone?: string): boolean {
  if (!phone) return false
  const list = (process.env.ADMIN_PHONES || '').split(',').map(s => s.trim()).filter(Boolean)
  return list.includes(phone)
}

export function setUserRole(id: string, role: Role): User | undefined {
  const u = users.get(id)
  if (!u) return undefined
  u.role = role
  persist.user.setRole(id, role)
  return u
}

export function updateUser(id: string, patch: Partial<Omit<User, 'id' | 'createdAt' | 'role' | 'coinBalance'>>): User {
  const u = users.get(id)
  if (!u) throw new Error('USER_NOT_FOUND')
  if (patch.tag && patch.tag.toLowerCase() !== u.tag.toLowerCase()) {
    if (usersByTag.has(patch.tag.toLowerCase())) throw new Error('TAG_TAKEN')
    usersByTag.delete(u.tag.toLowerCase())
    usersByTag.set(patch.tag.toLowerCase(), id)
  }
  // Derive full name from first/last when provided.
  if (patch.firstName !== undefined || patch.lastName !== undefined) {
    const fn = patch.firstName ?? u.firstName ?? ''
    const ln = patch.lastName ?? u.lastName ?? ''
    const full = `${fn} ${ln}`.trim()
    if (full) patch.name = full
  }
  // Keep primaryDisc in sync with the first selected discipline.
  if (patch.discs && patch.discs.length && !patch.primaryDisc) {
    patch.primaryDisc = patch.discs[0]
  }
  Object.assign(u, patch)
  persist.user.update(id, patch)
  return u
}

export function allUsers(): User[] {
  return Array.from(users.values())
}

// ─── OTP (dev stub) ─────────────────────────────────────────────────────────

const otpStore = new Map<string, { code: string; expiresAt: number }>()

export function issueOtp(phone: string): string {
  // In dev: always 123456. In prod: random 6-digit + send via Kavenegar.
  const code = process.env.KAVENEGAR_API_KEY ? Math.floor(100000 + Math.random() * 900000).toString() : '123456'
  otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 })
  if (!process.env.KAVENEGAR_API_KEY) {
    console.log(`[OTP] ${phone} → ${code} (dev stub; replace with Kavenegar via KAVENEGAR_API_KEY)`)
  } else {
    // TODO: call Kavenegar API. For now just log.
    console.log(`[OTP] ${phone} → ${code} (would send via Kavenegar)`)
  }
  return code
}

export function verifyOtp(phone: string, code: string): boolean {
  const rec = otpStore.get(phone)
  if (!rec) return false
  if (Date.now() > rec.expiresAt) return false
  if (rec.code !== code) return false
  otpStore.delete(phone)
  return true
}

// ─── Events / Competitions (in-memory layer over mock-data COMPS) ───────────
// Real events created via admin panel live here, alongside the mock COMPS.

export interface Event {
  id: string
  title: string
  season: string
  disc: Disc
  tier: 'S' | 'A' | 'B' | 'C'
  prize: number
  teams: number
  maxPlayers?: number
  status: 'live' | 'open' | 'soon' | 'done'
  statusLabel: string
  format: string
  date: string
  startsAt?: number
  regDeadline?: number
  organizerId: string
  createdAt: number
}

const events = new Map<string, Event>()

export function createEvent(input: Omit<Event, 'id' | 'createdAt' | 'tier'> & { tier?: Event['tier'] }): Event {
  const id = 'e_' + Math.random().toString(36).slice(2, 10)
  const e: Event = { ...input, tier: input.tier ?? 'A', id, createdAt: Date.now() }
  events.set(id, e)
  persist.event.insert(e)
  return e
}

export function updateEventStatus(id: string, status: Event['status'], statusLabel: string) {
  const e = events.get(id)
  if (!e) throw new Error('EVENT_NOT_FOUND')
  e.status = status
  e.statusLabel = statusLabel
  persist.event.updateStatus(id, status, statusLabel)
}

export function allEvents(): Event[] {
  return Array.from(events.values()).sort((a, b) => b.createdAt - a.createdAt)
}

export function getEvent(id: string): Event | undefined {
  return events.get(id)
}

// ─── Registrations (1-6 attempts per gamer per competition) ─────────────────

export type RegStatus = 'pending' | 'approved' | 'rejected'

export interface Registration {
  id: string
  userId: string
  compId: string
  attempts: number          // 1-6
  status: RegStatus         // pending payment/approval → approved by admin
  seedsEarned: number       // 0-3 (advances to final)
  prelimsCompleted: number  // 0-attempts
  createdAt: number
}

const regs = new Map<string, Registration>()

export function createRegistration(userId: string, compId: string, attempts: number): Registration {
  if (attempts < 1 || attempts > 6) throw new Error('ATTEMPTS_OUT_OF_RANGE')
  const key = userId + '|' + compId
  const existing = regs.get(key)
  // A rejected registration may be re-submitted; pending/approved may not.
  if (existing && existing.status !== 'rejected') throw new Error('ALREADY_REGISTERED')
  const r: Registration = {
    id: 'r_' + Math.random().toString(36).slice(2, 10),
    userId, compId, attempts,
    status: 'pending',
    seedsEarned: 0, prelimsCompleted: 0,
    createdAt: Date.now(),
  }
  regs.set(key, r)
  persist.reg.insert(r)
  return r
}

export function setRegistrationStatus(regId: string, status: RegStatus): Registration {
  const r = getRegistrationById(regId)
  if (!r) throw new Error('REG_NOT_FOUND')
  r.status = status
  persist.reg.update(r.id, { status } as any)
  return r
}

export function getRegistration(userId: string, compId: string): Registration | undefined {
  return regs.get(userId + '|' + compId)
}

export function registrationsForUser(userId: string): Registration[] {
  return Array.from(regs.values()).filter(r => r.userId === userId)
}

export function registrationsForComp(compId: string): Registration[] {
  return Array.from(regs.values()).filter(r => r.compId === compId)
}

// Only approved registrations enter the draw / bracket.
export function approvedRegistrationsForComp(compId: string): Registration[] {
  return Array.from(regs.values()).filter(r => r.compId === compId && r.status === 'approved')
}

// All pending requests across events (admin approval queue).
export function pendingRegistrations(): Registration[] {
  return Array.from(regs.values()).filter(r => r.status === 'pending').sort((a, b) => a.createdAt - b.createdAt)
}

export function getRegistrationById(id: string): Registration | undefined {
  for (const r of regs.values()) if (r.id === id) return r
  return undefined
}

export function recordPrelimOutcome(regId: string, outcome: 'advance' | 'eliminate'): Registration {
  const r = getRegistrationById(regId)
  if (!r) throw new Error('REG_NOT_FOUND')
  if (r.prelimsCompleted >= r.attempts) throw new Error('NO_ATTEMPTS_LEFT')
  if (outcome === 'advance') {
    if (r.seedsEarned >= 3) throw new Error('MAX_SEEDS_REACHED')
    r.seedsEarned += 1
  }
  r.prelimsCompleted += 1
  persist.reg.update(r.id, { seedsEarned: r.seedsEarned, prelimsCompleted: r.prelimsCompleted })
  return r
}

// ─── Notifications ──────────────────────────────────────────────────────────

export type NotifType = 'registration' | 'draw' | 'match_ready' | 'result' | 'advance' | 'announcement'

export interface Notification {
  id: string
  userId: string
  type: NotifType
  title: string
  body: string
  read: boolean
  createdAt: number
}

const notifs: Notification[] = []

// SMS triggers for high-importance notification types (mirror to phone)
const SMS_TRIGGERS: NotifType[] = ['registration', 'draw', 'match_ready', 'advance']

export function pushNotif(userId: string, type: NotifType, title: string, body: string): Notification {
  const n: Notification = {
    id: 'n_' + Math.random().toString(36).slice(2, 10),
    userId, type, title, body,
    read: false, createdAt: Date.now(),
  }
  notifs.unshift(n)
  persist.notif.insert(n)

  // Fire-and-forget SMS for important types
  if (SMS_TRIGGERS.includes(type)) {
    const u = users.get(userId)
    if (u && u.phone) {
      const phone = u.phone
      import('./sms').then(m => m.sendSms({ to: phone, text: `${title}\n${body}` })).catch(() => {})
    }
  }
  return n
}

export function notifsForUser(userId: string): Notification[] {
  return notifs.filter(n => n.userId === userId)
}

export function markNotifRead(id: string) {
  const n = notifs.find(x => x.id === id)
  if (n) n.read = true
}

export function markAllNotifsRead(userId: string) {
  for (const n of notifs) if (n.userId === userId && !n.read) n.read = true
  persist.notif.markAllRead(userId)
}

export function unreadCount(userId: string): number {
  return notifs.filter(n => n.userId === userId && !n.read).length
}

// ─── Coin wallet ────────────────────────────────────────────────────────────
// Append-only ledger; balance derived from sum of deltas.
// Reasons: 'topup' (credit), 'attempt' (debit for tournament entry),
// 'refund' (credit), 'bonus' (credit), 'fee' (debit).
// Coins are non-convertible to cash (legal safety per docs/11-risks).

export interface CoinTxn {
  id: string
  userId: string
  delta: number
  reason: 'topup' | 'attempt' | 'refund' | 'bonus' | 'fee'
  ref?: string
  createdAt: number
}

const coinTxns: CoinTxn[] = []

export function coinTxnsForUser(userId: string): CoinTxn[] {
  return coinTxns.filter(t => t.userId === userId).sort((a, b) => b.createdAt - a.createdAt)
}

export function coinBalance(userId: string): number {
  const u = users.get(userId)
  return u?.coinBalance ?? 0
}

export function applyCoinTxn(userId: string, delta: number, reason: CoinTxn['reason'], ref?: string): CoinTxn {
  const u = users.get(userId)
  if (!u) throw new Error('USER_NOT_FOUND')
  if (delta < 0 && u.coinBalance + delta < 0) throw new Error('INSUFFICIENT_BALANCE')
  u.coinBalance += delta
  const t: CoinTxn = {
    id: 't_' + Math.random().toString(36).slice(2, 10),
    userId, delta, reason, ref,
    createdAt: Date.now(),
  }
  coinTxns.unshift(t)
  persist.user.setCoinBalance(userId, u.coinBalance)
  persist.coinTxn.insert(t.id, userId, delta, reason, ref)
  return t
}

// ─── Gamenets ───────────────────────────────────────────────────────────────

export interface Gamenet {
  id: string
  ownerId: string
  name: string
  city: string
  address: string
  phone?: string
  stations: number
  disciplines: string[] // disc ids
  verified: boolean
  createdAt: number
}

const gamenets = new Map<string, Gamenet>()

export function createGamenet(input: Omit<Gamenet, 'id' | 'createdAt' | 'verified'>): Gamenet {
  const id = 'gn_' + Math.random().toString(36).slice(2, 10)
  const g: Gamenet = { ...input, id, verified: false, createdAt: Date.now() }
  gamenets.set(id, g)
  return g
}

export function allGamenets(): Gamenet[] {
  return Array.from(gamenets.values()).sort((a, b) => Number(b.verified) - Number(a.verified) || b.createdAt - a.createdAt)
}

export function getGamenet(id: string): Gamenet | undefined {
  return gamenets.get(id)
}

export function gamenetsForOwner(ownerId: string): Gamenet[] {
  return Array.from(gamenets.values()).filter(g => g.ownerId === ownerId)
}

export function gamenetsByCity(city: string): Gamenet[] {
  return Array.from(gamenets.values()).filter(g => g.city.includes(city))
}

export function verifyGamenet(id: string, verified: boolean) {
  const g = gamenets.get(id)
  if (g) g.verified = verified
}

// Seed a couple of demo gamenets
;(function seedGamenets() {
  if (gamenets.size > 0) return
  createGamenet({ ownerId: 'u_admin', name: 'گیم‌نت پارادایس', city: 'تهران', address: 'سعادت‌آباد، خ کاج', phone: '02122334455', stations: 24, disciplines: ['valorant', 'cs2'] })
  createGamenet({ ownerId: 'u_admin', name: 'استدیو وی پلی',  city: 'مشهد',  address: 'سجاد، نبش امام رضا', phone: '05133445566', stations: 18, disciplines: ['valorant', 'fc'] })
  // Mark first as verified
  const first = Array.from(gamenets.values())[0]
  if (first) first.verified = true
})()

// ─── Disciplines (admin-managed) ───────────────────────────────────────────
// Currently mirrors DISC in mock-data.ts; admin can add more.

export interface DisciplineRow {
  id: string
  name: string
  short: string
  color: string
  active: boolean
}

const disciplines = new Map<string, DisciplineRow>()

;(function seedDisciplines() {
  if (disciplines.size > 0) return
  const seed: DisciplineRow[] = [
    { id: 'fc26',      name: 'فیفا ۲۶',    short: 'FC26', color: '#38bdf8', active: true },
    { id: 'pes21',     name: 'پ‌اس ۲۱',     short: 'PES',  color: '#34d399', active: true },
    { id: 'efootball', name: 'ای‌فوتبال ۲۶', short: 'EF',   color: '#22d3ee', active: true },
    { id: 'ufc6',      name: 'یو‌اف‌سی ۶',  short: 'UFC',  color: '#fb7185', active: true },
    { id: 'nba2k26',   name: 'NBA 2K26',    short: '2K',   color: '#f5c84b', active: true },
  ]
  for (const d of seed) disciplines.set(d.id, d)
})()

export function allDisciplines(): DisciplineRow[] {
  return Array.from(disciplines.values())
}
export function createDiscipline(d: DisciplineRow): DisciplineRow {
  if (disciplines.has(d.id)) throw new Error('DISCIPLINE_EXISTS')
  disciplines.set(d.id, d)
  return d
}
export function updateDiscipline(id: string, patch: Partial<DisciplineRow>): DisciplineRow {
  const d = disciplines.get(id)
  if (!d) throw new Error('DISCIPLINE_NOT_FOUND')
  Object.assign(d, patch)
  return d
}

// ─── Sponsors (admin-managed) ──────────────────────────────────────────────

export interface SponsorRow {
  id: string
  name: string
  logoUrl?: string
  website?: string
}

const sponsors = new Map<string, SponsorRow>()

;(function seedSponsors() {
  if (sponsors.size > 0) return
  const seed: SponsorRow[] = [
    { id: 's-cube',    name: 'مکعب',     website: 'https://maka3b.ir' },
    { id: 's-oxin',    name: 'اوکسین',  website: 'https://oxin.io' },
    { id: 's-tapsell', name: 'تپسل',     website: 'https://tapsell.ir' },
    { id: 's-ngg',     name: 'NG Games', website: 'https://nggames.io' },
  ]
  for (const s of seed) sponsors.set(s.id, s)
})()

// ─── Placements (final competition results → feeds ranking engine) ─────────

export interface Placement {
  id: string
  userId: string
  compId: string
  disc: Disc
  rank: number           // 1 = champion
  createdAt: number
}

const placements: Placement[] = []

export function storePlacement(userId: string, compId: string, disc: Disc, rank: number): Placement {
  const existing = placements.find(p => p.userId === userId && p.compId === compId)
  if (existing) { existing.rank = rank; return existing }
  const pl: Placement = {
    id: 'pl_' + Math.random().toString(36).slice(2, 10),
    userId, compId, disc, rank, createdAt: Date.now(),
  }
  placements.push(pl)
  persist.placement.insert(pl)
  return pl
}

export function allPlacements(): Placement[] { return [...placements] }

export function placementsForUser(userId: string): Placement[] {
  return placements.filter(p => p.userId === userId)
}

export function placementsForComp(compId: string): Placement[] {
  return placements.filter(p => p.compId === compId)
}

export function allSponsors(): SponsorRow[] {
  return Array.from(sponsors.values())
}
export function createSponsor(s: SponsorRow): SponsorRow {
  if (sponsors.has(s.id)) throw new Error('SPONSOR_EXISTS')
  sponsors.set(s.id, s)
  return s
}
export function updateSponsor(id: string, patch: Partial<SponsorRow>): SponsorRow {
  const s = sponsors.get(id)
  if (!s) throw new Error('SPONSOR_NOT_FOUND')
  Object.assign(s, patch)
  return s
}

// ─── Matches (real bracket draws + match-level results) ────────────────────

export interface Match {
  id: string
  compId: string
  bracket: number       // 0 = final, 1-6 = prelim
  round: number
  slot: number
  p1UserId?: string
  p2UserId?: string
  winnerUserId?: string
  score?: string
  status: 'pending' | 'ready' | 'done'
  createdAt: number
}

const matches: Match[] = []

export function matchesForComp(compId: string): Match[] {
  return matches.filter(m => m.compId === compId).sort((a, b) => a.bracket - b.bracket || a.round - b.round || a.slot - b.slot)
}

export function clearMatchesForComp(compId: string) {
  for (let i = matches.length - 1; i >= 0; i--) if (matches[i].compId === compId) matches.splice(i, 1)
  persist.match.clearForComp(compId)
}

export function pushMatch(m: Match) {
  matches.push(m)
  persist.match.insert(m)
}

export function saveMatch(m: Match) {
  persist.match.insert(m)
}

export function getMatch(id: string): Match | undefined {
  return matches.find(m => m.id === id)
}

export function findNextMatch(compId: string, bracket: number, round: number, slot: number): Match | undefined {
  // Winner of round R slot S feeds round R+1 slot floor(S/2)
  return matches.find(m => m.compId === compId && m.bracket === bracket && m.round === round + 1 && m.slot === Math.floor(slot / 2))
}

// usingDb is exported for callers that want to know the persistence mode
export { usingDb }
