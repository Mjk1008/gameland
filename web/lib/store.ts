// In-memory store with write-through to Postgres when DATABASE_URL is set.
// All public APIs are sync (reads from memory cache); DB writes are
// fire-and-forget. On first request, ensureHydrated() pulls existing rows
// from DB into the cache.
//
// Buyer flip: provision Postgres → apply lib/db/init.sql → set DATABASE_URL
// → restart. Data persists across restarts automatically.

import { Disc } from './mock-data'
import { disciplineSlotKey } from './discipline-format'
import { persist, startHydration, whenAuthReady as persistAuthReady } from './db/persistence'
import { bundledBannerDataUrl } from './game-assets-server'
import { defaultDiscBanner } from './game-assets'
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
  bonusPoints?: number   // admin-set manual ranking points (added to earned points)
  referredBy?: string          // referrer's user id — set once at signup, immutable
  freeTickets?: number         // referral-reward ticket balance (redeemed at registration)
  referralMilestone?: number   // last reward milestone granted (0|2|5) — idempotency guard
  promoterActive?: boolean
  promoterDiscountPercent?: number
  promoterCommissionPercent?: number
  promoterActivatedAt?: number
  rankingPoints?: number
  rankingEvents?: number
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
export function whenAuthReady(): Promise<void> { return persistAuthReady() }

// Keep the slider clean: de-duplicate slides (earlier random-id re-seeds created
// duplicates) and, on a truly empty slider, seed the bundled posters ONCE with
// STABLE ids so any future re-run is an idempotent upsert (never a new row).
function reconcileDefaultPromos() {
  const seen = new Set<string>()
  for (const p of allPromos()) { if (seen.has(p.imageData)) deletePromo(p.id); else seen.add(p.imageData) }
  if (promos.size === 0) {
    ['fc26', 'pes21', 'efootball', 'nba2k26', 'ufc6'].forEach((disc, i) => {
      const p: PromoRow = { id: 'promo_def_' + disc, imageData: `/games/${disc}-poster.png`, linkType: 'none', sort: i, active: true, createdAt: Date.now() }
      promos.set(p.id, p)
      persist.promo.insert(p)   // onConflictDoUpdate(id) → idempotent, no duplicates
    })
  }
}
function ensureHydrated() {
  _ready = startHydration({
    loadUser:      (u: User) => upsertUserInMemory(u, /*fromDb*/ true),
    loadEvent:     (e: Event) => { events.set(e.id, e) },
    loadReg:       (r: Registration) => { indexReg(r) },
    loadNotif:     (n: Notification) => { notifs.push(n) },
    loadPlacement: (pl: Placement) => { if (!placements.find(p => p.id === pl.id)) placements.push(pl) },
    loadMatch:     (m: Match) => { if (!matches.find(x => x.id === m.id)) matches.push(m) },
    loadTeam:      (t: Team) => { teams.set(t.id, t) },
    loadTeamMember: (m: TeamMember) => { teamMembers.push(m) },
    loadEventConfig: (compId: string, json: string) => { try { eventConfigs.set(compId, JSON.parse(json)) } catch {} },
    loadCompetition: (c: Competition) => { competitions.set(c.id, c) },
    loadPromo:     (p: PromoRow) => { promos.set(p.id, p) },
    loadNews:      (n: NewsRow) => { newsRows.set(n.id, n) },
    loadSetting:   (k: string, v: string) => { appSettings.set(k, v) },
    loadAvatarId:  (userId: string) => { avatarIds.add(userId) },
    loadCompetitionCoverId: (id: string) => { competitionCoverIds.add(id) },
    loadEventCoverId: (id: string) => { eventCoverIds.add(id) },
    loadReceiptId: (regId: string) => { receiptRegIds.add(regId) },
    loadGamenet:   (g: Gamenet) => { gamenets.set(g.id, g) },
    loadGamenetPhotoId: (gamenetId: string, photoId: string) => {
      const list = gamenetPhotoIds.get(gamenetId) ?? []
      if (!list.includes(photoId)) list.push(photoId)
      gamenetPhotoIds.set(gamenetId, list)
    },
    loadPlayRequest: (r: unknown) => { require('./arena').hydratePlayRequest(r as any) },
    loadPlayMatch: (m: unknown) => { require('./arena').hydratePlayMatch(m as any) },
    loadPromoterCode: (c: unknown) => { require('./promoter').hydratePromoterCode(c as any) },
    loadPromoterEarning: (e: unknown) => { require('./promoter').hydratePromoterEarning(e as any) },
    loadPromoterCodeRequest: (r: unknown) => { require('./promoter').hydratePromoterCodeRequest(r as any) },
  }).then(() => {
    reconcileDefaultPromos()
    reconcileTeams()
    seedRankingIfEmpty()
    // Heavy seeds must not block auth (whenReady).
    setImmediate(() => {
      reconcileDefaultEventCovers().catch(e => console.warn('[covers]', e))
      // GAMELAND_LOCAL_PROD is set by scripts/local-prod.mjs when .env.local
      // points DATABASE_URL at the LIVE Postgres for local testing — NODE_ENV
      // is still 'development' in that case, so it can't be trusted to gate
      // demo-data writes here. Skip the arena demo seeder whenever it's set.
      if (!process.env.GAMELAND_LOCAL_PROD) {
        try { require('./arena-seed').seedArenaDemoIfEmpty() } catch (e) { console.warn('[arena-seed]', e) }
      }
      import('./ranking-store').then(m => m.rebuildAllRankingsAsync().catch(e => console.warn('[ranking]', e)))
      // Rebuild any commission rows lost while app_promoter_earnings.dedupe_key
      // was missing — self-healing from the registration rows.
      import('./promoter').then(m => m.reconcilePromoterEarnings().catch(e => console.warn('[promoter]', e)))
    })
  })
}

// One-time per event: copy bundled game banners into the cover blob tables so
// existing رشته‌ها keep their visuals on the new system. Idempotent — skips
// events that already have an admin/uploaded cover. Admin can replace anytime.
async function reconcileDefaultEventCovers() {
  for (const e of events.values()) {
    if (hasEventCover(e.id)) continue
    const dataUrl = bundledBannerDataUrl(e.disc)
    if (!dataUrl) continue
    try {
      await persist.eventCover.upsertAsync(e.id, dataUrl)
      eventCoverIds.add(e.id)
    } catch (err) {
      console.warn('[covers] seed event', e.id, err)
    }
  }
}

// Which users have a profile photo — ids only (the image bytes stay in Postgres
// and are served on demand, so this stays tiny even with 10k users).
const avatarIds = new Set<string>()
export function hasAvatar(userId: string): boolean { return avatarIds.has(userId) }
export function markAvatar(userId: string): void { avatarIds.add(userId); bumpNationalRanking(userId) }
export function unmarkAvatar(userId: string): void { avatarIds.delete(userId); bumpNationalRanking(userId) }

// Competition / event card covers — ids only in RAM (bytes in Postgres blobs).
const competitionCoverIds = new Set<string>()
const eventCoverIds = new Set<string>()
export function hasCompetitionCover(id: string): boolean { return competitionCoverIds.has(id) }
export function hasEventCover(id: string): boolean { return eventCoverIds.has(id) }
export function competitionCoverUrl(id: string): string | undefined {
  return hasCompetitionCover(id) ? `/api/competition-cover/${id}` : undefined
}
export function eventCoverUrl(id: string): string | undefined {
  return hasEventCover(id) ? `/api/event-cover/${id}` : undefined
}
/** Card cover for a رشته: uploaded blob → bundled game banner fallback. */
export function resolveEventCardCover(eventId: string, disc: string): string | undefined {
  return eventCoverUrl(eventId) ?? defaultDiscBanner(disc)
}

/** Card cover for a رویداد — uploaded competition blob only; one source for list + detail. */
export function resolveCompetitionCardCover(compId: string): string | undefined {
  return competitionCoverUrl(compId)
}
export async function setCompetitionCover(id: string, dataUrl: string): Promise<void> {
  if (!competitions.has(id)) throw new Error('COMPETITION_NOT_FOUND')
  await persist.competitionCover.upsertAsync(id, dataUrl)
  competitionCoverIds.add(id)
}
export function removeCompetitionCover(id: string): void {
  competitionCoverIds.delete(id)
  persist.competitionCover.delete(id)
}
export async function setEventCover(id: string, dataUrl: string): Promise<void> {
  if (!events.has(id)) throw new Error('EVENT_NOT_FOUND')
  await persist.eventCover.upsertAsync(id, dataUrl)
  eventCoverIds.add(id)
}
export function removeEventCover(id: string): void {
  eventCoverIds.delete(id)
  persist.eventCover.delete(id)
}

// Which registrations have an uploaded payment receipt — ids only (image bytes
// stay in Postgres, served on demand), so RAM stays flat with many receipts.
const receiptRegIds = new Set<string>()
export function hasReceipt(regId: string): boolean { return receiptRegIds.has(regId) }
/** True when the uploaded فیش belongs to the current unpaid checkout batch. */
export function receiptCoversPendingPayment(reg: Registration): boolean {
  const unpaid = unpaidAttempts(reg)
  if (unpaid === 0) return false
  if (!hasReceipt(reg.id)) return false
  const batch = reg.payBatch ?? 1
  if (reg.receiptPayBatch != null) return reg.receiptPayBatch === batch
  if (reg.receiptAttemptsAt != null) return reg.receiptAttemptsAt === reg.attempts
  return false
}
export function markReceipt(regId: string): void { receiptRegIds.add(regId) }
export function attachReceiptToBatch(reg: Registration): void {
  markReceipt(reg.id)
  reg.receiptPayBatch = reg.payBatch ?? 1
  reg.receiptAttemptsAt = reg.attempts
  persist.reg.update(reg.id, { receiptPayBatch: reg.receiptPayBatch, receiptAttemptsAt: reg.attempts } as any)
}

// Admin-set manual ranking points (added on top of points earned from results).
export function setUserBonusPoints(id: string, points: number): User | undefined {
  const u = users.get(id); if (!u) return
  u.bonusPoints = Math.max(0, Math.round(points))
  persist.user.update(id, { bonusPoints: u.bonusPoints })
  bumpNationalRanking(id)
  return u
}
export function playerName(u: { firstName?: string; lastName?: string; name: string; tag: string }): string {
  const n = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
  return n || u.name || u.tag
}
export function bonusPointsOf(u: User): number { return u.bonusPoints ?? 0 }

// Activity points — derived live from existing data (never stored), so every
// gamer earns a nonzero rank from their first action. Deliberately small next
// to placement/seed points (min seed 1075) so real results always outrank
// participation: complete profile +25, photo +10, each approved سهم +15,
// each pending سهم +5 (registered but awaiting approval still counts a bit).
export function activityPointsOf(u: User): number {
  let pts = 0
  if (u.referredBy) pts += 50   // came via a friend's invite — welcome bonus
  if (u.role === 'gamer' && profileCompletion(u).complete) pts += 25
  if (hasAvatar(u.id)) pts += 10
  for (const r of registrationsForUser(u.id)) {
    if (r.status === 'approved') pts += r.attempts * 15
    else if (r.status === 'pending') pts += r.attempts * 5
  }
  return pts
}

// ─── Referral campaign («رفیقتو بیار») ──────────────────────────────────────
// Code = the user's own @tag. Attribution is set ONCE at ticket purchase and never
// changes. Rewards count only APPROVED (paid + admin-verified) registrations,
// which is the anti-fraud gate. Milestones: 3 approved referral tickets → 1 free
// ticket, 6 → 3 total. Free tickets are redeemed inside a normal registration.

export function setReferrerByTag(userId: string, refTag: string): boolean {
  const u = users.get(userId)
  if (!u || u.referredBy) return false                    // immutable once set
  const ref = getUserByTag(refTag.trim().replace(/^@/, ''))
  if (!ref || ref.id === userId) return false             // must exist, no self-referral
  u.referredBy = ref.id
  persist.user.update(userId, { referredBy: ref.id })
  bumpNationalRanking(userId)
  return true
}

// Total APPROVED tickets (سهم) bought by this referrer's invitees.
export function approvedReferralCount(referrerId: string): number {
  let n = 0
  for (const u of users.values()) {
    if (u.referredBy !== referrerId) continue
    for (const r of registrationsForUser(u.id)) if (r.status === 'approved') n += r.attempts
  }
  return n
}

// Called after a registration is approved: reward the referee's referrer if a
// milestone was crossed. Idempotent via referralMilestone.
export function grantReferralRewards(referredUserId: string) {
  const referred = users.get(referredUserId)
  const refId = referred?.referredBy
  if (!refId) return
  const referrer = users.get(refId)
  if (!referrer) return
  const count = approvedReferralCount(refId)   // approved tickets brought
  const milestone = referrer.referralMilestone ?? 0
  let granted = 0
  if (count >= 3 && milestone < 3) { granted += 1; referrer.referralMilestone = 3 }
  if (count >= 6 && (referrer.referralMilestone ?? 0) < 6) { granted += 2; referrer.referralMilestone = 6 }
  if (granted === 0) return
  referrer.freeTickets = (referrer.freeTickets ?? 0) + granted
  persist.user.update(refId, { freeTickets: referrer.freeTickets, referralMilestone: referrer.referralMilestone })
  pushNotif(refId, 'announcement', granted === 1 ? '🎟 یه سهمِ رایگان گرفتی!' : '🎟 ۲ سهمِ رایگانِ دیگه گرفتی!',
    count >= 6
      ? 'دعوتی‌هات به ۶ سهمِ تاییدشده رسیدن — جمعاً ۳ سهمِ رایگان گرفتی و نشانِ «سفیر گیم‌لند» مالِ توئه. موقعِ ثبت‌نامِ بعدی خودکار حساب می‌شن.'
      : `دعوتی‌هات ${count} سهمِ تاییدشده خریدن. سهمِ رایگانت موقعِ ثبت‌نامِ بعدی خودکار حساب می‌شه — ${6 - count} سهمِ دیگه تا ۲ سهمِ رایگانِ بعدی!`)
}

// Redeem free tickets inside a registration (called right after createRegistration).
export function consumeFreeTickets(userId: string, regId: string, n: number) {
  if (n <= 0) return
  const u = users.get(userId); const r = getRegistrationById(regId)
  if (!u || !r) return
  const use = Math.min(n, u.freeTickets ?? 0)
  if (use <= 0) return
  u.freeTickets = (u.freeTickets ?? 0) - use
  r.freeAttempts = (r.freeAttempts ?? 0) + use
  persist.user.update(userId, { freeTickets: u.freeTickets })
  persist.reg.update(regId, { freeAttempts: r.freeAttempts } as any)
}

// Public campaign leaderboard — top referrers by approved tickets brought.
export function referralLeaderboard(limit = 10): { uid: string; name: string; tag: string; count: number }[] {
  const acc = new Map<string, number>()
  for (const u of users.values()) {
    if (!u.referredBy) continue
    for (const r of registrationsForUser(u.id)) if (r.status === 'approved') acc.set(u.referredBy, (acc.get(u.referredBy) ?? 0) + r.attempts)
  }
  return Array.from(acc.entries())
    .map(([uid, count]) => { const u = users.get(uid); return u ? { uid, name: u.name, tag: u.tag, count } : null })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

// Seed the launch top-list (by tag → points). Per-user idempotent: each listed
// player gets their points only if they currently have none, so admin edits are
// never overwritten AND late-registering players (e.g. Mahyar) get seeded once.
function seedRankingIfEmpty() {
  const seed: [string, number][] = [
    ['nimasadeghilm101', 3725], ['JT26', 3250], ['VahidKooshki', 2850],
    ['mahyartahvilian', 2750], ['MatinMp', 2050], ['ferifcone', 1750],
    ['mahdigezderazi', 1500], ['AdamanT', 1400], ['Hammer', 1400], ['sajjadrashidi81', 1075],
  ]
  for (const [tag, pts] of seed) { const u = getUserByTag(tag); if (u && !(u.bonusPoints ?? 0)) setUserBonusPoints(u.id, pts) }
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
    province: 'تهران',
    primaryDisc: 'fc26',
    discs: ['fc26', 'efootball'],
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
  if (u.role === 'gamer') bumpNationalRanking(id)
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
  removeCompetitionCover(id)
  competitions.delete(id)
  for (const e of events.values()) if (e.competitionId === id) deleteEvent(e.id)
  persist.competition?.delete?.(id)
}
export function eventsForCompetition(id: string): Event[] {
  return Array.from(events.values()).filter(e => e.competitionId === id).sort((a, b) => a.createdAt - b.createdAt)
}

/** Taken (disc, format) slots under a mother competition — fc26:1 and fc26:2 can coexist. */
export function disciplineSlotsForCompetition(compId: string): string[] {
  return eventsForCompetition(compId).map(e => disciplineSlotKey(e.disc, getEventConfig(e.id).teamSize))
}

export function isDisciplineSlotTaken(compId: string, disc: string, teamSize?: number): boolean {
  return disciplineSlotsForCompetition(compId).includes(disciplineSlotKey(disc, teamSize))
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
const EVENT_EDITABLE: (keyof Event)[] = ['title', 'season', 'disc', 'tier', 'prize', 'teams', 'maxPlayers', 'status', 'statusLabel', 'format', 'date', 'startsAt', 'regDeadline', 'finalSize']
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
  removeEventCover(id)
  events.delete(id)
  eventConfigs.delete(id)
  for (const [k, r] of regs) if (r.compId === id) { deindexReg(r); regs.delete(k) }
  for (let i = matches.length - 1; i >= 0; i--) if (matches[i].compId === id) matches.splice(i, 1)
  for (let i = placements.length - 1; i >= 0; i--) if (placements[i].compId === id) placements.splice(i, 1)
  for (const [tid, t] of teams) if (t.compId === id) teams.delete(tid)
  for (let i = teamMembers.length - 1; i >= 0; i--) if (!teams.has(teamMembers[i].teamId)) teamMembers.splice(i, 1)
  persist.event.delete?.(id)
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
  freeAttempts?: number     // of attempts, how many were referral-reward tickets (unpaid)
  rejectReason?: string     // admin's last rejection reason (assistant + UI read this)
  paidAttempts?: number     // tickets already settled (approved). Top-ups bill only the difference.
  status: RegStatus         // pending payment/approval → approved by admin
  seedsEarned: number       // 0-2 (advances to final)
  prelimsCompleted: number  // 0-attempts
  teamId?: string           // 2v2 events only — set for both members' rows, same team
  promoterCodeId?: string   // affiliate code used at first registration
  discountPercent?: number  // snapshot — buyer pays ticketPrice × (1 − this/100)
  lockedUnitPrice?: number  // per-ticket price frozen at checkout — pay/admin read this
  payBatch?: number           // bumps on each new paid checkout (top-up / fresh reg)
  receiptPayBatch?: number    // payBatch when the current valid فیش was uploaded
  receiptAttemptsAt?: number  // reg.attempts when فیش was uploaded
  createdAt: number
}

const regs = new Map<string, Registration>()
const regsByUser = new Map<string, Registration[]>()

function bumpNationalRanking(userId?: string) {
  try {
    const { touchUserRanking } = require('./ranking-store') as typeof import('./ranking-store')
    if (userId) touchUserRanking(userId)
  } catch { /* noop */ }
}

function indexReg(r: Registration) {
  regs.set(r.userId + '|' + r.compId, r)
  const list = regsByUser.get(r.userId)
  if (!list) { regsByUser.set(r.userId, [r]); return }
  const i = list.findIndex(x => x.compId === r.compId)
  if (i >= 0) list[i] = r
  else list.push(r)
}

function deindexReg(r: Registration) {
  const list = regsByUser.get(r.userId)
  if (!list) return
  const i = list.findIndex(x => x.id === r.id)
  if (i >= 0) list.splice(i, 1)
}

// Register / buy tickets. Each user may hold up to 6 سهم per discipline. Buying
// more tops up the SAME registration (never a duplicate) up to that cap; the
// top-up goes back to 'pending' for admin re-approval with the new receipt.
// `attempts` = how many tickets to buy now. Stays open after the draw — extra
// سهم land in the leftover pool (بازماندگان) instead of the existing trees.
export function createRegistration(userId: string, compId: string, attempts: number, teamId?: string): Registration {
  if (attempts < 1 || attempts > 6) throw new Error('ATTEMPTS_OUT_OF_RANGE')
  const key = userId + '|' + compId
  const existing = regs.get(key)

  if (existing && existing.status !== 'rejected') {
    // active registration → top up, capped at 6 total for this discipline
    if (existing.attempts >= 6) throw new Error('MAX_TICKETS')
    if (attempts > 6 - existing.attempts) throw new Error('EXCEEDS_MAX')
    existing.attempts += attempts
    // Keep previously-approved rows approved so settled سهم stay in the draw.
    // The unpaid delta (attempts − paidAttempts) is what the admin queue sees.
    if (existing.status !== 'approved' && (existing.paidAttempts ?? 0) === 0) existing.status = 'pending'
    existing.payBatch = (existing.payBatch ?? 1) + 1
    existing.receiptPayBatch = undefined
    existing.receiptAttemptsAt = undefined
    existing.promoterCodeId = undefined
    existing.discountPercent = undefined
    existing.lockedUnitPrice = undefined
    if (teamId !== undefined) existing.teamId = teamId
    persist.reg.update(existing.id, {
      attempts: existing.attempts, status: existing.status, teamId: existing.teamId,
      payBatch: existing.payBatch, receiptPayBatch: null, receiptAttemptsAt: null,
      promoterCodeId: null, discountPercent: null, lockedUnitPrice: null,
    } as any)
    bumpNationalRanking(userId)
    return existing
  }
  if (existing) {
    // a previously-rejected registration is reused (same row) with a fresh count
    existing.attempts = attempts
    existing.status = 'pending'
    existing.seedsEarned = 0
    existing.prelimsCompleted = 0
    existing.freeAttempts = 0   // fresh count — free tickets re-apply from the balance
    existing.paidAttempts = 0   // nothing settled on a rejected row
    existing.payBatch = 1
    existing.receiptPayBatch = undefined
    existing.receiptAttemptsAt = undefined
    existing.promoterCodeId = undefined
    existing.discountPercent = undefined
    existing.lockedUnitPrice = undefined
    if (teamId !== undefined) existing.teamId = teamId
    persist.reg.update(existing.id, {
      attempts, status: 'pending', seedsEarned: 0, prelimsCompleted: 0, freeAttempts: 0, paidAttempts: 0, teamId,
      payBatch: 1, receiptPayBatch: null, receiptAttemptsAt: null, promoterCodeId: null, discountPercent: null, lockedUnitPrice: null,
    } as any)
    bumpNationalRanking(userId)
    return existing
  }
  const r: Registration = {
    id: 'r_' + Math.random().toString(36).slice(2, 10),
    userId, compId, attempts,
    status: 'pending',
    seedsEarned: 0, prelimsCompleted: 0,
    payBatch: 1,
    teamId,
    createdAt: Date.now(),
  }
  indexReg(r)
  persist.reg.insert(r)
  bumpNationalRanking(userId)
  return r
}

// Tickets a user can still buy for a discipline (0..6). 0 = cap reached.
export function remainingTickets(userId: string, compId: string): number {
  const r = regs.get(userId + '|' + compId)
  if (!r || r.status === 'rejected') return 6
  return Math.max(0, 6 - r.attempts)
}

export function setRegistrationStatus(regId: string, status: RegStatus, rejectReason?: string): Registration {
  const r = getRegistrationById(regId)
  if (!r) throw new Error('REG_NOT_FOUND')
  r.status = status
  if (status === 'rejected') r.rejectReason = rejectReason || r.rejectReason
  else r.rejectReason = undefined
  // Approving settles every ticket on the row, so a later top-up is billed
  // only for the newly added سهم.
  if (status === 'approved') {
    r.paidAttempts = r.attempts
    r.receiptPayBatch = undefined
    r.receiptAttemptsAt = undefined
  }
  persist.reg.update(r.id, {
    status, rejectReason: r.rejectReason ?? null, paidAttempts: r.paidAttempts ?? null,
    ...(status === 'approved' ? { receiptPayBatch: null, receiptAttemptsAt: null } : {}),
  } as any)
  bumpNationalRanking(r.userId)
  syncTeamMirrorFrom(r)
  if (status === 'rejected') disbandTeamIfCaptainRejected(r)
  return r
}

// Admin-adjust the ticket count (سهم) on a registration — fixes over/under-paid
// selections and lets someone top up before the draw. Locked once the bracket is
// drawn (attempts feed the seat distribution → changing it would corrupt matches).
export function setRegistrationAttempts(regId: string, attempts: number, opts?: { allowPostDraw?: boolean }): Registration {
  const r = getRegistrationById(regId)
  if (!r) throw new Error('REG_NOT_FOUND')
  // Post-draw is normally locked; the re-entry flow (MD-5b) opts in explicitly.
  if (!opts?.allowPostDraw && matchesForComp(r.compId).length > 0) throw new Error('REG_LOCKED')
  r.attempts = Math.max(1, Math.min(6, Math.round(attempts) || 1))
  persist.reg.update(r.id, { attempts: r.attempts } as any)
  bumpNationalRanking(r.userId)
  syncTeamMirrorFrom(r)
  return r
}

// Mark every سهم on the row as paid (used when a re-entry فیش is approved —
// the row is already 'approved', only the payment balance changes).
export function settleRegistrationAttempts(regId: string): Registration {
  const r = getRegistrationById(regId)
  if (!r) throw new Error('REG_NOT_FOUND')
  r.paidAttempts = r.attempts
  persist.reg.update(r.id, { paidAttempts: r.paidAttempts } as any)
  return r
}

function disbandTeamIfCaptainRejected(r: Registration): void {
  if (!r.teamId) return
  const t = teams.get(r.teamId)
  if (!t || t.status === 'disbanded' || t.captainId !== r.userId) return
  t.status = 'disbanded'
  persist.team.update(t.id, { status: 'disbanded' })
}

function syncTeamMirrorFrom(r: Registration): void {
  if (!r.teamId) return
  const t = teams.get(r.teamId)
  if (t && t.captainId === r.userId) mirrorCaptainToPartner(t)
}

export function getRegistration(userId: string, compId: string): Registration | undefined {
  return regs.get(userId + '|' + compId)
}

export function registrationsForUser(userId: string): Registration[] {
  return regsByUser.get(userId) ?? []
}

export function registrationsForComp(compId: string): Registration[] {
  return Array.from(regs.values()).filter(r => r.compId === compId)
}

// Every registration across all events — read-only, for admin analytics.
export function allRegistrations(): Registration[] {
  return Array.from(regs.values())
}

// Only approved registrations enter the draw / bracket.
export function approvedRegistrationsForComp(compId: string): Registration[] {
  return Array.from(regs.values()).filter(r => r.compId === compId && r.status === 'approved')
}

// All pending requests across events (admin approval queue), newest first.
// A team shows up once — as its captain's row. The partner's mirrored row
// follows the captain's status automatically, so it never needs its own
// queue entry.
export function pendingRegistrations(): Registration[] {
  return Array.from(regs.values())
    .filter(r => r.status !== 'rejected' && !isTeamPartnerReg(r))
    .filter(r => {
      const unpaid = unpaidAttempts(r)
      if (r.status === 'pending') return unpaid === 0 || receiptCoversPendingPayment(r)
      return r.status === 'approved' && unpaid > 0 && receiptCoversPendingPayment(r)
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function getRegistrationById(id: string): Registration | undefined {
  for (const r of regs.values()) if (r.id === id) return r
  return undefined
}

// Reconnect the `seedsEarned` field to the multi-entry final: it now means
// "this account's count of still-alive entries in the assembled final".
// Recomputed by lib/bracket.ts (syncFinalEntries) whenever the final changes.
export function setRegSeeds(userId: string, compId: string, n: number): void {
  const r = regs.get(userId + '|' + compId)
  if (!r || r.seedsEarned === n) return
  r.seedsEarned = n
  persist.reg.update(r.id, { seedsEarned: n } as any)
}

export function recordPrelimOutcome(regId: string, outcome: 'advance' | 'eliminate'): Registration {
  const r = getRegistrationById(regId)
  if (!r) throw new Error('REG_NOT_FOUND')
  if (r.prelimsCompleted >= r.attempts) throw new Error('NO_ATTEMPTS_LEFT')
  if (outcome === 'advance') {
    if (r.seedsEarned >= 2) throw new Error('MAX_SEEDS_REACHED')
    r.seedsEarned += 1
  }
  r.prelimsCompleted += 1
  persist.reg.update(r.id, { seedsEarned: r.seedsEarned, prelimsCompleted: r.prelimsCompleted })
  return r
}

// ─── Teams (2v2 events) ──────────────────────────────────────────────────────
// A team is just captain + partner linked via Registration.teamId — payment,
// approval, and the whole admin queue stay per-individual and untouched
// (docs/27 §2.4/§3.2). Registering the captain creates their Registration
// immediately, so the captain is never blocked on the partner's action.

export type TeamStatus = 'forming' | 'complete' | 'disbanded'
export interface Team {
  id: string
  compId: string
  name: string
  captainId: string
  status: TeamStatus
  attempts: number
  createdAt: number
}
export type TeamMemberStatus = 'invited' | 'accepted' | 'declined'
export interface TeamMember {
  teamId: string
  userId: string
  slot: number   // 0 = captain, 1 = partner
  status: TeamMemberStatus
}

const teams = new Map<string, Team>()
// Append-only log, not a per-(team,slot) map: partner replacement pushes a new
// row instead of mutating the old one, so the old (rejected/declined) row and
// its own Registration stay intact for audit — see currentTeamMembers below,
// which takes the LAST row per slot as the active one.
const teamMembers: TeamMember[] = []

export function getTeam(id: string): Team | undefined { return teams.get(id) }

export function teamsForComp(compId: string): Team[] {
  return Array.from(teams.values()).filter(t => t.compId === compId && t.status !== 'disbanded')
}

/** The 2v2 team this user captains for this event, if any (not disbanded / not rejected). */
export function captainTeamFor(userId: string, compId: string): Team | undefined {
  const r = getRegistration(userId, compId)
  if (r?.status === 'rejected') return undefined
  if (r?.teamId) {
    const t = teams.get(r.teamId)
    if (t && t.status !== 'disbanded' && t.captainId === userId && t.compId === compId) return t
  }
  const t = teamForUser(userId, compId)
  return t && t.captainId === userId ? t : undefined
}

// The active (non-superseded) member for each slot — exactly what "is this
// team complete" and "who are the current two members" must read, since a
// replaced partner leaves their old row behind in teamMembers.
export function currentTeamMembers(teamId: string): TeamMember[] {
  const bySlot = new Map<number, TeamMember>()
  for (const m of teamMembers) if (m.teamId === teamId) bySlot.set(m.slot, m)
  return Array.from(bySlot.values()).sort((a, b) => a.slot - b.slot)
}

// The team a user currently belongs to for one event (any invite status) —
// used by the invite banner and the /me team card.
export function teamForUser(userId: string, compId: string): Team | undefined {
  const r = getRegistration(userId, compId)
  if (r?.status === 'rejected') return undefined
  for (const t of teamsForComp(compId)) {
    if (currentTeamMembers(t.id).some(m => m.userId === userId)) return t
  }
  return undefined
}
// Every team this user currently belongs to, across all events — for the
// /me team-status card (one user is rarely on more than one active team,
// but this stays correct across events without a per-event lookup).
export function teamsForUser(userId: string): Team[] {
  return Array.from(teams.values()).filter(t => {
    if (t.status === 'disbanded') return false
    if (!currentTeamMembers(t.id).some(m => m.userId === userId)) return false
    const r = getRegistration(userId, t.compId)
    return !r || r.status !== 'rejected'
  })
}
// True for the auto-mirrored registration of a team's PARTNER (not its
// captain). The captain's registration is the one real request: it carries
// the payment and is the only row the admin queue shows for a team. The
// partner's row exists only so the draw and the leaderboard see two people.
export function isTeamPartnerReg(r: Registration): boolean {
  if (!r.teamId || r.status === 'rejected') return false
  const t = teams.get(r.teamId)
  return !!t && t.status !== 'disbanded' && t.captainId !== r.userId
}
export function teamMemberOf(userId: string, teamId: string): TeamMember | undefined {
  return currentTeamMembers(teamId).find(m => m.userId === userId)
}

// A 2v2 event is an ordinary tournament whose unit is a two-person team.
// The captain registers exactly like a solo player — picks 1..6 سهم and pays
// once, for the whole team. The partner is added by tag and gets an
// auto-mirrored, already-settled registration (they owe nothing) so the draw
// and the leaderboard see two people. No invite, no accept, no second
// payment. `mirrorCaptainToPartner` keeps the partner's row in lockstep with
// the captain's (attempts + status) at every point the captain's row changes.
function mirrorCaptainToPartner(team: Team): void {
  if (team.status === 'disbanded') return
  const partnerMem = currentTeamMembers(team.id).find(m => m.slot === 1)
  if (!partnerMem) return
  const cap = getRegistration(team.captainId, team.compId)
  if (!cap) return
  const key = partnerMem.userId + '|' + team.compId
  const existing = regs.get(key)
  // Don't clobber a live registration the partner owns independently. A rejected
  // or leftover-disbanded row is leftover from a previous team — take it over
  // so they can re-register.
  if (existing && existing.teamId !== team.id) {
    const old = existing.teamId ? teams.get(existing.teamId) : undefined
    const leftover = existing.status === 'rejected' || !old || old.status === 'disbanded'
    if (!leftover) return
  }
  if (existing) {
    existing.attempts = cap.attempts
    existing.status = cap.status
    existing.teamId = team.id
    existing.freeAttempts = 0
    existing.paidAttempts = cap.attempts
    persist.reg.update(existing.id, { attempts: existing.attempts, status: existing.status, teamId: team.id, freeAttempts: 0, paidAttempts: existing.paidAttempts } as any)
    bumpNationalRanking(partnerMem.userId)
    return
  }
  const pr: Registration = {
    id: 'r_' + Math.random().toString(36).slice(2, 10),
    userId: partnerMem.userId, compId: team.compId,
    attempts: cap.attempts, status: cap.status,
    seedsEarned: 0, prelimsCompleted: 0,
    teamId: team.id,
    freeAttempts: 0, paidAttempts: cap.attempts,
    createdAt: Date.now(),
  }
  indexReg(pr)
  persist.reg.insert(pr)
  bumpNationalRanking(partnerMem.userId)
}

// One-time boot reconcile: normalise teams made by the older invite/accept
// flow to the captain-does-everything model. Any member that didn't
// explicitly decline counts as in; every such team gets its partner mirror
// created/refreshed. Idempotent — safe to run on every hydration.
export function reconcileTeams(): void {
  for (const t of teams.values()) {
    if (t.status === 'disbanded') continue
    const members = currentTeamMembers(t.id)
    if (members.length !== 2 || members.some(m => m.status === 'declined')) continue
    for (const m of members) {
      if (m.status !== 'accepted') { m.status = 'accepted'; persist.teamMember.update(t.id, m.userId, { status: 'accepted' }) }
    }
    if (t.status !== 'complete') { t.status = 'complete'; persist.team.update(t.id, { status: 'complete' }) }
    mirrorCaptainToPartner(t)
  }
}

// Async — the team row must be committed before its member rows insert, or the
// FK on app_team_members.team_id can race a fire-and-forget team insert.
export async function createTeam(compId: string, captainId: string, name: string, partnerTag: string, attempts: number): Promise<{ team: Team; registration: Registration }> {
  if (attempts < 1 || attempts > 6) throw new Error('ATTEMPTS_OUT_OF_RANGE')
  if (matchesForComp(compId).length > 0) throw new Error('REG_LOCKED')

  const mine = getRegistration(captainId, compId)
  if (mine && mine.status !== 'rejected') {
    if (isTeamPartnerReg(mine)) throw new Error('TEAM_PARTNER_LOCKED')
    const existingTeam = captainTeamFor(captainId, compId)
      ?? (mine.teamId ? teams.get(mine.teamId) : undefined)
    const live = existingTeam && existingTeam.status !== 'disbanded' ? existingTeam : undefined
    const reg = createRegistration(captainId, compId, attempts, live?.id)
    if (live) {
      live.attempts = reg.attempts
      persist.team.update(live.id, { attempts: reg.attempts } as any)
      mirrorCaptainToPartner(live)
      return { team: live, registration: reg }
    }
    return { team: { id: mine.teamId || '', compId, name: name || '', captainId, status: 'complete', attempts: reg.attempts, createdAt: mine.createdAt }, registration: reg }
  }

  const partner = getUserByTag((partnerTag || '').trim().replace(/^@/, ''))
  if (!partner || partner.id === captainId) throw new Error('INVALID_PARTNER')
  const partnerReg = getRegistration(partner.id, compId)
  if (partnerReg && partnerReg.status !== 'rejected') throw new Error('PARTNER_ALREADY_REGISTERED')

  const t: Team = {
    id: 't_' + Math.random().toString(36).slice(2, 10),
    compId, name: (name || '').trim().slice(0, 40) || 'تیمِ بی‌نام', captainId,
    status: 'complete', attempts, createdAt: Date.now(),
  }
  teams.set(t.id, t)
  await persist.team.insertAsync(t)

  const captainMember: TeamMember = { teamId: t.id, userId: captainId, slot: 0, status: 'accepted' }
  const partnerMember: TeamMember = { teamId: t.id, userId: partner.id, slot: 1, status: 'accepted' }
  teamMembers.push(captainMember, partnerMember)
  persist.teamMember.insert(captainMember)
  persist.teamMember.insert(partnerMember)

  const reg = createRegistration(captainId, compId, attempts, t.id)
  mirrorCaptainToPartner(t)

  const captain = users.get(captainId)
  pushNotif(partner.id, 'announcement', 'به یه تیم اضافه شدی',
    `@${captain?.tag ?? ''} تو رو هم‌تیمیِ «${t.name}» کرد برای «${getEvent(compId)?.title ?? 'یه مسابقهٔ دو به دو'}». پرداختی نداری — کاپیتان سهمِ تیم رو داده. وضعیتت رو تو صفحهٔ «من» ببین.`)
  return { team: t, registration: reg }
}

// Captain swaps the partner, pre-draw only. Non-destructive: the outgoing
// partner's MIRRORED row is removed (never a row they own independently), the
// new partner is added already-in and mirrored.
export function replaceTeamPartner(captainId: string, teamId: string, newPartnerTag: string): TeamMember {
  const t = teams.get(teamId)
  if (!t || t.status === 'disbanded') throw new Error('TEAM_NOT_FOUND')
  if (t.captainId !== captainId) throw new Error('NOT_CAPTAIN')
  if (matchesForComp(t.compId).length > 0) throw new Error('REG_LOCKED')
  const partner = getUserByTag(newPartnerTag.trim().replace(/^@/, ''))
  if (!partner || partner.id === captainId) throw new Error('INVALID_PARTNER')
  const existingPartner = getRegistration(partner.id, t.compId)
  if (existingPartner && existingPartner.status !== 'rejected') throw new Error('PARTNER_ALREADY_REGISTERED')
  if (teamMembers.some(m => m.teamId === teamId && m.userId === partner.id)) throw new Error('INVALID_PARTNER')
  const prev = currentTeamMembers(teamId).find(m => m.slot === 1)
  if (prev) {
    const pr = regs.get(prev.userId + '|' + t.compId)
    if (pr && pr.teamId === teamId) { deindexReg(pr); regs.delete(prev.userId + '|' + t.compId); persist.reg.delete(pr.id); bumpNationalRanking(prev.userId) }
  }
  const mem: TeamMember = { teamId, userId: partner.id, slot: 1, status: 'accepted' }
  teamMembers.push(mem)
  persist.teamMember.insert(mem)
  t.status = 'complete'
  persist.team.update(t.id, { status: 'complete' })
  mirrorCaptainToPartner(t)
  pushNotif(partner.id, 'announcement', 'به یه تیم اضافه شدی',
    `@${users.get(captainId)?.tag ?? ''} تو رو هم‌تیمیِ «${t.name}» کرد. پرداختی نداری — کاپیتان سهمِ تیم رو داده.`)
  return mem
}

// Teams the admin still can't seat: fewer than two members, or a member whose
// registration isn't approved yet. Shown above the draw controls so rejecting
// one person can't silently kill a paying team.
export function incompleteTeamsForComp(compId: string): { team: Team; members: { user?: User; member: TeamMember; registration?: Registration }[] }[] {
  return teamsForComp(compId)
    .map(t => ({
      team: t,
      members: currentTeamMembers(t.id).map(m => ({
        user: users.get(m.userId),
        member: m,
        registration: getRegistration(m.userId, compId),
      })),
    }))
    .filter(({ members }) => members.length < 2 || !members.every(m => m.registration?.status === 'approved'))
}

// The inverse — teams the draw may seat: two members, both registrations approved.
export function seatableTeamsForComp(compId: string): Team[] {
  return teamsForComp(compId).filter(t => {
    const members = currentTeamMembers(t.id)
    return members.length === 2 && members.every(m => getRegistration(m.userId, compId)?.status === 'approved')
  })
}

// ─── User-initiated ticket changes (pre-draw only) ─────────────────────────
// Kept intentionally low-key in the UI — we'd rather players not shrink their
// entry — but honest and self-serve. Everything here locks the moment the
// bracket is drawn (matchesForComp > 0), same as every other pre-draw edit.

// Lower a registration's سهم count. Strictly a reduction (1..current-1). On a
// team, only the captain can do it, and it cascades to the partner's mirror.
export function reduceRegistrationAttempts(userId: string, compId: string, newAttempts: number): Registration {
  const r = getRegistration(userId, compId)
  if (!r || r.status === 'rejected') throw new Error('REG_NOT_FOUND')
  if (matchesForComp(compId).length > 0) {
    const seated = matchesForComp(compId).some(m => m.p1UserId === userId || m.p2UserId === userId)
    if (seated) throw new Error('REG_LOCKED')
  }
  if (r.teamId) {
    const t = teams.get(r.teamId)
    if (t && t.captainId !== userId) throw new Error('TEAM_PARTNER_LOCKED')
  }
  const n = Math.round(newAttempts)
  if (!(n >= 1 && n < r.attempts)) throw new Error('BAD_COUNT')
  r.attempts = n
  if ((r.paidAttempts ?? 0) > n) r.paidAttempts = n
  if ((r.freeAttempts ?? 0) > n - (r.paidAttempts ?? 0)) r.freeAttempts = Math.max(0, n - (r.paidAttempts ?? 0))
  persist.reg.update(r.id, { attempts: r.attempts, paidAttempts: r.paidAttempts, freeAttempts: r.freeAttempts } as any)
  bumpNationalRanking(userId)
  if (r.teamId) {
    const t = teams.get(r.teamId)
    if (t && t.captainId === userId) { t.attempts = n; persist.team.update(t.id, { attempts: n } as any); mirrorCaptainToPartner(t) }
  }
  return r
}

// Full withdrawal. On a team, only the captain can withdraw — it disbands the
// team and drops both registrations (rows kept flagged 'disbanded' for audit).
export function cancelRegistration(userId: string, compId: string): void {
  const r = getRegistration(userId, compId)
  if (!r) throw new Error('REG_NOT_FOUND')
  // Seated entries can't be pulled out after the draw. Unseated leftover
  // registrations (بازماندگان) can still withdraw.
  if (matchesForComp(compId).length > 0) {
    const seated = matchesForComp(compId).some(m =>
      m.p1UserId === userId || m.p2UserId === userId,
    )
    if (seated) throw new Error('REG_LOCKED')
  }
  const drop = (uid: string) => {
    const rr = regs.get(uid + '|' + compId)
    if (!rr) return
    deindexReg(rr); regs.delete(uid + '|' + compId); persist.reg.delete(rr.id)
    bumpNationalRanking(uid)
  }
  if (r.teamId) {
    const t = teams.get(r.teamId)
    if (t && t.captainId !== userId) throw new Error('TEAM_PARTNER_LOCKED')
    if (t) {
      for (const m of currentTeamMembers(t.id)) drop(m.userId)
      t.status = 'disbanded'
      persist.team.update(t.id, { status: 'disbanded' })
      return
    }
  }
  drop(userId)
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
  return notifs.filter(n => n.userId === userId).sort((a, b) => b.createdAt - a.createdAt)   // newest first
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

export interface GamenetConsole { kind: string; count: number }

export type GamenetStatus = 'pending' | 'verified' | 'rejected'

export interface Gamenet {
  id: string
  ownerId: string
  name: string
  province?: string
  city: string
  address: string
  phone?: string
  instagramUrl?: string
  mapUrl?: string
  openHours?: string
  stations: number               // derived = sum(consoles[].count), kept for back-compat reads
  consoles: GamenetConsole[]
  disciplines: string[]           // tournament-relevant disc ids — load-bearing, keep clean
  games: string[]                 // broader catalog ids (lib/gamenet-games.ts) — cosmetic only
  features: string[]              // amenity ids (lib/gamenet-features.ts)
  status: GamenetStatus
  rejectReason?: string
  verified: boolean               // derived = (status === 'verified'), kept for back-compat reads
  createdAt: number
}

const gamenets = new Map<string, Gamenet>()

export function createGamenet(input: Omit<Gamenet, 'id' | 'createdAt' | 'verified' | 'stations' | 'status'>): Gamenet {
  const id = 'gn_' + Math.random().toString(36).slice(2, 10)
  const stations = input.consoles.reduce((a, c) => a + (c.count || 0), 0)
  const g: Gamenet = { ...input, id, stations, status: 'pending', verified: false, createdAt: Date.now() }
  gamenets.set(id, g)
  persist.gamenet.insert(g)
  return g
}

export function allGamenets(): Gamenet[] {
  return Array.from(gamenets.values()).sort((a, b) => Number(b.status === 'verified') - Number(a.status === 'verified') || b.createdAt - a.createdAt)
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

export function pendingGamenets(): Gamenet[] {
  return Array.from(gamenets.values()).filter(g => g.status === 'pending').sort((a, b) => b.createdAt - a.createdAt)
}

export function setGamenetStatus(id: string, status: GamenetStatus, rejectReason?: string) {
  const g = gamenets.get(id)
  if (!g) return
  g.status = status
  g.verified = status === 'verified'
  g.rejectReason = status === 'rejected' ? (rejectReason?.trim() || undefined) : undefined
  persist.gamenet.setStatus(id, status, g.rejectReason)
}

export function verifyGamenet(id: string, verified: boolean) {
  setGamenetStatus(id, verified ? 'verified' : 'pending')
}

const GAMENET_REVIEW_FIELDS = ['name', 'province', 'city', 'address'] as const

export function updateGamenet(id: string, patch: Partial<Omit<Gamenet, 'id' | 'ownerId' | 'createdAt'>>): Gamenet | undefined {
  const g = gamenets.get(id)
  if (!g) return undefined
  const needsReview = GAMENET_REVIEW_FIELDS.some(k => patch[k] !== undefined && patch[k] !== (g as any)[k])
  Object.assign(g, patch)
  if (patch.consoles) g.stations = g.consoles.reduce((a, c) => a + (c.count || 0), 0)
  if ((needsReview && g.status === 'verified') || g.status === 'rejected') {
    g.status = 'pending'
    g.verified = false
    g.rejectReason = undefined
  }
  persist.gamenet.update(g)
  return g
}

export function deleteGamenet(id: string): boolean {
  if (!gamenets.has(id)) return false
  gamenets.delete(id)
  gamenetPhotoIds.delete(id)
  persist.gamenet.delete(id)
  return true
}

// gamenetId → ordered photo ids (bytes stay in Postgres, served on demand).
const gamenetPhotoIds = new Map<string, string[]>()
export const GAMENET_PHOTO_MAX = 6

export function gamenetPhotoIdsFor(gamenetId: string): string[] {
  return gamenetPhotoIds.get(gamenetId) ?? []
}
export function hasGamenetPhoto(gamenetId: string): boolean {
  return (gamenetPhotoIds.get(gamenetId)?.length ?? 0) > 0
}
export function gamenetPhotoCount(gamenetId: string): number {
  return gamenetPhotoIds.get(gamenetId)?.length ?? 0
}
export function addGamenetPhotoId(gamenetId: string, photoId: string): void {
  const list = gamenetPhotoIds.get(gamenetId) ?? []
  if (!list.includes(photoId)) list.push(photoId)
  gamenetPhotoIds.set(gamenetId, list)
}
export function removeGamenetPhotoId(gamenetId: string, photoId: string): void {
  const next = (gamenetPhotoIds.get(gamenetId) ?? []).filter(id => id !== photoId)
  if (next.length) gamenetPhotoIds.set(gamenetId, next)
  else gamenetPhotoIds.delete(gamenetId)
}

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

// ─── News (home news slider + detail modal, admin-managed) ──────────────────
export interface NewsRow {
  id: string
  imageData: string     // cover — data: URL (base64) or external URL
  title: string
  body: string
  tags: string[]
  sort: number
  active: boolean
  createdAt: number
}
const newsRows = new Map<string, NewsRow>()

export function allNews(): NewsRow[] {
  return Array.from(newsRows.values()).sort((a, b) => a.sort - b.sort || b.createdAt - a.createdAt)
}
export function activeNews(): NewsRow[] { return allNews().filter(n => n.active) }
export function getNews(id: string): NewsRow | undefined { return newsRows.get(id) }
export function createNews(input: { imageData: string; title: string; body: string; tags?: string[]; sort?: number; active?: boolean }): NewsRow {
  const id = 'news_' + Math.random().toString(36).slice(2, 10)
  const n: NewsRow = {
    id, imageData: input.imageData, title: input.title.trim(), body: input.body.trim(),
    tags: (input.tags ?? []).map(t => t.trim()).filter(Boolean).slice(0, 6),
    sort: input.sort ?? allNews().length, active: input.active ?? true, createdAt: Date.now(),
  }
  newsRows.set(id, n)
  persist.news?.insert(n)
  return n
}
export function updateNews(id: string, patch: Partial<Omit<NewsRow, 'id' | 'createdAt'>>): NewsRow {
  const n = newsRows.get(id); if (!n) throw new Error('NEWS_NOT_FOUND')
  if (patch.imageData !== undefined) n.imageData = patch.imageData
  if (patch.title !== undefined) n.title = patch.title.trim()
  if (patch.body !== undefined) n.body = patch.body.trim()
  if (patch.tags !== undefined) n.tags = patch.tags.map(t => t.trim()).filter(Boolean).slice(0, 6)
  if (patch.sort !== undefined) n.sort = patch.sort
  if (patch.active !== undefined) n.active = patch.active
  persist.news?.insert(n)   // upsert
  return n
}
export function deleteNews(id: string): void {
  newsRows.delete(id)
  persist.news?.delete(id)
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
  bumpNationalRanking(userId)
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
  // Team-format (2v2) sides — mutually exclusive with the user fields above:
  // a match is either a solo match (p1UserId/p2UserId set) or a team match
  // (p1TeamId/p2TeamId set), never both. No FK to app_teams (team rows don't
  // exist until Phase 3) — read/display code must branch on which pair is
  // populated, never on EventConfig.teamSize (see docs/27 §1.5).
  p1TeamId?: string
  p2TeamId?: string
  winnerTeamId?: string
  score?: string
  status: 'pending' | 'ready' | 'done'
  cancelled?: boolean
  createdAt: number
}

// Per-event tournament config: grouping mode, per-bracket qualify counts, and
// an optional manual final-seeding override. Kept in memory + persisted as JSON
// on the event row (config column).
export type GroupMode = 'city' | 'province'

export interface PrelimVenue {
  gamenetId?: string
  venueName?: string
  venueAddress?: string
  mapUrl?: string
  fromDate?: string
  toDate?: string
  scheduleNote?: string
  contactPhone?: string
}

export interface EventConfig {
  groupMode: GroupMode
  // qualifyCount keyed by `${groupKey}#${bracketIndex}` → how many advance to final
  qualify: Record<string, number>
  // manual final seeding override: ordered userIds (optional)
  finalSeeding?: string[]
  // admin-defined prize split — amount (تومان) per finishing place, index 0 = 1st.
  // when set, overrides the default percentage breakdown.
  prizeSplit?: number[]
  // per-event ticket price override (تومان) — undefined means "use the global
  // default" (TICKET.price in lib/payment.ts). Read ONLY through
  // ticketPriceFor(compId) in lib/payment.ts, never TICKET.price directly.
  ticketPrice?: number
  ticketOriginal?: number
  // Format of this event: 1 (default, solo) or 2 (2v2 teams). Frozen once
  // registrationsForComp(compId).length > 0 — enforced in the edit route, not
  // here — so a live event's format can never flip under existing data
  // (docs/27 §1.5). undefined means 1 (solo), same "absent = default" idiom
  // as ticketPrice.
  teamSize?: number
  // Pre-draw venue announcement per city/province group — label only, no bracket impact.
  prelimVenues?: Record<string, PrelimVenue>
  // Tournament shape: 'prelims' = city/province prelim brackets → assembled final
  // (only EA FC 26 / fc26 by default); 'direct' = one single-elim bracket, no
  // grouping, everyone seeded straight in. undefined ⇒ defaultBracketMode(disc).
  // Frozen once isDrawn(compId) — enforced in the edit route.
  bracketMode?: 'prelims' | 'direct'
  // Max distinct entries one account can carry into the assembled final.
  // undefined ⇒ 2 seeds. Ticket/سهم buy cap is separately 6.
  entryCap?: number
  // Per-bracket schedule, keyed by qualifyKey(groupKey, bracket). Label only +
  // drives bracketState() 'not-started' checks for re-entry (MD-5b).
  bracketSchedule?: Record<string, { date?: string; time?: string; note?: string }>
  // Per-group publish. Missing key / missing map = already public (legacy draws).
  // New draws set the group's key to false until admin presses انتشار.
  publishedGroups?: Record<string, boolean>
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

// Awaited by callers (generatePrelims) — the matches created right after a
// clear must not race the delete in Postgres. A fire-and-forget clear here
// let a fresh set of matches sometimes get wiped by their own now-delayed
// clear call, since neither had an ordering guarantee against the other.
export async function clearMatchesForComp(compId: string) {
  for (let i = matches.length - 1; i >= 0; i--) if (matches[i].compId === compId) matches.splice(i, 1)
  await persist.match.clearForComp(compId)
}

// Clear only one stage's matches (e.g. re-assemble the final without touching
// completed prelims). Scoped in both memory and DB — never touches the other
// stage's rows. (A prior version wiped ALL of the comp's matches in Postgres
// via an unscoped clearForComp + fire-and-forget re-insert, which could
// silently drop completed prelim matches on re-assembly.)
export async function clearMatchesByStage(compId: string, stage: 'prelim' | 'final') {
  for (let i = matches.length - 1; i >= 0; i--) if (matches[i].compId === compId && matches[i].stage === stage) matches.splice(i, 1)
  await persist.match.clearByStage(compId, stage)
}

export async function clearMatchesForGroup(compId: string, stage: 'prelim' | 'final', groupKey: string) {
  for (let i = matches.length - 1; i >= 0; i--) {
    if (matches[i].compId === compId && matches[i].stage === stage && matches[i].groupKey === groupKey) matches.splice(i, 1)
  }
  await persist.match.clearByGroup?.(compId, stage, groupKey)
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

export function allMatches(): Match[] {
  return matches
}

export function matchesForUser(userId: string): Match[] {
  const teamIds = new Set<string>()
  for (const t of teams.values()) {
    if (currentTeamMembers(t.id).some(tm => tm.userId === userId)) teamIds.add(t.id)
  }
  return matches.filter(m =>
    m.p1UserId === userId || m.p2UserId === userId ||
    (m.p1TeamId && teamIds.has(m.p1TeamId)) ||
    (m.p2TeamId && teamIds.has(m.p2TeamId)),
  )
}

export function prelimGroupKeys(compId: string): string[] {
  return Array.from(new Set(matches.filter(m => m.compId === compId && m.stage === 'prelim').map(m => m.groupKey)))
}

// usingDb is exported for callers that want to know the persistence mode
export { usingDb }


// ─── AI assistant usage limiter (in-memory, single-instance by design) ──────
export const AI_DAILY_LIMIT = 20
const AI_GLOBAL_DAILY_LIMIT = 2000
const aiCounts = new Map<string, number>()   // `${day}|${userId}` → questions today
let aiGlobal = { day: '', count: 0 }

function aiDayKey(): string {
  // Tehran-midnight reset (UTC+3:30)
  const t = new Date(Date.now() + 3.5 * 3600_000)
  return `${t.getUTCFullYear()}-${t.getUTCMonth() + 1}-${t.getUTCDate()}`
}

// Epoch ms of the last Tehran midnight — the window the DB-backed quota counts.
export function aiDayStart(): number {
  const shifted = new Date(Date.now() + 3.5 * 3600_000)
  const midnightShifted = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
  return midnightShifted - 3.5 * 3600_000
}

// Per-user usage is read from Postgres (see persist.ai.usedSince) so a deploy
// can't reset it. Only the app-wide brake stays in memory — resetting that on
// a restart is harmless.
export function aiGlobalFull(): boolean {
  const day = aiDayKey()
  if (aiGlobal.day !== day) { aiGlobal = { day, count: 0 }; aiCounts.clear() }
  return aiGlobal.count >= AI_GLOBAL_DAILY_LIMIT
}

export function aiCountGlobal(): void {
  if (aiGlobal.day !== aiDayKey()) aiGlobal = { day: aiDayKey(), count: 0 }
  aiGlobal.count++
}


// ─── App settings (key/value) — assistant knowledge base lives here ─────────
const appSettings = new Map<string, string>()
export function getSetting(key: string): string { return appSettings.get(key) ?? '' }
export function setSetting(key: string, value: string): void {
  appSettings.set(key, value)
  persist.setting?.set(key, value)
}
export const AI_KNOWLEDGE_KEY = 'ai_knowledge'


// Tickets on a registration that still need paying (top-ups bill the delta;
// referral-reward tickets and already-approved tickets are free/settled).
export function unpaidAttempts(r: Registration): number {
  // Approved rows from before paidAttempts existed left it NULL. Treat those
  // as fully settled — otherwise they look like unpaid re-entry after a draw.
  if (r.status === 'approved' && r.paidAttempts == null) return 0
  return Math.max(0, r.attempts - (r.paidAttempts ?? 0) - (r.freeAttempts ?? 0))
}

/** Tickets already settled — these are the ones that enter a draw. A pending
 *  top-up does not pull previously-approved سهم out of the pool. */
export function settledAttempts(r: Registration): number {
  if (r.status === 'rejected') return 0
  if (r.paidAttempts == null) return r.status === 'approved' ? r.attempts : 0
  return Math.max(0, r.paidAttempts)
}

export function drawEligibleRegistrations(compId: string): Registration[] {
  return Array.from(regs.values()).filter(r => r.compId === compId && settledAttempts(r) > 0)
}
