// Drizzle schema — mirrors web/lib/db/init.sql (canonical).
// Runs on Liara Postgres or any standard PG. Text PKs (app-generated).
// Enum columns are declared as pgEnum so Drizzle emits/validates the right type.

import { pgTable, pgEnum, text, integer, boolean, timestamp, index, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core'

// ─── Competitions (رویداد — parent that groups discipline Events) ───
export const competitions = pgTable('app_competitions', {
  id:        text('id').primaryKey(),
  title:     text('title').notNull(),
  location:  text('location').notNull().default(''),
  date:      text('date').notNull().default(''),
  posterUrl: text('poster_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Competition / event cover blobs — bytes in PG, ids only in RAM ────────
export const competitionCovers = pgTable('app_competition_covers', {
  competitionId: text('competition_id').primaryKey(),
  dataUrl:       text('data_url').notNull(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const eventCovers = pgTable('app_event_covers', {
  eventId:   text('event_id').primaryKey(),
  dataUrl:   text('data_url').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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
  promoterActive: boolean('promoter_active'),
  promoterDiscountPercent: integer('promoter_discount_percent'),
  promoterCommissionPercent: integer('promoter_commission_percent'),
  promoterActivatedAt: timestamp('promoter_activated_at', { withTimezone: true }),
  rankingPoints: integer('ranking_points').notNull().default(0),
  rankingEvents: integer('ranking_events').notNull().default(0),
  permissions: text('permissions').notNull().default(''), // csv of scoped Permission keys
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt:   timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  activeCity: index('users_active_city_idx').on(t.city),
  ranking: index('users_ranking_idx').on(t.rankingPoints, t.rankingEvents),
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
  paidAttempts:     integer('paid_attempts'),   // tickets already paid for & approved (top-ups bill the difference)
  rejectReason:     text('reject_reason'),        // admin's last rejection reason
  status:           text('status').notNull().default('pending'),  // pending | approved | rejected
  seedsEarned:      integer('seeds_earned').notNull().default(0),
  prelimsCompleted: integer('prelims_completed').notNull().default(0),
  teamId:           text('team_id'),   // 2v2 events only — → app_teams(id). No FK yet (mirrors app_matches team columns).
  promoterCodeId:   text('promoter_code_id'),
  discountPercent:  integer('discount_percent'),
  lockedUnitPrice:  integer('locked_unit_price'),
  payBatch:         integer('pay_batch').notNull().default(1),
  receiptPayBatch:  integer('receipt_pay_batch'),
  receiptAttemptsAt: integer('receipt_attempts_at'),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqByUserComp: uniqueIndex('reg_user_comp_idx').on(t.userId, t.compId),
  byComp: index('reg_comp_idx').on(t.compId),
  byUser: index('reg_user_idx').on(t.userId),
}))

// ─── Teams (2v2 events) ────────────────────────────────────────
export const teams = pgTable('app_teams', {
  id:         text('id').primaryKey(),
  compId:     text('comp_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  name:       text('name').notNull(),
  captainId:  text('captain_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status:     text('status').notNull().default('forming'),  // forming | complete | disbanded
  attempts:   integer('attempts').notNull().default(1),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byComp: index('team_comp_idx').on(t.compId),
}))

export const teamMembers = pgTable('app_team_members', {
  teamId:    text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  slot:      integer('slot').notNull(),        // 0 = captain
  status:    text('status').notNull(),         // invited | accepted | declined
  // Ordering source of truth: after a partner replacement, the LAST row per
  // (team, slot) is the active one (store.ts currentTeamMembers) — the
  // in-memory array preserves insertion order live, but hydration must
  // re-derive that order explicitly (SELECT ... ORDER BY created_at), so a
  // restart can't silently pick the stale, replaced partner as "current".
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.teamId, t.userId] }),
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
  // No FK — these columns also hold rest/cancelled sentinels (__gl_rest:n).
  p1UserId:    text('p1_user_id'),
  p2UserId:    text('p2_user_id'),
  winnerUserId:text('winner_user_id'),
  // Team-format (2v2) sides — no FK (app_teams doesn't exist yet; lands in a
  // later phase). Mutually exclusive with the user columns above per match.
  p1TeamId:    text('p1_team_id'),
  p2TeamId:    text('p2_team_id'),
  winnerTeamId:text('winner_team_id'),
  score:       text('score'),
  status:      matchStatusEnum('status').notNull().default('pending'),
  cancelled:   boolean('cancelled').notNull().default(false),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // Live Day Hub — stamped once, the first time status becomes 'done'
  // (store.ts saveMatch/pushMatch). Drives the /today live feed ordering.
  completedAt: timestamp('completed_at', { withTimezone: true }),
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
  id:            text('id').primaryKey(),
  ownerId:       text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:          text('name').notNull(),
  province:      text('province'),
  city:          text('city').notNull(),
  address:       text('address').notNull(),
  phone:         text('phone'),
  instagramUrl:  text('instagram_url'),
  stations:      integer('stations').notNull().default(0),
  consoles:      text('consoles').notNull().default('[]'),   // JSON: {kind,count}[]
  disciplines:   text('disciplines').notNull().default(''),  // tournament-relevant — load-bearing
  games:         text('games').notNull().default(''),        // broader catalog — cosmetic only
  features:      text('features').notNull().default(''),     // amenity ids, CSV
  status:        text('status').notNull().default('pending'),
  rejectReason:  text('reject_reason'),
  mapUrl:        text('map_url'),
  openHours:     text('open_hours'),
  verified:      boolean('verified').notNull().default(false),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byCity: index('gn_city_idx').on(t.city),
}))

// Venue photos — ids only in RAM; bytes served on demand (up to 6 per gamenet).
export const gamenetPhotos = pgTable('app_gamenet_photos', {
  id:        text('id').primaryKey(),
  gamenetId: text('gamenet_id').notNull(),
  dataUrl:   text('data_url').notNull(),
  sort:      integer('sort').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byGamenet: index('gn_photo_gamenet_idx').on(t.gamenetId),
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
// ─── Key/value app settings (assistant knowledge base, flags) ──────────────
export const settings = pgTable('app_settings', {
  key:       text('key').primaryKey(),
  value:     text('value').notNull().default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

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
  // Live Day Hub — 'home' (default, existing behavior) | 'today' | 'both'.
  // Lets admins reuse this same admin/news flow for the /today news rail
  // instead of a bespoke upload system.
  placement: text('placement').notNull().default('home'),
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

// ─── Behavioral analytics (pageviews, taps, funnel steps) — write-only from
// the app's side, read back only by /admin/behavior; NEVER hydrated into memory.
export const trackEvents = pgTable('app_track_events', {
  id:        text('id').primaryKey(),
  userId:    text('user_id'),                       // null pre-auth (landing, signup_start)
  sessionId: text('session_id').notNull(),
  name:      text('name').notNull(),                // e.g. 'pageview' | 'ticket_select' | 'tap'
  path:      text('path').notNull().default(''),
  props:     text('props').notNull().default('{}'), // JSON.stringify — no free-form user text (see lib/track.ts allow-list)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Play Arena («میدون») — casual 1v1 requests between tournaments ───────────
export const playRequests = pgTable('app_play_requests', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull(),
  disc:      text('disc').notNull(),
  bestOf:    integer('best_of').notNull().default(1),
  city:      text('city').notNull(),
  province:  text('province').notNull(),
  note:      text('note').notNull().default(''),
  status:    text('status').notNull().default('open'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const playMatches = pgTable('app_play_matches', {
  id:                   text('id').primaryKey(),
  requestId:            text('request_id').notNull(),
  requesterId:          text('requester_id').notNull(),
  acceptorId:           text('acceptor_id').notNull(),
  status:               text('status').notNull().default('pending_confirm'),
  requesterConfirmedAt: timestamp('requester_confirmed_at', { withTimezone: true }),
  acceptorConfirmedAt:  timestamp('acceptor_confirmed_at', { withTimezone: true }),
  bookInitiatorId:      text('book_initiator_id'),
  gamenetId:            text('gamenet_id'),
  scheduledAt:          timestamp('scheduled_at', { withTimezone: true }),
  confirmDeadline:      timestamp('confirm_deadline', { withTimezone: true }),
  requesterResult:      text('requester_result'),
  acceptorResult:       text('acceptor_result'),
  winnerUserId:         text('winner_user_id'),
  confirmedAt:          timestamp('confirmed_at', { withTimezone: true }),
  createdAt:            timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Live Day Hub («امروز») — per-match check-in/operational state ──────────
export const matchDesk = pgTable('app_match_desk', {
  matchId:        text('match_id').primaryKey().references(() => matches.id, { onDelete: 'cascade' }),
  station:        text('station'),
  p1Here:         boolean('p1_here').notNull().default(false),
  p2Here:         boolean('p2_here').notNull().default(false),
  p1Ready:        boolean('p1_ready').notNull().default(false),
  p2Ready:        boolean('p2_ready').notNull().default(false),
  calledAt:       timestamp('called_at', { withTimezone: true }),
  refRequestedBy: text('ref_requested_by'),
  refRequestedAt: timestamp('ref_requested_at', { withTimezone: true }),
  refHandledAt:   timestamp('ref_handled_at', { withTimezone: true }),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Live Day Hub — follow graph (player follows player) ────────────────────
export const follows = pgTable('app_follows', {
  followerId: text('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followeeId: text('followee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.followerId, t.followeeId] }),
  byFollowee: index('follows_followee_idx').on(t.followeeId),
}))
