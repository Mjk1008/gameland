// Drizzle schema — mirrors web/lib/db/init.sql (canonical).
// Runs on Liara Postgres or any standard PG. Text PKs (app-generated).
// Enum columns are declared as pgEnum so Drizzle emits/validates the right type.

import { pgTable, pgEnum, text, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'

// ─── Competitions (رویداد — parent that groups discipline Events) ───
export const competitions = pgTable('app_competitions', {
  id:        text('id').primaryKey(),
  title:     text('title').notNull(),
  location:  text('location').notNull().default(''),
  date:      text('date').notNull().default(''),
  posterUrl: text('poster_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Enums (must match init.sql) ─────────────────────────────
export const eventTierEnum   = pgEnum('event_tier',   ['S', 'A', 'B', 'C'])
export const eventStatusEnum = pgEnum('event_status', ['soon', 'open', 'live', 'done'])
export const userRoleEnum    = pgEnum('user_role',    ['gamer', 'organizer', 'admin'])
export const matchStatusEnum = pgEnum('match_status', ['pending', 'ready', 'done'])
export const notifTypeEnum   = pgEnum('notif_type',   ['registration', 'draw', 'match_ready', 'result', 'advance', 'announcement'])

// ─── Disciplines ─────────────────────────────────────────────
export const disciplines = pgTable('app_disciplines', {
  id:     text('id').primaryKey(),
  name:   text('name').notNull(),
  short:  text('short').notNull(),
  color:  text('color').notNull(),
  active: boolean('active').notNull().default(true),
})

// ─── Sponsors ────────────────────────────────────────────────
export const sponsors = pgTable('app_sponsors', {
  id:      text('id').primaryKey(),
  name:    text('name').notNull(),
  logoUrl: text('logo_url'),
  website: text('website'),
})

// ─── Users ───────────────────────────────────────────────────
export const users = pgTable('app_users', {
  id:          text('id').primaryKey(),
  email:       text('email').unique(),
  googleSub:   text('google_sub').unique(),
  avatarUrl:   text('avatar_url'),
  phone:       text('phone').unique(),
  name:        text('name').notNull(),
  firstName:   text('first_name'),
  lastName:    text('last_name'),
  tag:         text('tag').notNull().unique(),          // CITEXT in DB; text over the wire
  province:    text('province'),
  city:        text('city').notNull().default(''),
  messenger:   text('messenger'),
  primaryDisc: text('primary_disc').references(() => disciplines.id, { onDelete: 'set null' }),
  discs:       text('discs').notNull().default(''),     // csv of discipline ids
  experienceYears: integer('experience_years'),
  teamName:    text('team_name'),
  nationalId:  text('national_id').unique(),
  passwordHash:text('password_hash'),
  role:        userRoleEnum('role').notNull().default('gamer'),
  coinBalance: integer('coin_balance').notNull().default(0),
  playerId:    text('player_id'),
  bonusPoints: integer('bonus_points'),   // admin-set manual ranking points
  referredBy:  text('referred_by'),       // user id of the referrer (set once at signup)
  freeTickets: integer('free_tickets'),   // referral-reward ticket balance
  referralMilestone: integer('referral_milestone'), // last milestone granted (0|2|5) — idempotency
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt:   timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  activeCity: index('users_active_city_idx').on(t.city),
}))

// ─── Events ──────────────────────────────────────────────────
export const events = pgTable('app_events', {
  id:           text('id').primaryKey(),
  title:        text('title').notNull(),
  season:       text('season').notNull().default(''),
  disc:         text('disc').notNull().references(() => disciplines.id, { onDelete: 'restrict' }),
  tier:         eventTierEnum('tier').notNull().default('A'),
  prize:        integer('prize').notNull().default(0),
  teams:        integer('teams').notNull().default(0),
  maxPlayers:   integer('max_players'),
  status:       eventStatusEnum('status').notNull().default('soon'),
  statusLabel:  text('status_label').notNull().default(''),
  format:       text('format').notNull().default(''),
  config:       text('config'),   // JSON: EventConfig (groupMode, qualify counts, final seeding)
  competitionId: text('competition_id'),   // parent competition (رویداد)
  finalSize:     integer('final_size'),    // final bracket size for this discipline
  date:         text('date'),
  startsAt:     timestamp('starts_at', { withTimezone: true }),
  regDeadline:  timestamp('reg_deadline', { withTimezone: true }),
  organizerId:  text('organizer_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byDisc:   index('events_disc_idx').on(t.disc, t.createdAt),
  byStatus: index('events_status_idx').on(t.status),
}))

// ─── Registrations ───────────────────────────────────────────
export const registrations = pgTable('app_registrations', {
  id:               text('id').primaryKey(),
  userId:           text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  compId:           text('comp_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  attempts:         integer('attempts').notNull(),
  freeAttempts:     integer('free_attempts'),   // referral-reward tickets applied to this reg
  rejectReason:     text('reject_reason'),        // admin's last rejection reason
  status:           text('status').notNull().default('pending'),  // pending | approved | rejected
  seedsEarned:      integer('seeds_earned').notNull().default(0),
  prelimsCompleted: integer('prelims_completed').notNull().default(0),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqByUserComp: uniqueIndex('reg_user_comp_idx').on(t.userId, t.compId),
  byComp: index('reg_comp_idx').on(t.compId),
  byUser: index('reg_user_idx').on(t.userId),
}))

// ─── Matches ─────────────────────────────────────────────────
export const matches = pgTable('app_matches', {
  id:          text('id').primaryKey(),
  compId:      text('comp_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  stage:       text('stage').notNull().default('prelim'),  // prelim | final
  groupKey:    text('group_key').notNull().default(''),    // city:… | province:… ; '' for final
  bracket:     integer('bracket').notNull(),
  round:       integer('round').notNull(),
  slot:        integer('slot').notNull(),
  p1UserId:    text('p1_user_id').references(() => users.id, { onDelete: 'set null' }),
  p2UserId:    text('p2_user_id').references(() => users.id, { onDelete: 'set null' }),
  winnerUserId:text('winner_user_id').references(() => users.id, { onDelete: 'set null' }),
  score:       text('score'),
  status:      matchStatusEnum('status').notNull().default('pending'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byComp: index('match_comp_idx').on(t.compId, t.bracket, t.round, t.slot),
}))

// ─── Placements ──────────────────────────────────────────────
export const placements = pgTable('app_placements', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  compId:    text('comp_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  disc:      text('disc').notNull(),
  rank:      integer('rank').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqByUserComp: uniqueIndex('pl_user_comp_idx').on(t.userId, t.compId),
  byUser: index('pl_user_idx').on(t.userId),
  byComp: index('pl_comp_idx').on(t.compId, t.rank),
}))

// ─── Notifications ───────────────────────────────────────────
export const notifications = pgTable('app_notifications', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:      notifTypeEnum('type').notNull(),
  title:     text('title').notNull(),
  body:      text('body').notNull(),
  read:      boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byUser: index('notif_user_idx').on(t.userId, t.createdAt),
}))

// ─── Coin ledger ─────────────────────────────────────────────
export const coinTxns = pgTable('app_coin_txns', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  delta:     integer('delta').notNull(),
  reason:    text('reason').notNull(),
  ref:       text('ref'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byUser: index('coin_user_idx').on(t.userId, t.createdAt),
}))

// ─── Gamenets ────────────────────────────────────────────────
export const gamenets = pgTable('app_gamenets', {
  id:          text('id').primaryKey(),
  ownerId:     text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  city:        text('city').notNull(),
  address:     text('address').notNull(),
  phone:       text('phone'),
  stations:    integer('stations').notNull().default(0),
  disciplines: text('disciplines').notNull().default(''),
  verified:    boolean('verified').notNull().default(false),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byCity: index('gn_city_idx').on(t.city),
}))

// ─── Avatars (profile photos, base64) — stored OUT of the in-memory store and
// served on demand, so 10k photos never bloat RAM or the hydration path ──────
export const avatars = pgTable('app_avatars', {
  userId:    text('user_id').primaryKey(),
  dataUrl:   text('data_url').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Payment receipts (فیش) — one per registration, base64, served on demand ─
export const receipts = pgTable('app_receipts', {
  regId:     text('reg_id').primaryKey(),
  dataUrl:   text('data_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Promo slides (home carousel, admin-managed) ─────────────
// ─── AI assistant chat log (admin monitoring; NEVER hydrated into memory) ──
export const aiMessages = pgTable('app_ai_messages', {
  id:               text('id').primaryKey(),
  userId:           text('user_id').notNull(),
  role:             text('role').notNull(),              // 'user' | 'assistant'
  content:          text('content').notNull(),
  promptTokens:     integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── News (home news slider + modal, admin-managed) ─────────────
export const news = pgTable('app_news', {
  id:        text('id').primaryKey(),
  imageData: text('image_data').notNull(),   // cover — data: URL (base64) or external URL
  title:     text('title').notNull(),
  body:      text('body').notNull().default(''),
  tags:      text('tags').notNull().default(''),   // comma-separated
  sort:      integer('sort').notNull().default(0),
  active:    boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const promos = pgTable('app_promos', {
  id:        text('id').primaryKey(),
  imageData: text('image_data').notNull(),          // data: URL (base64) or external URL
  linkType:  text('link_type').notNull().default('none'), // 'event' | 'url' | 'none'
  eventId:   text('event_id'),                      // when link_type='event'
  url:       text('url'),                           // when link_type='url'
  sort:      integer('sort').notNull().default(0),
  active:    boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
