// In-memory store for MVP. Each entity has a clean read/write API
// matching what a Drizzle/Postgres layer will look like later.
// Swap one entity at a time to real DB once DATABASE_URL is set.

import { PLAYERS as MOCK_PLAYERS, Player, Disc } from './mock-data'

// ─── Users ──────────────────────────────────────────────────────────────────

export type Role = 'gamer' | 'organizer' | 'admin'

export interface User {
  id: string
  phone: string
  name: string
  tag: string
  city: string
  primaryDisc: Disc | null
  nationalId?: string
  role: Role
  createdAt: number
  playerId?: string
}

const users = new Map<string, User>()
const usersByPhone = new Map<string, string>()
const usersByTag = new Map<string, string>()

// Seed a default admin so you can log in immediately (phone: 09120000000, OTP: 123456)
seedAdmin()
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
    createdAt: Date.now(),
  }
  users.set(id, admin)
  usersByPhone.set(admin.phone, id)
  usersByTag.set(admin.tag.toLowerCase(), id)

  // Also seed a default gamer (phone: 09121111111, OTP: 123456) linked to PLAYERS[0]
  const z = MOCK_PLAYERS[0]
  const g: User = {
    id: 'u_zeus',
    phone: '09121111111',
    name: z.name,
    tag: z.tag,
    city: z.city,
    primaryDisc: z.disc,
    role: 'gamer',
    createdAt: Date.now(),
    playerId: 'p_zeus',
  }
  users.set(g.id, g)
  usersByPhone.set(g.phone, g.id)
  usersByTag.set(g.tag.toLowerCase(), g.id)
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

export function createUser(input: Omit<User, 'id' | 'createdAt' | 'role'> & { role?: Role }): User {
  if (usersByPhone.has(input.phone)) throw new Error('PHONE_TAKEN')
  if (usersByTag.has(input.tag.toLowerCase())) throw new Error('TAG_TAKEN')
  if (input.nationalId) {
    for (const u of users.values()) if (u.nationalId === input.nationalId) throw new Error('NATIONAL_ID_TAKEN')
  }
  const id = 'u_' + Math.random().toString(36).slice(2, 10)
  const u: User = { ...input, id, role: input.role ?? 'gamer', createdAt: Date.now() }
  users.set(id, u)
  usersByPhone.set(u.phone, id)
  usersByTag.set(u.tag.toLowerCase(), id)
  return u
}

export function updateUser(id: string, patch: Partial<Omit<User, 'id' | 'createdAt' | 'role'>>): User {
  const u = users.get(id)
  if (!u) throw new Error('USER_NOT_FOUND')
  if (patch.tag && patch.tag.toLowerCase() !== u.tag.toLowerCase()) {
    if (usersByTag.has(patch.tag.toLowerCase())) throw new Error('TAG_TAKEN')
    usersByTag.delete(u.tag.toLowerCase())
    usersByTag.set(patch.tag.toLowerCase(), id)
  }
  Object.assign(u, patch)
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
  prize: number
  teams: number
  status: 'live' | 'open' | 'soon' | 'done'
  statusLabel: string
  format: string
  date: string
  organizerId: string
  createdAt: number
}

const events = new Map<string, Event>()

export function createEvent(input: Omit<Event, 'id' | 'createdAt'>): Event {
  const id = 'e_' + Math.random().toString(36).slice(2, 10)
  const e: Event = { ...input, id, createdAt: Date.now() }
  events.set(id, e)
  return e
}

export function allEvents(): Event[] {
  return Array.from(events.values()).sort((a, b) => b.createdAt - a.createdAt)
}

export function getEvent(id: string): Event | undefined {
  return events.get(id)
}

// ─── Registrations (1-6 attempts per gamer per competition) ─────────────────

export interface Registration {
  id: string
  userId: string
  compId: string
  attempts: number          // 1-6
  seedsEarned: number       // 0-3 (advances to final)
  prelimsCompleted: number  // 0-attempts
  createdAt: number
}

const regs = new Map<string, Registration>()

export function createRegistration(userId: string, compId: string, attempts: number): Registration {
  if (attempts < 1 || attempts > 6) throw new Error('ATTEMPTS_OUT_OF_RANGE')
  const key = userId + '|' + compId
  if (regs.has(key)) throw new Error('ALREADY_REGISTERED')
  const r: Registration = {
    id: 'r_' + Math.random().toString(36).slice(2, 10),
    userId, compId, attempts,
    seedsEarned: 0, prelimsCompleted: 0,
    createdAt: Date.now(),
  }
  regs.set(key, r)
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

export function pushNotif(userId: string, type: NotifType, title: string, body: string): Notification {
  const n: Notification = {
    id: 'n_' + Math.random().toString(36).slice(2, 10),
    userId, type, title, body,
    read: false, createdAt: Date.now(),
  }
  notifs.unshift(n)
  return n
}

export function notifsForUser(userId: string): Notification[] {
  return notifs.filter(n => n.userId === userId)
}

export function markNotifRead(id: string) {
  const n = notifs.find(x => x.id === id)
  if (n) n.read = true
}

export function unreadCount(userId: string): number {
  return notifs.filter(n => n.userId === userId && !n.read).length
}
