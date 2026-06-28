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
}): Promise<void> {
  if (hydrated || hydrating) return hydrating ?? Promise.resolve()
  const d = db()
  if (!d) { hydrated = true; return Promise.resolve() }
  hydrating = (async () => {
    try {
      const us = await d.select().from(schema.users)
      for (const u of us) loaders.loadUser({
        id: u.id, phone: u.phone, name: u.name, tag: u.tag, city: u.city,
        primaryDisc: u.primaryDisc, nationalId: u.nationalId ?? undefined,
        role: u.role as any, coinBalance: u.coinBalance,
        createdAt: u.createdAt instanceof Date ? u.createdAt.getTime() : Date.now(),
        playerId: u.playerId ?? undefined,
      })
      const ev = await d.select().from(schema.events)
      for (const e of ev) loaders.loadEvent({
        id: e.id, title: e.title, season: e.season, disc: e.disc,
        tier: (e as any).tier ?? 'A',
        prize: e.prize, teams: e.teams, status: e.status as any,
        statusLabel: e.statusLabel, format: e.format, date: e.date ?? '',
        organizerId: e.organizerId,
        createdAt: e.createdAt instanceof Date ? e.createdAt.getTime() : Date.now(),
      })
      const pls = await d.select().from(schema.placements)
      for (const pl of pls) loaders.loadPlacement({
        id: pl.id, userId: pl.userId, compId: pl.compId,
        disc: pl.disc, rank: pl.rank,
        createdAt: pl.createdAt instanceof Date ? pl.createdAt.getTime() : Date.now(),
      })
      console.log('[db] hydrated:', us.length, 'users,', ev.length, 'events,', rg.length, 'regs,', pls.length, 'placements,', ns.length, 'notifs')
      const rg = await d.select().from(schema.registrations)
      for (const r of rg) loaders.loadReg({
        id: r.id, userId: r.userId, compId: r.compId,
        attempts: r.attempts, seedsEarned: r.seedsEarned, prelimsCompleted: r.prelimsCompleted,
        createdAt: r.createdAt instanceof Date ? r.createdAt.getTime() : Date.now(),
      })
      const ns = await d.select().from(schema.notifications).orderBy(schema.notifications.createdAt)
      for (const n of ns.reverse()) loaders.loadNotif({
        id: n.id, userId: n.userId, type: n.type as any, title: n.title,
        body: n.body, read: n.read,
        createdAt: n.createdAt instanceof Date ? n.createdAt.getTime() : Date.now(),
      })
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
        id: u.id, phone: u.phone, name: u.name, tag: u.tag, city: u.city,
        primaryDisc: u.primaryDisc, nationalId: u.nationalId,
        role: u.role, coinBalance: 0,
        playerId: u.playerId,
      }).onConflictDoNothing())
    },
    update(id: string, patch: Partial<User>) {
      const d = db(); if (!d) return
      const set: any = {}
      if (patch.name !== undefined) set.name = patch.name
      if (patch.tag !== undefined) set.tag = patch.tag
      if (patch.city !== undefined) set.city = patch.city
      if (patch.primaryDisc !== undefined) set.primaryDisc = patch.primaryDisc
      if (patch.nationalId !== undefined) set.nationalId = patch.nationalId
      if (Object.keys(set).length === 0) return
      const { eq } = require('drizzle-orm')
      fire(d.update(schema.users).set(set).where(eq(schema.users.id, id)))
    },
    setCoinBalance(id: string, balance: number) {
      const d = db(); if (!d) return
      const { eq } = require('drizzle-orm')
      fire(d.update(schema.users).set({ coinBalance: balance }).where(eq(schema.users.id, id)))
    },
  },
  event: {
    insert(e: Event) {
      const d = db(); if (!d) return
      fire(d.insert(schema.events).values({
        id: e.id, title: e.title, season: e.season, disc: e.disc,
        tier: e.tier ?? 'A',
        prize: e.prize, teams: e.teams, status: e.status,
        statusLabel: e.statusLabel, format: e.format, date: e.date,
        organizerId: e.organizerId,
      }).onConflictDoNothing())
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
      if (patch.seedsEarned !== undefined) set.seedsEarned = patch.seedsEarned
      if (patch.prelimsCompleted !== undefined) set.prelimsCompleted = patch.prelimsCompleted
      if (Object.keys(set).length === 0) return
      const { eq } = require('drizzle-orm')
      fire(d.update(schema.registrations).set(set).where(eq(schema.registrations.id, id)))
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
      const { eq, and } = require('drizzle-orm')
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
