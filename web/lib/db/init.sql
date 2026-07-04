-- =============================================================
-- Gameland · Canonical Postgres schema (Liara / any standard PG)
-- Apply:  psql $DATABASE_URL -f web/lib/db/init.sql
-- Safe to re-run: tables use IF NOT EXISTS; enums/constraints/extensions
-- are guarded in DO-blocks so a second run is a no-op, not an error.
--
-- Design notes:
--   · Text PKs with prefixes (u_, e_, r_ …) — matches the app's write-through
--     model (ids are generated app-side, returned synchronously) and reads
--     better in logs than raw uuids.
--   · Ranking points are NEVER stored — the `leaderboard` view derives them
--     from placements via points_for_placement(). Single source of truth.
--   · Referential integrity via real FKs. Auth = Google (phone now optional).
-- =============================================================

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS citext;      -- case-insensitive tag

-- ─── Enums (idempotent) ──────────────────────────────────────
DO $$ BEGIN CREATE TYPE event_tier   AS ENUM ('S','A','B','C');            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE event_status AS ENUM ('soon','open','live','done'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE user_role    AS ENUM ('gamer','organizer','admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE match_status AS ENUM ('pending','ready','done');    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notif_type   AS ENUM ('registration','draw','match_ready','result','advance','announcement'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Reference: disciplines (game catalog) ───────────────────
CREATE TABLE IF NOT EXISTS app_disciplines (
  id      TEXT PRIMARY KEY,          -- 'valorant' | 'cs2' | … (meaningful id)
  name    TEXT NOT NULL,
  short   TEXT NOT NULL,
  color   TEXT NOT NULL,
  active  BOOLEAN NOT NULL DEFAULT true
);

-- ─── Reference: sponsors ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_sponsors (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  logo_url  TEXT,
  website   TEXT
);

-- ─── Users (players + staff) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS app_users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE,                          -- Google identity
  google_sub    TEXT UNIQUE,                          -- Google account subject
  avatar_url    TEXT,
  phone         TEXT UNIQUE,                          -- optional now (was OTP key)
  name          TEXT NOT NULL,
  first_name    TEXT,
  last_name     TEXT,
  tag           CITEXT NOT NULL UNIQUE,               -- @Handle, case-insensitive
  province      TEXT,
  city          TEXT NOT NULL DEFAULT '',
  messenger     TEXT,                                 -- whatsapp | telegram | both
  primary_disc  TEXT REFERENCES app_disciplines(id) ON DELETE SET NULL,
  discs         TEXT NOT NULL DEFAULT '',             -- csv of discipline ids
  experience_years INTEGER,
  team_name     TEXT,
  national_id   TEXT UNIQUE,
  role          user_role NOT NULL DEFAULT 'gamer',
  coin_balance  INTEGER NOT NULL DEFAULT 0,
  player_id     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ                            -- soft delete only
);
CREATE INDEX IF NOT EXISTS users_active_city_idx ON app_users (city) WHERE deleted_at IS NULL;

-- Profile v2 columns (idempotent for already-created DBs)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS first_name       TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_name        TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS province         TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS messenger        TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS discs            TEXT NOT NULL DEFAULT '';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS experience_years INTEGER;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS team_name        TEXT;

-- ─── Events (competitions) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS app_events (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  season        TEXT NOT NULL DEFAULT '',
  disc          TEXT NOT NULL REFERENCES app_disciplines(id) ON DELETE RESTRICT,
  tier          event_tier   NOT NULL DEFAULT 'A',
  prize         INTEGER NOT NULL DEFAULT 0 CHECK (prize >= 0),
  teams         INTEGER NOT NULL DEFAULT 0 CHECK (teams >= 0),
  max_players   INTEGER CHECK (max_players IS NULL OR max_players > 0),
  status        event_status NOT NULL DEFAULT 'soon',
  status_label  TEXT NOT NULL DEFAULT '',
  format        TEXT NOT NULL DEFAULT '',
  date          TEXT,                                  -- display string (fa)
  starts_at     TIMESTAMPTZ,                           -- machine time for alerts
  reg_deadline  TIMESTAMPTZ,
  organizer_id  TEXT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_disc_idx   ON app_events (disc, created_at DESC);
CREATE INDEX IF NOT EXISTS events_status_idx ON app_events (status);
CREATE INDEX IF NOT EXISTS events_open_idx    ON app_events (created_at DESC) WHERE status IN ('open','live');

-- ─── Registrations (one per user per event) ──────────────────
CREATE TABLE IF NOT EXISTS app_registrations (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES app_users(id)  ON DELETE CASCADE,
  comp_id            TEXT NOT NULL REFERENCES app_events(id) ON DELETE CASCADE,
  attempts           INTEGER NOT NULL CHECK (attempts BETWEEN 1 AND 6),
  seeds_earned       INTEGER NOT NULL DEFAULT 0 CHECK (seeds_earned BETWEEN 0 AND 3),
  prelims_completed  INTEGER NOT NULL DEFAULT 0 CHECK (prelims_completed >= 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, comp_id)
);
CREATE INDEX IF NOT EXISTS reg_comp_idx ON app_registrations (comp_id);
CREATE INDEX IF NOT EXISTS reg_user_idx ON app_registrations (user_id);

-- ─── Matches (bracket) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_matches (
  id              TEXT PRIMARY KEY,
  comp_id         TEXT NOT NULL REFERENCES app_events(id) ON DELETE CASCADE,
  bracket         INTEGER NOT NULL,                    -- 0 = final, 1-6 = prelim
  round           INTEGER NOT NULL,
  slot            INTEGER NOT NULL,
  p1_user_id      TEXT REFERENCES app_users(id) ON DELETE SET NULL,
  p2_user_id      TEXT REFERENCES app_users(id) ON DELETE SET NULL,
  winner_user_id  TEXT REFERENCES app_users(id) ON DELETE SET NULL,
  score           TEXT,
  status          match_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (p1_user_id IS NULL OR p2_user_id IS NULL OR p1_user_id <> p2_user_id),
  CHECK (winner_user_id IS NULL OR winner_user_id = p1_user_id OR winner_user_id = p2_user_id)
);
CREATE INDEX IF NOT EXISTS match_comp_idx ON app_matches (comp_id, bracket, round, slot);

-- ─── Placements (final results → feeds ranking) ──────────────
CREATE TABLE IF NOT EXISTS app_placements (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES app_users(id)  ON DELETE CASCADE,
  comp_id     TEXT NOT NULL REFERENCES app_events(id) ON DELETE CASCADE,
  disc        TEXT NOT NULL,
  rank        INTEGER NOT NULL CHECK (rank >= 1),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, comp_id)
);
CREATE INDEX IF NOT EXISTS pl_user_idx ON app_placements (user_id);
CREATE INDEX IF NOT EXISTS pl_comp_idx ON app_placements (comp_id, rank);

-- ─── Notifications ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  type        notif_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notif_user_idx   ON app_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notif_unread_idx ON app_notifications (user_id) WHERE read = false;

-- ─── Coin ledger (V2 economy; kept for continuity) ───────────
CREATE TABLE IF NOT EXISTS app_coin_txns (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  delta       INTEGER NOT NULL CHECK (delta <> 0),
  reason      TEXT NOT NULL,
  ref         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coin_user_idx ON app_coin_txns (user_id, created_at DESC);

-- ─── Gamenets (V2 community; kept for continuity) ────────────
CREATE TABLE IF NOT EXISTS app_gamenets (
  id           TEXT PRIMARY KEY,
  owner_id     TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  city         TEXT NOT NULL,
  address      TEXT NOT NULL,
  phone        TEXT,
  stations     INTEGER NOT NULL DEFAULT 0 CHECK (stations >= 0),
  disciplines  TEXT NOT NULL DEFAULT '',
  verified     BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gn_city_idx ON app_gamenets (city);

-- ─── Ranking function — mirrors lib/ranking.ts exactly ───────
-- IMMUTABLE so the planner can inline it. The leaderboard view is the
-- ONLY place points are computed; nothing stores a points column.
CREATE OR REPLACE FUNCTION points_for_placement(p_rank int, p_tier event_tier)
RETURNS int LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT round(
    CASE
      WHEN p_rank = 1    THEN 1000
      WHEN p_rank = 2    THEN  800
      WHEN p_rank = 3    THEN  500
      WHEN p_rank = 4    THEN  400
      WHEN p_rank <=  8  THEN  250
      WHEN p_rank <= 16  THEN  150
      WHEN p_rank <= 32  THEN   80
      WHEN p_rank <= 64  THEN   40
      WHEN p_rank <= 128 THEN   20
      ELSE 0
    END
    *
    CASE p_tier
      WHEN 'S' THEN 1.0
      WHEN 'A' THEN 0.8
      WHEN 'B' THEN 0.5
      WHEN 'C' THEN 0.3
    END
  )::int
$$;

-- ─── Leaderboard view (rolling 52 weeks) ─────────────────────
CREATE OR REPLACE VIEW leaderboard AS
  SELECT
    p.user_id,
    e.disc                                          AS discipline_id,
    sum(points_for_placement(p.rank, e.tier))::int  AS points,
    count(*)::int                                   AS events,
    min(p.rank)                                     AS best_rank,
    max(COALESCE(e.starts_at, e.created_at))        AS last_event_at
  FROM app_placements p
  JOIN app_events e ON e.id = p.comp_id
  JOIN app_users  u ON u.id = p.user_id
  WHERE COALESCE(e.starts_at, e.created_at) > now() - interval '52 weeks'
    AND u.deleted_at IS NULL
  GROUP BY p.user_id, e.disc;

-- =============================================================
-- Seed defaults (idempotent). Disciplines first (FK targets),
-- then staff/demo users.
-- =============================================================
INSERT INTO app_disciplines (id, name, short, color) VALUES
  ('fc26',      'فیفا ۲۶',    'FC26', '#38bdf8'),
  ('pes21',     'پ‌اس ۲۱',     'PES',  '#34d399'),
  ('efootball', 'ای‌فوتبال ۲۶', 'EF',   '#22d3ee'),
  ('ufc6',      'یو‌اف‌سی ۶',  'UFC',  '#fb7185'),
  ('nba2k26',   'NBA 2K26',    '2K',   '#f5c84b')
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_users (id, phone, name, tag, city, primary_disc, role, coin_balance)
VALUES
  ('u_admin', '09120000000', 'مدیر گیم‌لند', 'admin', 'تهران', NULL,   'admin', 0),
  ('u_zeus',  '09121111111', 'آرش رستمی',    'ZEUS',  'تهران', 'fc26', 'gamer', 1000)
ON CONFLICT (id) DO NOTHING;
