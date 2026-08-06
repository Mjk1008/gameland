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

import { eq, and, sql } from 'drizzle-orm'
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
  loadTeam?:     (t: any) => void
  loadTeamMember?: (m: any) => void
  loadEventConfig?: (compId: string, json: string) => void
  loadCompetition?: (c: any) => void
  loadPromo?:    (p: any) => void
  loadNews?:     (n: any) => void
  loadSetting?:  (k: string, v: string) => void
  loadAvatarId?: (userId: string) => void
  loadReceiptId?: (regId: string) => void
  loadGamenet?:  (g: any) => void
  loadGamenetPhotoId?: (gamenetId: string, photoId: string) => void
}): Promise<void> {
  if (hydrated || hydrating) return hydrating ?? Promise.resolve()
  const d = db()
  if (!d) { hydrated = true; return Promise.resolve() }
  hydrating = (async () => {
    try {
      const ms = (v: any) => (v instanceof Date ? v.getTime() : Date.now())

      // Idempotent schema self-heal on boot — lets new tables/columns land via
      // deploy without a manual migration (the app can reach the DB; the
      // sandbox can't). All guarded with IF NOT EXISTS.
      for (const stmt of [
        `CREATE TABLE IF NOT EXISTS app_competitions (id TEXT PRIMARY KEY, title TEXT NOT NULL, location TEXT NOT NULL DEFAULT '', date TEXT NOT NULL DEFAULT '', poster_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
        `ALTER TABLE app_events ADD COLUMN IF NOT EXISTS competition_id TEXT`,
        `ALTER TABLE app_events ADD COLUMN IF NOT EXISTS final_size INTEGER`,
        `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS bonus_points INTEGER`,
        `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS referred_by TEXT`,
        `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS free_tickets INTEGER`,
        `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS referral_milestone INTEGER`,
        `ALTER TABLE app_registrations ADD COLUMN IF NOT EXISTS free_attempts INTEGER`,
        `ALTER TABLE app_registrations ADD COLUMN IF NOT EXISTS reject_reason TEXT`,
        `ALTER TABLE app_registrations ADD COLUMN IF NOT EXISTS paid_attempts INTEGER`,
        `CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '', updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
        `CREATE TABLE IF NOT EXISTS app_ai_messages (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, prompt_tokens INTEGER NOT NULL DEFAULT 0, completion_tokens INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
        `CREATE TABLE IF NOT EXISTS app_promos (id TEXT PRIMARY KEY, image_data TEXT NOT NULL, link_type TEXT NOT NULL DEFAULT 'none', event_id TEXT, url TEXT, sort INTEGER NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
        `CREATE TABLE IF NOT EXISTS app_avatars (user_id TEXT PRIMARY KEY, data_url TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
        `CREATE TABLE IF NOT EXISTS app_receipts (reg_id TEXT PRIMARY KEY, data_url TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
        `CREATE TABLE IF NOT EXISTS app_news (id TEXT PRIMARY KEY, image_data TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
        `CREATE TABLE IF NOT EXISTS app_track_events (id TEXT PRIMARY KEY, user_id TEXT, session_id TEXT NOT NULL, name TEXT NOT NULL, path TEXT NOT NULL DEFAULT '', props TEXT NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
        `CREATE INDEX IF NOT EXISTS app_track_events_name_idx ON app_track_events (name, created_at)`,
        `CREATE INDEX IF NOT EXISTS app_track_events_session_idx ON app_track_events (session_id, created_at)`,
        `CREATE TABLE IF NOT EXISTS app_gamenets (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, name TEXT NOT NULL, city TEXT NOT NULL, address TEXT NOT NULL, phone TEXT, stations INTEGER NOT NULL DEFAULT 0, disciplines TEXT NOT NULL DEFAULT '', verified BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
        `CREATE INDEX IF NOT EXISTS gn_city_idx ON app_gamenets (city)`,
        `ALTER TABLE app_gamenets ADD COLUMN IF NOT EXISTS province TEXT`,
        `ALTER TABLE app_gamenets ADD COLUMN IF NOT EXISTS instagram_url TEXT`,
        `ALTER TABLE app_gamenets ADD COLUMN IF NOT EXISTS consoles TEXT NOT NULL DEFAULT '[]'`,
        `ALTER TABLE app_gamenets ADD COLUMN IF NOT EXISTS games TEXT NOT NULL DEFAULT ''`,
        `ALTER TABLE app_gamenets ADD COLUMN IF NOT EXISTS features TEXT NOT NULL DEFAULT ''`,
        `ALTER TABLE app_gamenets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`,
        `ALTER TABLE app_gamenets ADD COLUMN IF NOT EXISTS reject_reason TEXT`,
        `ALTER TABLE app_gamenets ADD COLUMN IF NOT EXISTS map_url TEXT`,
        `ALTER TABLE app_gamenets ADD COLUMN IF NOT EXISTS open_hours TEXT`,
        `UPDATE app_gamenets SET status = 'verified' WHERE verified = true AND (status IS NULL OR status = 'pending')`,
        `CREATE TABLE IF NOT EXISTS app_gamenet_photos (gamenet_id TEXT PRIMARY KEY, data_url TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
        `DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'app_gamenet_photos' AND column_name = 'gamenet_id')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'app_gamenet_photos' AND column_name = 'id')
          THEN
            CREATE TABLE app_gamenet_photos_v2 (id TEXT PRIMARY KEY, gamenet_id TEXT NOT NULL, data_url TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
            INSERT INTO app_gamenet_photos_v2 (id, gamenet_id, data_url, sort, created_at)
              SELECT 'gpn_' || gamenet_id, gamenet_id, data_url, 0, created_at FROM app_gamenet_photos;
            DROP TABLE app_gamenet_photos;
            ALTER TABLE app_gamenet_photos_v2 RENAME TO app_gamenet_photos;
          END IF;
        END $$`,
        `CREATE INDEX IF NOT EXISTS gn_photo_gamenet_idx ON app_gamenet_photos (gamenet_id)`,
        `ALTER TABLE app_matches ADD COLUMN IF NOT EXISTS p1_team_id TEXT`,
        `ALTER TABLE app_matches ADD COLUMN IF NOT EXISTS p2_team_id TEXT`,
        `ALTER TABLE app_matches ADD COLUMN IF NOT EXISTS winner_team_id TEXT`,
        `ALTER TABLE app_registrations ADD COLUMN IF NOT EXISTS team_id TEXT`,
        `CREATE TABLE IF NOT EXISTS app_teams (id TEXT PRIMARY KEY, comp_id TEXT NOT NULL REFERENCES app_events(id) ON DELETE CASCADE, name TEXT NOT NULL, captain_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'forming', attempts INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
        `CREATE INDEX IF NOT EXISTS team_comp_idx ON app_teams (comp_id)`,
        `CREATE TABLE IF NOT EXISTS app_team_members (team_id TEXT NOT NULL REFERENCES app_teams(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, slot INTEGER NOT NULL, status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (team_id, user_id))`,
      ]) { try { await d.execute(sql.raw(stmt)) } catch (e) { console.error('[db] ensureSchema:', e) } }

      const cps = await d.select().from(schema.competitions)
      for (const c of cps) loaders.loadCompetition?.({
        id: c.id, title: c.title, location: c.location ?? '', date: c.date ?? '',
        posterUrl: c.posterUrl ?? undefined, createdAt: ms(c.createdAt),
      })

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
        passwordHash: (u as any).passwordHash ?? undefined,
        role: u.role as any, coinBalance: u.coinBalance,
        createdAt: ms(u.createdAt), deletedAt: u.deletedAt ? ms(u.deletedAt) : undefined,
        playerId: u.playerId ?? undefined,
        bonusPoints: (u as any).bonusPoints ?? undefined,
        referredBy: (u as any).referredBy ?? undefined,
        freeTickets: (u as any).freeTickets ?? undefined,
        referralMilestone: (u as any).referralMilestone ?? undefined,
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
        competitionId: (e as any).competitionId ?? undefined,
        finalSize: (e as any).finalSize ?? undefined,
      })
      for (const e of ev) if ((e as any).config) loaders.loadEventConfig?.(e.id, (e as any).config)

      const rg = await d.select().from(schema.registrations)
      for (const r of rg) loaders.loadReg({
        id: r.id, userId: r.userId, compId: r.compId,
        attempts: r.attempts, status: (r as any).status ?? 'approved',
        freeAttempts: (r as any).freeAttempts ?? undefined,
        rejectReason: (r as any).rejectReason ?? undefined,
        paidAttempts: (r as any).paidAttempts ?? undefined,
        seedsEarned: r.seedsEarned, prelimsCompleted: r.prelimsCompleted,
        teamId: (r as any).teamId ?? undefined,
        createdAt: ms(r.createdAt),
      })

      const tms = await d.select().from(schema.teams)
      for (const t of tms) loaders.loadTeam?.({
        id: t.id, compId: t.compId, name: t.name, captainId: t.captainId,
        status: t.status as any, attempts: t.attempts, createdAt: ms(t.createdAt),
      })
      // Ordered by createdAt — currentTeamMembers() in store.ts takes the LAST
      // row per (team, slot) as active; hydration must replay in the same
      // order the app created them, or a restart could resurrect a replaced
      // partner as "current".
      const tmm = await d.select().from(schema.teamMembers).orderBy(schema.teamMembers.createdAt)
      for (const m of tmm) loaders.loadTeamMember?.({
        teamId: m.teamId, userId: m.userId, slot: m.slot, status: m.status as any,
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
        id: m.id, compId: m.compId,
        stage: ((m as any).stage as any) ?? 'prelim', groupKey: (m as any).groupKey ?? '',
        bracket: m.bracket, round: m.round, slot: m.slot,
        p1UserId: m.p1UserId ?? undefined, p2UserId: m.p2UserId ?? undefined,
        winnerUserId: m.winnerUserId ?? undefined,
        p1TeamId: (m as any).p1TeamId ?? undefined, p2TeamId: (m as any).p2TeamId ?? undefined,
        winnerTeamId: (m as any).winnerTeamId ?? undefined,
        score: m.score ?? undefined,
        status: m.status as any, createdAt: ms(m.createdAt),
      })

      try {
        const pr = await d.select().from(schema.promos)
        for (const p of pr) loaders.loadPromo?.({
          id: p.id, imageData: p.imageData, linkType: (p as any).linkType ?? 'none',
          eventId: p.eventId ?? undefined, url: p.url ?? undefined,
          sort: p.sort ?? 0, active: p.active ?? true, createdAt: ms(p.createdAt),
        })

      try {
        const nw = await d.select().from(schema.news)
        for (const n of nw) loaders.loadNews?.({
          id: n.id, imageData: n.imageData, title: n.title, body: n.body,
          tags: n.tags ? n.tags.split(',').filter(Boolean) : [],
          sort: n.sort, active: n.active, createdAt: ms(n.createdAt),
        })
      } catch (e) { console.error('[db] load news:', e) }

      try {
        const st = await d.select().from(schema.settings)
        for (const row of st) loaders.loadSetting?.(row.key, row.value)
      } catch (e) { console.error('[db] load settings:', e) }
      } catch (e) { console.error('[db] load promos:', e) }

      try {
        // Only the ids — never the base64 payloads — so RAM stays flat at scale.
        const av = await d.execute(sql.raw('SELECT user_id FROM app_avatars'))
        for (const row of (av as any as { user_id: string }[])) loaders.loadAvatarId?.(row.user_id)
      } catch (e) { console.error('[db] load avatar ids:', e) }

      try {
        const rc = await d.execute(sql.raw('SELECT reg_id FROM app_receipts'))
        for (const row of (rc as any as { reg_id: string }[])) loaders.loadReceiptId?.(row.reg_id)
      } catch (e) { console.error('[db] load receipt ids:', e) }

      try {
        const gn = await d.select().from(schema.gamenets)
        for (const g of gn) loaders.loadGamenet?.({
          id: g.id, ownerId: g.ownerId, name: g.name,
          province: (g as any).province ?? undefined, city: g.city, address: g.address,
          phone: g.phone ?? undefined, instagramUrl: (g as any).instagramUrl ?? undefined,
          mapUrl: (g as any).mapUrl ?? undefined, openHours: (g as any).openHours ?? undefined,
          stations: g.stations,
          consoles: (() => { try { return JSON.parse((g as any).consoles ?? '[]') } catch { return [] } })(),
          disciplines: g.disciplines ? g.disciplines.split(',').filter(Boolean) : [],
          games: (g as any).games ? (g as any).games.split(',').filter(Boolean) : [],
          features: (g as any).features ? (g as any).features.split(',').filter(Boolean) : [],
          status: ((g as any).status as any) || (g.verified ? 'verified' : 'pending'),
          rejectReason: (g as any).rejectReason ?? undefined,
          verified: g.verified, createdAt: ms(g.createdAt),
        })
      } catch (e) { console.error('[db] load gamenets:', e) }

      try {
        // Ids only — bytes stay in Postgres, served on demand.
        const gp = await d.execute(sql.raw('SELECT id, gamenet_id FROM app_gamenet_photos ORDER BY sort, created_at'))
        for (const row of (gp as any as { id: string; gamenet_id: string }[])) {
          loaders.loadGamenetPhotoId?.(row.gamenet_id, row.id)
        }
      } catch (e) { console.error('[db] load gamenet photo ids:', e) }

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

// Per-row write-ordering queue, keyed by an identity string (e.g. a match
// id). A single fire-and-forget write per row is safe (that's what fire()
// is for), but bracket resolution can issue TWO writes to the SAME match row
// within one synchronous call (e.g. buildTree pushes a match 'pending', then
// resolveByes immediately flips it to 'done' in the same tick) — two
// un-awaited writes on a pooled connection have no ordering guarantee against
// each other and can land at Postgres out of issue-order, silently reverting
// the row to its earlier state. Chaining same-key writes through one promise
// preserves issue-order without requiring every call site to become async.
const writeChains = new Map<string, Promise<any>>()
function fireOrdered(key: string, run: () => Promise<any> | undefined) {
  const prev = writeChains.get(key) ?? Promise.resolve()
  const next = prev.then(() => run()).catch(err => console.error('[db] write failed:', err))
  writeChains.set(key, next)
}

function userValues(u: User) {
  return {
    id: u.id, email: u.email, googleSub: u.googleSub, avatarUrl: u.avatarUrl,
    phone: u.phone, name: u.name, firstName: u.firstName, lastName: u.lastName,
    tag: u.tag, province: u.province, city: u.city, messenger: u.messenger,
    primaryDisc: u.primaryDisc, discs: (u.discs ?? []).join(','),
    experienceYears: u.experienceYears, teamName: u.teamName,
    nationalId: u.nationalId, passwordHash: u.passwordHash,
    role: u.role, coinBalance: u.coinBalance ?? 0,
    playerId: u.playerId, bonusPoints: u.bonusPoints,
    referredBy: u.referredBy, freeTickets: u.freeTickets, referralMilestone: u.referralMilestone,
  }
}

export const persist = {
  user: {
    insert(u: User) {
      const d = db(); if (!d) return
      fire(d.insert(schema.users).values(userValues(u)).onConflictDoNothing())
    },
    // Awaitable + idempotent — used on the critical signup/register path so the
    // HTTP 200 only returns once the user row is actually committed (durability).
    async insertAsync(u: User) {
      const d = db(); if (!d) return
      await d.insert(schema.users).values(userValues(u)).onConflictDoNothing()
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
      if (patch.playerId !== undefined)    set.playerId = patch.playerId
      if (patch.bonusPoints !== undefined) set.bonusPoints = patch.bonusPoints
      if (patch.referredBy !== undefined)  set.referredBy = patch.referredBy
      if (patch.freeTickets !== undefined) set.freeTickets = patch.freeTickets
      if (patch.referralMilestone !== undefined) set.referralMilestone = patch.referralMilestone
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
    setPassword(id: string, passwordHash: string) {
      const d = db(); if (!d) return
      fire(d.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, id)))
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
        competitionId: e.competitionId, finalSize: e.finalSize,
      }).onConflictDoNothing())
    },
    updateStatus(id: string, status: Event['status'], statusLabel: string) {
      const d = db(); if (!d) return
      fire(d.update(schema.events).set({ status, statusLabel }).where(eq(schema.events.id, id)))
    },
    setConfig(id: string, configJson: string) {
      const d = db(); if (!d) return
      fire(d.update(schema.events).set({ config: configJson }).where(eq(schema.events.id, id)))
    },
    delete(id: string) {
      const d = db(); if (!d) return
      fire(d.delete(schema.events).where(eq(schema.events.id, id)))
    },
    update(id: string, e: Event) {
      const d = db(); if (!d) return
      fire(d.update(schema.events).set({
        title: e.title, season: e.season, disc: e.disc, tier: e.tier,
        prize: e.prize, teams: e.teams, maxPlayers: e.maxPlayers,
        status: e.status, statusLabel: e.statusLabel, format: e.format, date: e.date,
        startsAt: e.startsAt ? new Date(e.startsAt) : undefined,
        regDeadline: e.regDeadline ? new Date(e.regDeadline) : undefined,
        competitionId: e.competitionId, finalSize: e.finalSize,
      }).where(eq(schema.events.id, id)))
    },
  },
  competition: {
    insert(c: { id: string; title: string; location: string; date: string; posterUrl?: string }) {
      const d = db(); if (!d) return
      fire(d.insert(schema.competitions).values({
        id: c.id, title: c.title, location: c.location, date: c.date, posterUrl: c.posterUrl,
      }).onConflictDoNothing())
    },
    update(id: string, c: { title: string; location: string; date: string; posterUrl?: string }) {
      const d = db(); if (!d) return
      fire(d.update(schema.competitions).set({ title: c.title, location: c.location, date: c.date, posterUrl: c.posterUrl }).where(eq(schema.competitions.id, id)))
    },
    delete(id: string) {
      const d = db(); if (!d) return
      fire(d.delete(schema.competitions).where(eq(schema.competitions.id, id)))
    },
  },
  reg: {
    insert(r: Registration) {
      const d = db(); if (!d) return
      fire(d.insert(schema.registrations).values({
        id: r.id, userId: r.userId, compId: r.compId,
        attempts: r.attempts, status: r.status, seedsEarned: r.seedsEarned, prelimsCompleted: r.prelimsCompleted, freeAttempts: r.freeAttempts, paidAttempts: r.paidAttempts, teamId: (r as any).teamId,
      }).onConflictDoNothing())
    },
    // Awaitable + idempotent — used on the register path so a registration is
    // committed before the 200, and only after its user row (no FK race).
    async insertAsync(r: Registration) {
      const d = db(); if (!d) return
      await d.insert(schema.registrations).values({
        id: r.id, userId: r.userId, compId: r.compId,
        attempts: r.attempts, status: r.status, seedsEarned: r.seedsEarned, prelimsCompleted: r.prelimsCompleted, freeAttempts: r.freeAttempts, paidAttempts: r.paidAttempts, teamId: (r as any).teamId,
      }).onConflictDoUpdate({ target: schema.registrations.id, set: { attempts: r.attempts, status: r.status as any, freeAttempts: r.freeAttempts, paidAttempts: r.paidAttempts, teamId: (r as any).teamId } })
    },
    update(id: string, patch: Partial<Registration>) {
      const d = db(); if (!d) return
      const set: any = {}
      if (patch.seedsEarned !== undefined)      set.seedsEarned = patch.seedsEarned
      if (patch.prelimsCompleted !== undefined) set.prelimsCompleted = patch.prelimsCompleted
      if (patch.attempts !== undefined)         set.attempts = patch.attempts
      if ((patch as any).freeAttempts !== undefined) set.freeAttempts = (patch as any).freeAttempts
      if ((patch as any).rejectReason !== undefined) set.rejectReason = (patch as any).rejectReason
      if ((patch as any).paidAttempts !== undefined) set.paidAttempts = (patch as any).paidAttempts
      if ((patch as any).status !== undefined)  set.status = (patch as any).status
      if ((patch as any).teamId !== undefined)  set.teamId = (patch as any).teamId
      if (Object.keys(set).length === 0) return
      fire(d.update(schema.registrations).set(set).where(eq(schema.registrations.id, id)))
    },
  },
  team: {
    insert(t: { id: string; compId: string; name: string; captainId: string; status: string; attempts: number }) {
      const d = db(); if (!d) return
      fire(d.insert(schema.teams).values({
        id: t.id, compId: t.compId, name: t.name, captainId: t.captainId, status: t.status as any, attempts: t.attempts,
      }).onConflictDoNothing())
    },
    // Awaited on the create path — same ordering reason as reg.insertAsync:
    // members/registration inserts that follow must not race this row.
    async insertAsync(t: { id: string; compId: string; name: string; captainId: string; status: string; attempts: number }) {
      const d = db(); if (!d) return
      await d.insert(schema.teams).values({
        id: t.id, compId: t.compId, name: t.name, captainId: t.captainId, status: t.status as any, attempts: t.attempts,
      }).onConflictDoNothing()
    },
    update(id: string, patch: { status?: string }) {
      const d = db(); if (!d) return
      const set: any = {}
      if (patch.status !== undefined) set.status = patch.status
      if (Object.keys(set).length === 0) return
      fire(d.update(schema.teams).set(set).where(eq(schema.teams.id, id)))
    },
  },
  teamMember: {
    insert(m: { teamId: string; userId: string; slot: number; status: string }) {
      const d = db(); if (!d) return
      fire(d.insert(schema.teamMembers).values({ teamId: m.teamId, userId: m.userId, slot: m.slot, status: m.status }).onConflictDoNothing())
    },
    async insertAsync(m: { teamId: string; userId: string; slot: number; status: string }) {
      const d = db(); if (!d) return
      await d.insert(schema.teamMembers).values({ teamId: m.teamId, userId: m.userId, slot: m.slot, status: m.status }).onConflictDoNothing()
    },
    update(teamId: string, userId: string, patch: { status?: string }) {
      const d = db(); if (!d) return
      const set: any = {}
      if (patch.status !== undefined) set.status = patch.status
      if (Object.keys(set).length === 0) return
      fire(d.update(schema.teamMembers).set(set).where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, userId))))
    },
  },
  match: {
    insert(m: { id: string; compId: string; stage?: string; groupKey?: string; bracket: number; round: number; slot: number; p1UserId?: string; p2UserId?: string; winnerUserId?: string; p1TeamId?: string; p2TeamId?: string; winnerTeamId?: string; score?: string; status: string }) {
      const d = db(); if (!d) return
      // Ordered per match id — see fireOrdered's comment. Bracket resolution
      // (a fresh draw immediately resolving its own byes, or a played match
      // triggering downstream bye resolution) can issue two writes to the
      // SAME row within one synchronous call; without ordering, the second
      // write can land before the first and get silently overwritten.
      fireOrdered(m.id, () => d.insert(schema.matches).values({
        id: m.id, compId: m.compId, stage: m.stage ?? 'prelim', groupKey: m.groupKey ?? '',
        bracket: m.bracket, round: m.round, slot: m.slot,
        p1UserId: m.p1UserId, p2UserId: m.p2UserId, winnerUserId: m.winnerUserId,
        p1TeamId: m.p1TeamId, p2TeamId: m.p2TeamId, winnerTeamId: m.winnerTeamId,
        score: m.score, status: m.status as any,
      }).onConflictDoUpdate({
        target: schema.matches.id,
        // Every mutable field must appear here, even ones this call didn't
        // change — a key missing from `set` (not merely undefined-valued)
        // would silently drop it on re-save (docs/27 §1.4 risk #5).
        set: { p1UserId: m.p1UserId, p2UserId: m.p2UserId, winnerUserId: m.winnerUserId, p1TeamId: m.p1TeamId, p2TeamId: m.p2TeamId, winnerTeamId: m.winnerTeamId, score: m.score, status: m.status as any },
      }))
    },
    // Awaited by callers (generatePrelims) — a subsequent buildTree() creates
    // this comp's new matches right after, and that write must not race the
    // clear (see store.ts clearMatchesForComp / clearMatchesByStage).
    async clearForComp(compId: string) {
      const d = db(); if (!d) return
      await d.delete(schema.matches).where(eq(schema.matches.compId, compId))
    },
    // Scoped to one stage — used when re-assembling just the final without
    // touching completed prelim matches. Awaited for the same reason.
    async clearByStage(compId: string, stage: string) {
      const d = db(); if (!d) return
      await d.delete(schema.matches).where(and(eq(schema.matches.compId, compId), eq(schema.matches.stage, stage as any)))
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
  setting: {
    set(key: string, value: string) {
      const d = db(); if (!d) return
      fire(d.insert(schema.settings).values({ key, value })
        .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } }))
    },
  },
  ai: {
    // chat rows go straight to Postgres and are read back only by the admin
    // monitor — the running app never holds conversations in memory.
    insert(m: { id: string; userId: string; role: string; content: string; promptTokens: number; completionTokens: number }) {
      const d = db(); if (!d) return
      fire(d.insert(schema.aiMessages).values(m).onConflictDoNothing())
    },
    async forUser(userId: string, limit = 200) {
      const d = db(); if (!d) return []
      const rows = await d.select().from(schema.aiMessages).where(eq(schema.aiMessages.userId, userId))
      return rows.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(-limit)
    },
    // Authoritative per-user daily usage. In-memory counters reset on every
    // deploy, which silently handed everyone a fresh quota.
    async usedSince(userId: string, sinceMs: number) {
      const d = db(); if (!d) return 0
      try {
        const res: any = await d.execute(sql.raw(
          `SELECT COUNT(*) AS n FROM app_ai_messages WHERE role='user' AND user_id='${userId.replace(/'/g, "''")}' AND created_at >= to_timestamp(${Math.floor(sinceMs / 1000)})`))
        const rows = (res.rows ?? res) as any[]
        return Number(rows?.[0]?.n ?? 0)
      } catch { return 0 }
    },
    // aggregate stats since a timestamp — one grouped SQL round-trip
    async statsSince(sinceMs: number) {
      const d = db(); if (!d) return []
      const res: any = await d.execute(sql.raw(
        `SELECT user_id, COUNT(*) FILTER (WHERE role='user') AS questions, SUM(prompt_tokens) AS pt, SUM(completion_tokens) AS ct, MAX(created_at) AS last_at
         FROM app_ai_messages WHERE created_at >= to_timestamp(${Math.floor(sinceMs / 1000)}) GROUP BY user_id`))
      return (res.rows ?? res) as { user_id: string; questions: string; pt: string; ct: string; last_at: string }[]
    },
  },
  news: {
    insert(n: { id: string; imageData: string; title: string; body: string; tags: string[]; sort: number; active: boolean }) {
      const d = db(); if (!d) return
      fire(d.insert(schema.news).values({
        id: n.id, imageData: n.imageData, title: n.title, body: n.body, tags: n.tags.join(','), sort: n.sort, active: n.active,
      }).onConflictDoUpdate({ target: schema.news.id, set: { imageData: n.imageData, title: n.title, body: n.body, tags: n.tags.join(','), sort: n.sort, active: n.active } }))
    },
    delete(id: string) {
      const d = db(); if (!d) return
      fire(d.delete(schema.news).where(eq(schema.news.id, id)))
    },
  },
  promo: {
    insert(p: { id: string; imageData: string; linkType: string; eventId?: string; url?: string; sort: number; active: boolean }) {
      const d = db(); if (!d) return
      fire(d.insert(schema.promos).values({
        id: p.id, imageData: p.imageData, linkType: p.linkType, eventId: p.eventId,
        url: p.url, sort: p.sort, active: p.active,
      }).onConflictDoUpdate({ target: schema.promos.id, set: { imageData: p.imageData, linkType: p.linkType, eventId: p.eventId, url: p.url, sort: p.sort, active: p.active } }))
    },
    delete(id: string) {
      const d = db(); if (!d) return
      fire(d.delete(schema.promos).where(eq(schema.promos.id, id)))
    },
  },
  avatar: {
    // Awaitable upsert — the avatar bytes live only in Postgres, never in the
    // in-memory store, so 10k photos don't touch RAM or hydration.
    async upsertAsync(userId: string, dataUrl: string) {
      const d = db(); if (!d) return
      await d.insert(schema.avatars).values({ userId, dataUrl })
        .onConflictDoUpdate({ target: schema.avatars.userId, set: { dataUrl, updatedAt: new Date() } })
    },
    async read(userId: string): Promise<string | null> {
      const d = db(); if (!d) return null
      const rows = await d.select({ dataUrl: schema.avatars.dataUrl }).from(schema.avatars).where(eq(schema.avatars.userId, userId)).limit(1)
      return rows[0]?.dataUrl ?? null
    },
    delete(userId: string) {
      const d = db(); if (!d) return
      fire(d.delete(schema.avatars).where(eq(schema.avatars.userId, userId)))
    },
  },
  receipt: {
    // Payment receipt bytes live only in Postgres, served on demand to the admin.
    async upsertAsync(regId: string, dataUrl: string) {
      const d = db(); if (!d) return
      await d.insert(schema.receipts).values({ regId, dataUrl })
        .onConflictDoUpdate({ target: schema.receipts.regId, set: { dataUrl, createdAt: new Date() } })
    },
    async read(regId: string): Promise<string | null> {
      const d = db(); if (!d) return null
      const rows = await d.select({ dataUrl: schema.receipts.dataUrl }).from(schema.receipts).where(eq(schema.receipts.regId, regId)).limit(1)
      return rows[0]?.dataUrl ?? null
    },
  },
  // Behavioral events — write-only from the running app, read back only by
  // /admin/behavior. Never hydrated into memory (see schema.ts comment).
  track: {
    insertMany(rows: { id: string; userId?: string; sessionId: string; name: string; path: string; props: string }[]) {
      const d = db(); if (!d || !rows.length) return
      fire(d.insert(schema.trackEvents).values(rows))
    },
    // Unique actors (user, falling back to session pre-auth) per named step —
    // the right denominator for step-to-step conversion %, not raw event count.
    async funnelCounts(names: string[], sinceMs: number) {
      const d = db(); if (!d) return []
      const list = names.map(n => `'${n.replace(/'/g, "''")}'`).join(',')
      const res: any = await d.execute(sql.raw(
        `SELECT name, COUNT(DISTINCT COALESCE(user_id, session_id)) AS n
         FROM app_track_events WHERE name IN (${list}) AND created_at >= to_timestamp(${Math.floor(sinceMs / 1000)})
         GROUP BY name`))
      return (res.rows ?? res) as { name: string; n: string }[]
    },
    async topPaths(sinceMs: number, limit = 10) {
      const d = db(); if (!d) return []
      const res: any = await d.execute(sql.raw(
        `SELECT path, COUNT(*) AS n FROM app_track_events
         WHERE name='pageview' AND created_at >= to_timestamp(${Math.floor(sinceMs / 1000)})
         GROUP BY path ORDER BY n DESC LIMIT ${Math.floor(limit)}`))
      return (res.rows ?? res) as { path: string; n: string }[]
    },
    async dau(days: number) {
      const d = db(); if (!d) return []
      const res: any = await d.execute(sql.raw(
        `SELECT date_trunc('day', created_at) AS day, COUNT(DISTINCT COALESCE(user_id, session_id)) AS n
         FROM app_track_events WHERE created_at >= now() - interval '${Math.floor(days)} days'
         GROUP BY day ORDER BY day`))
      return (res.rows ?? res) as { day: string; n: string }[]
    },
    // Does talking to the assistant correlate with clearing the funnel? Rates
    // are computed against the signed-up population (not raw event counts) so
    // "chatters convert more" isn't just an artifact of chatters being a
    // smaller, more-engaged group.
    async chatCorrelation(sinceMs: number) {
      const d = db(); if (!d) return null
      const t = Math.floor(sinceMs / 1000)
      const res: any = await d.execute(sql.raw(`
        WITH signed AS (SELECT DISTINCT user_id FROM app_track_events WHERE name='signup_complete' AND user_id IS NOT NULL AND created_at >= to_timestamp(${t})),
        chatters AS (SELECT DISTINCT user_id FROM app_ai_messages WHERE created_at >= to_timestamp(${t})),
        approved AS (SELECT DISTINCT user_id FROM app_track_events WHERE name='reg_approved' AND user_id IS NOT NULL AND created_at >= to_timestamp(${t})),
        reached  AS (SELECT DISTINCT user_id FROM app_track_events WHERE name IN ('ticket_select','pay_page_view') AND user_id IS NOT NULL AND created_at >= to_timestamp(${t}))
        SELECT
          (SELECT COUNT(*) FROM signed WHERE user_id IN (SELECT user_id FROM chatters)) AS chatters_signed,
          (SELECT COUNT(*) FROM signed WHERE user_id NOT IN (SELECT user_id FROM chatters)) AS nonchatters_signed,
          (SELECT COUNT(*) FROM reached WHERE user_id IN (SELECT user_id FROM chatters)) AS chatters_reached,
          (SELECT COUNT(*) FROM approved WHERE user_id IN (SELECT user_id FROM chatters)) AS chatters_approved,
          (SELECT COUNT(*) FROM reached WHERE user_id NOT IN (SELECT user_id FROM chatters)) AS nonchatters_reached,
          (SELECT COUNT(*) FROM approved WHERE user_id NOT IN (SELECT user_id FROM chatters)) AS nonchatters_approved
      `))
      const rows = (res.rows ?? res) as any[]
      return rows[0] ?? null
    },
  },
  gamenet: {
    insert(g: { id: string; ownerId: string; name: string; province?: string; city: string; address: string; phone?: string; instagramUrl?: string; mapUrl?: string; openHours?: string; stations: number; consoles: { kind: string; count: number }[]; disciplines: string[]; games: string[]; features: string[]; status: string; rejectReason?: string; verified: boolean }) {
      const d = db(); if (!d) return
      fire(d.insert(schema.gamenets).values({
        id: g.id, ownerId: g.ownerId, name: g.name, province: g.province, city: g.city, address: g.address,
        phone: g.phone, instagramUrl: g.instagramUrl, mapUrl: g.mapUrl, openHours: g.openHours,
        stations: g.stations, consoles: JSON.stringify(g.consoles),
        disciplines: g.disciplines.join(','), games: g.games.join(','), features: g.features.join(','),
        status: g.status, rejectReason: g.rejectReason, verified: g.verified,
      }).onConflictDoNothing())
    },
    setStatus(id: string, status: string, rejectReason?: string) {
      const d = db(); if (!d) return
      fire(d.update(schema.gamenets).set({
        status, rejectReason: rejectReason ?? null, verified: status === 'verified',
      }).where(eq(schema.gamenets.id, id)))
    },
    update(g: { id: string; name: string; province?: string; city: string; address: string; phone?: string; instagramUrl?: string; mapUrl?: string; openHours?: string; stations: number; consoles: { kind: string; count: number }[]; disciplines: string[]; games: string[]; features: string[]; status: string; rejectReason?: string; verified: boolean }) {
      const d = db(); if (!d) return
      fire(d.update(schema.gamenets).set({
        name: g.name, province: g.province, city: g.city, address: g.address,
        phone: g.phone, instagramUrl: g.instagramUrl, mapUrl: g.mapUrl, openHours: g.openHours,
        stations: g.stations, consoles: JSON.stringify(g.consoles),
        disciplines: g.disciplines.join(','), games: g.games.join(','), features: g.features.join(','),
        status: g.status, rejectReason: g.rejectReason ?? null, verified: g.verified,
      }).where(eq(schema.gamenets.id, g.id)))
    },
    delete(id: string) {
      const d = db(); if (!d) return
      fire(d.delete(schema.gamenetPhotos).where(eq(schema.gamenetPhotos.gamenetId, id)))
      fire(d.delete(schema.gamenets).where(eq(schema.gamenets.id, id)))
    },
  },
  gamenetPhoto: {
    async insertAsync(gamenetId: string, dataUrl: string, sort = 0): Promise<string | null> {
      const d = db(); if (!d) return null
      const id = 'gpn_' + Math.random().toString(36).slice(2, 10)
      await d.insert(schema.gamenetPhotos).values({ id, gamenetId, dataUrl, sort })
      return id
    },
    async read(photoId: string): Promise<string | null> {
      const d = db(); if (!d) return null
      const rows = await d.select({ dataUrl: schema.gamenetPhotos.dataUrl }).from(schema.gamenetPhotos).where(eq(schema.gamenetPhotos.id, photoId)).limit(1)
      return rows[0]?.dataUrl ?? null
    },
    async readFirstForGamenet(gamenetId: string): Promise<string | null> {
      const d = db(); if (!d) return null
      const rows = await d.select({ dataUrl: schema.gamenetPhotos.dataUrl }).from(schema.gamenetPhotos)
        .where(eq(schema.gamenetPhotos.gamenetId, gamenetId)).orderBy(schema.gamenetPhotos.sort, schema.gamenetPhotos.createdAt).limit(1)
      return rows[0]?.dataUrl ?? null
    },
    async gamenetIdOf(photoId: string): Promise<string | null> {
      const d = db(); if (!d) return null
      const rows = await d.select({ gamenetId: schema.gamenetPhotos.gamenetId }).from(schema.gamenetPhotos).where(eq(schema.gamenetPhotos.id, photoId)).limit(1)
      return rows[0]?.gamenetId ?? null
    },
    async countForGamenet(gamenetId: string): Promise<number> {
      const d = db(); if (!d) return 0
      const rows = await d.select({ id: schema.gamenetPhotos.id }).from(schema.gamenetPhotos).where(eq(schema.gamenetPhotos.gamenetId, gamenetId))
      return rows.length
    },
    async deleteAsync(photoId: string): Promise<boolean> {
      const d = db(); if (!d) return false
      await d.delete(schema.gamenetPhotos).where(eq(schema.gamenetPhotos.id, photoId))
      return true
    },
  },
}
