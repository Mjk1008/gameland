// Drizzle schema — mirrors supabase/migrations/20260101000000_initial_schema.sql
// but trimmed to what the MVP needs. All Postgres-standard; runs on Liara PG or Supabase.

import { pgTable, text, integer, bigint, boolean, timestamp, primaryKey, uniqueIndex, index } from 'drizzle-orm/pg-core'

export const users = pgTable('app_users', {
  id:          text('id').primaryKey(),
  phone:       text('phone').notNull().unique(),
  name:        text('name').notNull(),
  tag:         text('tag').notNull().unique(),
  city:        text('city').notNull(),
  primaryDisc: text('primary_disc'),
  nationalId:  text('national_id').unique(),
  role:        text('role').notNull().default('gamer'),
  coinBalance: integer('coin_balance').notNull().default(0),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  playerId:    text('player_id'),
})

export const events = pgTable('app_events', {
  id:           text('id').primaryKey(),
  title:        text('title').notNull(),
  season:       text('season').notNull(),
  disc:         text('disc').notNull(),
  prize:        integer('prize').notNull(),
  teams:        integer('teams').notNull(),
  status:       text('status').notNull(),
  statusLabel:  text('status_label').notNull(),
  format:       text('format').notNull(),
  date:         text('date'),
  organizerId:  text('organizer_id').notNull(),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const registrations = pgTable('app_registrations', {
  id:               text('id').primaryKey(),
  userId:           text('user_id').notNull(),
  compId:           text('comp_id').notNull(),
  attempts:         integer('attempts').notNull(),
  seedsEarned:      integer('seeds_earned').notNull().default(0),
  prelimsCompleted: integer('prelims_completed').notNull().default(0),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqByUserComp: uniqueIndex('reg_user_comp_idx').on(t.userId, t.compId),
  byComp: index('reg_comp_idx').on(t.compId),
}))

export const notifications = pgTable('app_notifications', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull(),
  type:      text('type').notNull(),
  title:     text('title').notNull(),
  body:      text('body').notNull(),
  read:      boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byUser: index('notif_user_idx').on(t.userId, t.read),
}))

export const coinTxns = pgTable('app_coin_txns', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull(),
  delta:     integer('delta').notNull(),  // signed
  reason:    text('reason').notNull(),
  ref:       text('ref'),                  // e.g. compId, regId
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byUser: index('coin_user_idx').on(t.userId),
}))

export const matches = pgTable('app_matches', {
  id:          text('id').primaryKey(),
  compId:      text('comp_id').notNull(),
  bracket:     integer('bracket').notNull(),       // 0=final, 1-6=prelim
  round:       integer('round').notNull(),
  slot:        integer('slot').notNull(),
  p1UserId:    text('p1_user_id'),
  p2UserId:    text('p2_user_id'),
  winnerUserId:text('winner_user_id'),
  score:       text('score'),
  status:      text('status').notNull().default('pending'),   // pending|ready|done
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byComp: index('match_comp_idx').on(t.compId, t.bracket, t.round),
}))

export const gamenets = pgTable('app_gamenets', {
  id:          text('id').primaryKey(),
  ownerId:     text('owner_id').notNull(),
  name:        text('name').notNull(),
  city:        text('city').notNull(),
  address:     text('address').notNull(),
  phone:       text('phone'),
  stations:    integer('stations').notNull().default(0),
  disciplines: text('disciplines').notNull().default(''), // csv
  verified:    boolean('verified').notNull().default(false),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byCity: index('gn_city_idx').on(t.city),
}))

export const disciplines = pgTable('app_disciplines', {
  id:     text('id').primaryKey(),
  name:   text('name').notNull(),
  short:  text('short').notNull(),
  color:  text('color').notNull(),
  active: boolean('active').notNull().default(true),
})

export const sponsors = pgTable('app_sponsors', {
  id:      text('id').primaryKey(),
  name:    text('name').notNull(),
  logoUrl: text('logo_url'),
  website: text('website'),
})
