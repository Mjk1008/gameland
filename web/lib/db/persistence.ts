// Write-through persistence shim. Store.ts stays synchronous in-memory;
// every write also enqueues a DB write fire-and-forget. On first request,
// hydration pulls all rows from DB into memory.
//
// Behavior:
//   - DATABASE_URL unset → no-op (in-memory only)
//   - DATABASE_URL set    → reads stay from memory (fast), writes mirror to DB
//
// Limitation: in-memory cache is per-instance. Multi-instance deployments
// should swap store.ts for direct async Drizzle calls. For Liara single-
// instance MVP this is sufficient.

import { eq, and } from 'drizzle-orm'
import { db, schema } from './client'
import type { User, Event, Registration, Notification } from '../store'

let hydrating: Promise<void> | null = null
let hydrated = false

export function startHydration(loaders: {
  loadUser:      (u: any) => void
  loadEvent:     (e: any) => void
  loadReg:       (r: any) => void
  loadNotif:     (n: any) => void
  loadPlacement: (pl: any) => void
  loadMatch:     (m: any) => void
}): Promise<void> {
  if (hydrated || hydrating) return hydrating ?? Promise.resolve()
  const d = db()
  if (!d) { hydrated = true; return Promise.resolve() }
  hydrating = (async () => {
    try {
      const ms = (v: any) => (v instanceof Date ? v.getTime() : Date.now())

      const us = await d.select().from(schema.users)
      for (const u of us) loaders.loadUser({
        id: u.id, email: u.email ?? undefined, googleSub: u.googleSub ?? undefined,
        avatarUrl: u.avatarUrl ?? undefined,
        phone: u.phone ?? undefined, name: u.name,
        firstName: u.firstName ?? undefined, lastName: u.lastName ?? undefined,
        tag: u.tag, province: u.province ?? undefined, city: u.city,
        messenger: (u.messenger as any) ?? undefined,
        primaryDisc: u.primaryDisc,
        discs: u.discs ? u.discs.split(',').filter(Boolean) : undefined,
        experienceYears: u.experienceYears ?? undefined,
        teamName: u.teamName ?? undefined,
        nationalId: u.nationalId ?? undefined,
        role: u.role as any, coinBalance: u.coinBalance,
        createdAt: ms(u.createdAt), deletedAt: u.deletedAt ? ms(u.deletedAt) : undefined,
        playerId: u.playerId ?? undefined,
      })

      const ev = await d.select().from(schema.events)
      for (const e of ev) loaders.loadEvent({
        id: e.id, title: e.title, season: e.season, disc: e.disc,
        tier: (e.tier as any) ?? 'A',
        prize: e.prize, teams: e.teams, maxPlayers: e.maxPlayers ?? undefined,
        status: e.status as any, statusLabel: e.statusLabel, format: e.format,
        date: e.date ?? '',
        startsAt: e.startsAt ? ms(e.startsAt) : undefined,
        regDeadline: e.regDeadline ? ms(e.regDeadline) : undefined,
        organizerId: e.organizerId, createdAt: ms(e.createdAt),
      })

      const rg = await d.select().from(schema.registrations)
      for (const r of rg) loaders.loadReg({
        id: r.id, userId: r.userId, compId: r.compId,
        attempts: r.attempts, seedsEarned: r.seedsEarned, prelimsCompleted: r.prelimsCompleted,
        createdAt: ms(r.createdAt),
      })

      const pls = await d.select().from(schema.placements)
      for (const pl of pls) loaders.loadPlacement({
        id: pl.id, userId: pl.userId, compId: pl.compId,
        disc: pl.disc, rank: pl.rank, createdAt: ms(pl.createdAt),
      })

      const ns = await d.select().from(schema.notifications).orderBy(schema.notifications.createdAt)
      for (const n of ns.reverse()) loaders.loadNotif({
        id: n.id, userId: n.userId, type: n.type as any, title: n.title,
        body: n.body, read: n.read, createdAt: ms(n.createdAt),
      })

      const mt = await d.select().from(schema.matches)
      for (const m of mt) loaders.loadMatch({
        id: m.id, compId: m.compId, bracket: m.bracket, round: m.round, slot: m.slot,
        p1UserId: m.p1UserId ?? undefined, p2UserId: m.p2UserId ?? undefined,
        winnerUserId: m.winnerUserId ?? undefined, score: m.score ?? undefined,
        status: m.status as any, createdAt: ms(m.createdAt),
      })

      console.log('[db] hydrated:', us.length, 'users,', ev.length, 'events,', rg.length, 'regs,', pls.length, 'placements,', ns.length, 'notifs,', mt.length, 'matches')
    } catch (err) {
      console.error('[db] hydration failed; continuing in-memory:', err)
    } finally {
      hydrated = true
      hydrating = null
    }
  })()
  return hydrating
}

// ── write-through helpers ─────────────────────────────────────────────────

function fire(promise: Promise<any> | undefined) {
  if (!promise) return
  promise.catch(err => console.error('[db] write failed:', err))
}

export const persist = {
  user: {
    insert(u: User) {
      const d = db(); if (!d) return
      fire(d.insert(schema.users).values({
        id: u.id, email: u.email, googleSub: u.googleSub, avatarUrl: u.avatarUrl,
        phone: u.phone, name: u.name, firstName: u.firstName, lastName: u.lastName,
        tag: u.tag, province: u.province, city: u.city, messenger: u.messenger,
        primaryDisc: u.primaryDisc, discs: (u.discs ?? []).join(','),
        experienceYears: u.experienceYears, teamName: u.teamName,
        nationalId: u.nationalId,
        role: u.role, coinBalance: u.coinBalance ?? 0,
        playerId: u.playerId,
      }).onConflictDoNothing())
    },
    update(id: string, patch: Partial<User>) {
      const d = db(); if (!d) return
      const set: any = {}
      if (patch.name !== undefined)        set.name = patch.name
      if (patch.firstName !== undefined)   set.firstName = patch.firstName
      if (patch.lastName !== undefined)    set.lastName = patch.lastName
      if (patch.tag !== undefined)         set.tag = patch.tag
      if (patch.province !== undefined)    set.province = patch.province
      if (patch.city !== undefined)        set.city = patch.city
      if (patch.messenger !== undefined)   set.messenger = patch.messenger
      if (patch.primaryDisc !== undefined) set.primaryDisc = patch.primaryDisc
      if (patch.discs !== undefined)       set.discs = (patch.discs ?? []).join(',')
      if (patch.experienceYears !== undefined) set.experienceYears = patch.experienceYears
      if (patch.teamName !== undefined)    set.teamName = patch.teamName
      if (patch.nationalId !== undefined)  set.nationalId = patch.nationalId
      if (patch.email !== undefined)       set.email = patch.email
      if (patch.googleSub !== undefined)   set.googleSub = patch.googleSub
      if (patch.avatarUrl !== undefined)   set.avatarUrl = patch.avatarUrl
      if (Object.keys(set).length === 0) return
      fire(d.update(schema.users).set(set).where(eq(schema.users.id, id)))
    },
    setCoinBalance(id: string, balance: number) {
      const d = db(); if (!d) return
      fire(d.update(schema.users).set({ coinBalance: balance }).where(eq(schema.users.id, id)))
    },
    setRole(id: string, role: string) {
      const d = db(); if (!d) return
      fire(d.update(schema.users).set({ role: role as any }).where(eq(schema.users.id, id)))
    },
  },
  event: {
    insert(e: Event) {
      const d = db(); if (!d) return
      fire(d.insert(schema.events).values({
        id: e.id, title: e.title, season: e.season, disc: e.disc,
        tier: e.tier ?? 'A',
        prize: e.prize, teams: e.teams, maxPlayers: e.maxPlayers,
        status: e.status, statusLabel: e.statusLabel, format: e.format, date: e.date,
        startsAt: e.startsAt ? new Date(e.startsAt) : undefined,
        regDeadline: e.regDeadline ? new Date(e.regDeadline) : undefined,
        organizerId: e.organizerId,
      }).onConflictDoNothing())
    },
    updateStatus(id: string, status: Event['status'], statusLabel: string) {
      const d = db(); if (!d) return
      fire(d.update(schema.events).set({ status, statusLabel }).where(eq(schema.events.id, id)))
    },
  },
  reg: {
    insert(r: Registration) {
      const d = db(); if (!d) return
      fire(d.insert(schema.registrations).values({
        id: r.id, userId: r.userId, compId: r.compId,
        attempts: r.attempts, seedsEarned: r.seedsEarned, prelimsCompleted: r.prelimsCompleted,
      }).onConflictDoNothing())
    },
    update(id: string, patch: Partial<Registration>) {
      const d = db(); if (!d) return
      const set: any = {}
      if (patch.seedsEarned !== undefined)      set.seedsEarned = patch.seedsEarned
      if (patch.prelimsCompleted !== undefined) set.prelimsCompleted = patch.prelimsCompleted
      if (Object.keys(set).length === 0) return
      fire(d.update(schema.registrations).set(set).where(eq(schema.registrations.id, id)))
    },
  },
  match: {
    insert(m: { id: string; compId: string; bracket: number; round: number; slot: number; p1UserId?: string; p2UserId?: string; winnerUserId?: string; score?: string; status: string }) {
      const d = db(); if (!d) return
      fire(d.insert(schema.matches).values({
        id: m.id, compId: m.compId, bracket: m.bracket, round: m.round, slot: m.slot,
        p1UserId: m.p1UserId, p2UserId: m.p2UserId, winnerUserId: m.winnerUserId,
        score: m.score, status: m.status as any,
      }).onConflictDoUpdate({
        target: schema.matches.id,
        set: { p1UserId: m.p1UserId, p2UserId: m.p2UserId, winnerUserId: m.winnerUserId, score: m.score, status: m.status as any },
      }))
    },
    clearForComp(compId: string) {
      const d = db(); if (!d) return
      fire(d.delete(schema.matches).where(eq(schema.matches.compId, compId)))
    },
  },
  notif: {
    insert(n: Notification) {
      const d = db(); if (!d) return
      fire(d.insert(schema.notifications).values({
        id: n.id, userId: n.userId, type: n.type, title: n.title,
        body: n.body, read: n.read,
      }).onConflictDoNothing())
    },
    markAllRead(userId: string) {
      const d = db(); if (!d) return
      fire(d.update(schema.notifications).set({ read: true }).where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.read, false))))
    },
  },
  coinTxn: {
    insert(id: string, userId: string, delta: number, reason: string, ref?: string) {
      const d = db(); if (!d) return
      fire(d.insert(schema.coinTxns).values({ id, userId, delta, reason, ref }))
    },
  },
  placement: {
    insert(pl: { id: string; userId: string; compId: string; disc: string; rank: number }) {
      const d = db(); if (!d) return
      fire(d.insert(schema.placements).values({
        id: pl.id, userId: pl.userId, compId: pl.compId, disc: pl.disc, rank: pl.rank,
      }).onConflictDoUpdate({ target: [schema.placements.userId, schema.placements.compId], set: { rank: pl.rank } }))
    },
  },
}
