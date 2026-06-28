-- Gameland app tables — runs on Liara Postgres or Supabase.
-- Apply with: psql $DATABASE_URL -f web/lib/db/init.sql

CREATE TABLE IF NOT EXISTS app_users (
  id            TEXT PRIMARY KEY,
  phone         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  tag           TEXT NOT NULL UNIQUE,
  city          TEXT NOT NULL,
  primary_disc  TEXT,
  national_id   TEXT UNIQUE,
  role          TEXT NOT NULL DEFAULT 'gamer',
  coin_balance  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  player_id     TEXT
);

CREATE TABLE IF NOT EXISTS app_events (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  season        TEXT NOT NULL,
  disc          TEXT NOT NULL,
  tier          TEXT NOT NULL DEFAULT 'A',
  prize         INTEGER NOT NULL,
  teams         INTEGER NOT NULL,
  status        TEXT NOT NULL,
  status_label  TEXT NOT NULL,
  format        TEXT NOT NULL,
  date          TEXT,
  organizer_id  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE app_events ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'A';

CREATE TABLE IF NOT EXISTS app_placements (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  comp_id     TEXT NOT NULL,
  disc        TEXT NOT NULL,
  rank        INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, comp_id)
);
CREATE INDEX IF NOT EXISTS pl_user_idx ON app_placements (user_id);
CREATE INDEX IF NOT EXISTS pl_comp_idx ON app_placements (comp_id);

CREATE TABLE IF NOT EXISTS app_registrations (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL,
  comp_id            TEXT NOT NULL,
  attempts           INTEGER NOT NULL,
  seeds_earned       INTEGER NOT NULL DEFAULT 0,
  prelims_completed  INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, comp_id)
);
CREATE INDEX IF NOT EXISTS reg_comp_idx ON app_registrations (comp_id);

CREATE TABLE IF NOT EXISTS app_notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notif_user_idx ON app_notifications (user_id, read);

CREATE TABLE IF NOT EXISTS app_coin_txns (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  delta       INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  ref         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coin_user_idx ON app_coin_txns (user_id);

CREATE TABLE IF NOT EXISTS app_matches (
  id              TEXT PRIMARY KEY,
  comp_id         TEXT NOT NULL,
  bracket         INTEGER NOT NULL,
  round           INTEGER NOT NULL,
  slot            INTEGER NOT NULL,
  p1_user_id      TEXT,
  p2_user_id      TEXT,
  winner_user_id  TEXT,
  score           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS match_comp_idx ON app_matches (comp_id, bracket, round);

CREATE TABLE IF NOT EXISTS app_gamenets (
  id           TEXT PRIMARY KEY,
  owner_id     TEXT NOT NULL,
  name         TEXT NOT NULL,
  city         TEXT NOT NULL,
  address      TEXT NOT NULL,
  phone        TEXT,
  stations     INTEGER NOT NULL DEFAULT 0,
  disciplines  TEXT NOT NULL DEFAULT '',
  verified     BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gn_city_idx ON app_gamenets (city);

CREATE TABLE IF NOT EXISTS app_disciplines (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  short   TEXT NOT NULL,
  color   TEXT NOT NULL,
  active  BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS app_sponsors (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  logo_url  TEXT,
  website   TEXT
);

-- Seed defaults (idempotent)
INSERT INTO app_users (id, phone, name, tag, city, primary_disc, role, coin_balance)
VALUES
  ('u_admin', '09120000000', 'مدیر گیم‌لند', 'admin', 'تهران', NULL, 'admin', 0),
  ('u_zeus',  '09121111111', 'آرش رستمی',    'ZEUS',  'تهران', 'valorant', 'gamer', 1000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_disciplines (id, name, short, color) VALUES
  ('valorant', 'ولورنت', 'VAL', '#fb7185'),
  ('cs2',      'کانتر ۲', 'CS2', '#fbbf24'),
  ('pubgm',    'پابجی موبایل', 'PUBGM', '#34d399'),
  ('fc',       'EA FC', 'FC', '#38bdf8')
ON CONFLICT (id) DO NOTHING;
