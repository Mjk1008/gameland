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
let _ready: Promise<void> | null = null
ensureHydrated()
// Await this before serving auth/signup/register so requests never race the
// initial DB→memory load (which would create duplicate accounts / drop rows).
export function whenReady(): Promise<void> { return _ready ?? Promise.resolve() }
function ensureHydrated() {
  _ready = startHydration({
    loadUser:      (u: User) => upsertUserInMemory(u, /*fromDb*/ true),
    loadEvent:     (e: Event) => { events.set(e.id, e) },
    loadReg:       (r: Registration) => { regs.set(r.userId + '|' + r.compId, r) },
    loadNotif:     (n: Notification) => { notifs.push(n) },
    loadPlacement: (pl: Placement) => { if (!placements.find(p => p.id === pl.id)) placements.push(pl) },
    loadMatch:     (m: Match) => { if (!matches.find(x => x.id === m.id)) matches.push(m) },
    loadEventConfig: (compId: string, json: string) => { try { eventConfigs.set(compId, JSON.parse(json)) } catch {} },
    loadCompetition: (c: Competition) => { competitions.set(c.id, c) },
    loadPromo:     (p: PromoRow) => { promos.set(p.id, p) },
    loadAvatarId:  (userId: string) => { avatarIds.add(userId) },
  })
}

// Which users have a profile photo — ids only (the image bytes stay in Postgres
// and are served on demand, so this stays tiny even with 10k users).
const avatarIds = new Set<string>()
export function hasAvatar(userId: string): boolean { return avatarIds.has(userId) }
export function markAvatar(userId: string): void { avatarIds.add(userId) }
export function unmarkAvatar(userId: string): void { avatarIds.delete(userId) }

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

// Profile completeness — the fields a gamer must fill before joining a
// competition. Signup now collects the bare minimum (phone/email/password);
// everything here is completed later on the profile page. `percent` powers the
// completion meter; `complete` gates competition registration.
export function profileCompletion(u: User): { percent: number; missing: string[]; complete: boolean } {
  const checks: [boolean, string][] = [
    [!!u.firstName?.trim(), 'نام'],
    [!!u.lastName?.trim(), 'نام خانوادگی'],
    [!!u.province?.trim(), 'استان'],
    [!!u.city?.trim(), 'شهر'],
    [!!u.messenger, 'راه ارتباطی'],
    [!!u.primaryDisc, 'رشتهٔ بازی'],
  ]
  const done = checks.filter(c => c[0]).length
  return {
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter(c => !c[0]).map(c => c[1]),
    complete: done === checks.length,
  }
}

// Minimal signup: phone + email + password only. Auto-generates a provisional
// tag from the email local-part (same scheme as Google users); the player sets
// their real handle + the rest of their profile later. Admin phones become
// admin immediately.
export function createPhoneUser(input: { phone: string; email: string; passwordHash: string }): User {
  if (usersByPhone.has(input.phone)) throw new Error('PHONE_TAKEN')
  if (usersByEmail.has(input.email.toLowerCase())) throw new Error('EMAIL_TAKEN')
  const base = (input.email.split('@')[0] || 'gamer').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16) || 'gamer'
  let tag = base
  let n = 1
  while (usersByTag.has(tag.toLowerCase())) tag = `${base}${n++}`
  const id = 'u_' + Math.random().toString(36).slice(2, 10)
  const role: Role = isAdminPhone(input.phone) ? 'admin' : 'gamer'
  const u: User = {
    id, phone: input.phone, email: input.email, passwordHash: input.passwordHash,
    name: tag, tag, city: '', primaryDisc: null, role, coinBalance: 0, createdAt: Date.now(),
  }
  users.set(id, u)
  indexUser(u)
  persist.user.insert(u)
  return u
}

// Passwordless SMS login: return the phone's user, or create a phone-only
// account (no email/password) that completes its profile later. Admin phones
// become admin.
export function getOrCreateOtpUser(phone: string): User {
  const existing = getUserByPhone(phone)
  if (existing) {
    if (existing.role === 'gamer' && isAdminPhone(phone)) setUserRole(existing.id, 'admin')
    return existing
  }
  let tag = 'gamer' + phone.slice(-4)
  let n = 1
  while (usersByTag.has(tag.toLowerCase())) tag = `gamer${phone.slice(-4)}_${n++}`
  const id = 'u_' + Math.random().toString(36).slice(2, 10)
  const role: Role = isAdminPhone(phone) ? 'admin' : 'gamer'
  const u: User = { id, phone, name: tag, tag, city: '', primaryDisc: null, role, coinBalance: 0, createdAt: Date.now() }
  users.set(id, u)
  indexUser(u)
  persist.user.insert(u)
  return u
}

export function createUser(input: Omit<User, 'id' | 'createdAt' | 'role' | 'coinBalance'> & { role?: Role; coinBalance?: number }): User {
  if (input.phone && usersByPhone.has(input.phone)) throw new Error('PHONE_TAKEN')
  if (input.email && usersByEmail.has(input.email.toLowerCase())) throw new Error('EMAIL_TAKEN')
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

export function setUserPassword(id: string, passwordHash: string): User | undefined {
  const u = users.get(id)
  if (!u) return undefined
  u.passwordHash = passwordHash
  persist.user.setPassword(id, passwordHash)
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
  competitionId?: string   // parent competition (رویداد) this discipline belongs to
  finalSize?: number       // final bracket size for this discipline (fc26=128, else 32)
}

// A Competition (رویداد/جام) groups several disciplines (child Events). Shared
// meta lives here; registration + brackets stay per-discipline on the Events.
export interface Competition {
  id: string
  title: string
  location: string
  date: string
  posterUrl?: string
  createdAt: number
}
const competitions = new Map<string, Competition>()

export function createCompetition(input: { title: string; location?: string; date?: string; posterUrl?: string }): Competition {
  const id = 'cup_' + Math.random().toString(36).slice(2, 10)
  const c: Competition = { id, title: input.title, location: input.location ?? '', date: input.date ?? '', posterUrl: input.posterUrl, createdAt: Date.now() }
  competitions.set(id, c)
  persist.competition?.insert(c)
  return c
}
export function getCompetition(id: string): Competition | undefined { return competitions.get(id) }
export function allCompetitions(): Competition[] { return Array.from(competitions.values()).sort((a, b) => b.createdAt - a.createdAt) }
export function updateCompetition(id: string, patch: Partial<Competition>): Competition {
  const c = competitions.get(id); if (!c) throw new Error('COMPETITION_NOT_FOUND')
  for (const k of ['title', 'location', 'date', 'posterUrl'] as const) if (k in patch && patch[k] !== undefined) (c as any)[k] = patch[k]
  persist.competition?.update?.(id, c)
  return c
}
export function deleteCompetition(id: string) {
  competitions.delete(id)
  for (const e of events.values()) if (e.competitionId === id) deleteEvent(e.id)
  persist.competition?.delete?.(id)
}
export function eventsForCompetition(id: string): Event[] {
  return Array.from(events.values()).filter(e => e.competitionId === id).sort((a, b) => a.createdAt - b.createdAt)
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

// Admin edit of any competition field (except id/createdAt/organizerId).
const EVENT_EDITABLE: (keyof Event)[] = ['title', 'season', 'disc', 'tier', 'prize', 'teams', 'maxPlayers', 'status', 'statusLabel', 'format', 'date', 'startsAt', 'regDeadline']
export function updateEvent(id: string, patch: Partial<Event>): Event {
  const e = events.get(id)
  if (!e) throw new Error('EVENT_NOT_FOUND')
  for (const k of EVENT_EDITABLE) if (k in patch && patch[k] !== undefined) (e as any)[k] = patch[k]
  persist.event.update?.(id, e)
  return e
}

// Admin delete of a competition + everything under it (registrations, matches,
// placements, config). DB delete of the event row cascades the child rows.
export function deleteEvent(id: string) {
  if (!events.has(id)) throw new Error('EVENT_NOT_FOUND')
  events.delete(id)
  eventConfigs.delete(id)
  for (const [k, r] of regs) if (r.compId === id) regs.delete(k)
  for (let i = matches.length - 1; i >= 0; i--) if (matches[i].compId === id) matches.splice(i, 1)
  for (let i = placements.length - 1; i >= 0; i--) if (placements[i].compId === id) placements.splice(i, 1)
  persist.event.delete?.(id)
}

// One-time maintenance: wipe every fake test participant (email ends with
// @gameland.test) plus all bracket matches (test draws). Real accounts stay.
export function purgeTestData(): { users: number; matches: number } {
  let removedUsers = 0
  for (const u of Array.from(users.values())) {
    if (u.email && u.email.toLowerCase().endsWith('@gameland.test')) {
      users.delete(u.id)
      if (u.phone) usersByPhone.delete(u.phone)
      usersByTag.delete(u.tag.toLowerCase())
      if (u.email) usersByEmail.delete(u.email.toLowerCase())
      if (u.googleSub) usersByGoogleSub.delete(u.googleSub)
      for (const [k, r] of regs) if (r.userId === u.id) regs.delete(k)
      removedUsers++
    }
  }
  const removedMatches = matches.length
  matches.length = 0
  for (let i = placements.length - 1; i >= 0; i--) placements.splice(i, 1)
  persist.maintenance?.purgeTests()
  return { users: removedUsers, matches: removedMatches }
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

// Gameland is privately funded — no external sponsors seeded. Admin can still
// add real sponsors later via /admin/sponsors if that ever changes.

// ─── Promo slides (home carousel, admin-managed) ───────────────────────────
export interface PromoRow {
  id: string
  imageData: string                       // data: URL (base64) or external URL
  linkType: 'event' | 'url' | 'none'      // where tapping the slide goes
  eventId?: string                        // link_type='event' → /competitions/{eventId}
  url?: string                            // link_type='url'  → custom/landing link
  sort: number                            // ascending display order
  active: boolean
  createdAt: number
}

const promos = new Map<string, PromoRow>()

export function allPromos(): PromoRow[] {
  return Array.from(promos.values()).sort((a, b) => a.sort - b.sort || a.createdAt - b.createdAt)
}
export function activePromos(): PromoRow[] {
  return allPromos().filter(p => p.active)
}
export function createPromo(input: Omit<PromoRow, 'id' | 'createdAt' | 'sort'> & { sort?: number }): PromoRow {
  const maxSort = allPromos().reduce((m, p) => Math.max(m, p.sort), -1)
  const p: PromoRow = {
    id: 'promo_' + Math.random().toString(36).slice(2, 10),
    imageData: input.imageData,
    linkType: input.linkType,
    eventId: input.eventId,
    url: input.url,
    sort: input.sort ?? maxSort + 1,
    active: input.active ?? true,
    createdAt: Date.now(),
  }
  promos.set(p.id, p)
  persist.promo.insert(p)
  return p
}
export function updatePromo(id: string, patch: Partial<PromoRow>): PromoRow {
  const p = promos.get(id)
  if (!p) throw new Error('PROMO_NOT_FOUND')
  Object.assign(p, patch)
  persist.promo.insert(p)
  return p
}
export function deletePromo(id: string): void {
  promos.delete(id)
  persist.promo.delete(id)
}
// Move a slide up/down by swapping sort with its neighbour.
export function reorderPromo(id: string, dir: 'up' | 'down'): void {
  const list = allPromos()
  const idx = list.findIndex(p => p.id === id)
  if (idx < 0) return
  const swapIdx = dir === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= list.length) return
  const a = list[idx], b = list[swapIdx]
  const as = a.sort, bs = b.sort
  updatePromo(a.id, { sort: bs })
  updatePromo(b.id, { sort: as })
}

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
  stage: 'prelim' | 'final'   // preliminary (per city/province) or the final 128 bracket
  groupKey: string            // 'city:تهران' | 'province:اصفهان' for prelim; '' for final
  bracket: number             // prelim: 1..6 within the group; final: 0
  round: number
  slot: number
  p1UserId?: string
  p2UserId?: string
  winnerUserId?: string
  score?: string
  status: 'pending' | 'ready' | 'done'
  createdAt: number
}

// Per-event tournament config: grouping mode, per-bracket qualify counts, and
// an optional manual final-seeding override. Kept in memory + persisted as JSON
// on the event row (config column).
export type GroupMode = 'city' | 'province'
export interface EventConfig {
  groupMode: GroupMode
  // qualifyCount keyed by `${groupKey}#${bracketIndex}` → how many advance to final
  qualify: Record<string, number>
  // manual final seeding override: ordered userIds (optional)
  finalSeeding?: string[]
}
const eventConfigs = new Map<string, EventConfig>()

export function getEventConfig(compId: string): EventConfig {
  return eventConfigs.get(compId) ?? { groupMode: 'city', qualify: {} }
}
export function setEventConfig(compId: string, patch: Partial<EventConfig>) {
  const cur = getEventConfig(compId)
  const next = { ...cur, ...patch }
  eventConfigs.set(compId, next)
  persist.event.setConfig?.(compId, JSON.stringify(next))
  return next
}
export function qualifyKey(groupKey: string, bracket: number) { return `${groupKey}#${bracket}` }

const matches: Match[] = []

export function matchesForComp(compId: string): Match[] {
  return matches.filter(m => m.compId === compId).sort((a, b) => a.bracket - b.bracket || a.round - b.round || a.slot - b.slot)
}

export function clearMatchesForComp(compId: string) {
  for (let i = matches.length - 1; i >= 0; i--) if (matches[i].compId === compId) matches.splice(i, 1)
  persist.match.clearForComp(compId)
}

// Clear only one stage's matches (e.g. re-assemble the final without touching
// completed prelims). Falls back to full clear + re-persist for the DB.
export function clearMatchesByStage(compId: string, stage: 'prelim' | 'final') {
  for (let i = matches.length - 1; i >= 0; i--) if (matches[i].compId === compId && matches[i].stage === stage) matches.splice(i, 1)
  // DB: wipe all comp matches then re-persist survivors (simple + consistent)
  persist.match.clearForComp(compId)
  for (const m of matches) if (m.compId === compId) persist.match.insert(m)
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

export function findNextMatch(m: Match): Match | undefined {
  // Winner of round R slot S feeds round R+1 slot floor(S/2), within the same
  // stage + group + bracket.
  return matches.find(x => x.compId === m.compId && x.stage === m.stage && x.groupKey === m.groupKey
    && x.bracket === m.bracket && x.round === m.round + 1 && x.slot === Math.floor(m.slot / 2))
}

// All prelim group keys that have matches in this comp.
export function prelimGroupKeys(compId: string): string[] {
  return Array.from(new Set(matches.filter(m => m.compId === compId && m.stage === 'prelim').map(m => m.groupKey)))
}

// usingDb is exported for callers that want to know the persistence mode
export { usingDb }
