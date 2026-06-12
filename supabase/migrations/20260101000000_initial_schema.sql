-- =============================================================
-- Gameland · Initial Schema
-- Refs: docs/12-tech-approach.md · docs/14-ranking-design.md · docs/15-competition-engine.md
-- Legal: prizes.funded_by NOT NULL (docs/11 R1) · coin_txns non-convertible (docs/11 R6)
-- =============================================================

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────

CREATE TYPE event_tier AS ENUM ('S', 'A', 'B', 'C');
-- S = Major (×1.0) · A = Gameland-run (×0.8) · B = All-Star (×0.5) · C = Local (×0.3)

CREATE TYPE competition_format AS ENUM (
  'six_prelim_128_final',
  'single_elim',
  'double_elim',
  'group_final'
);

CREATE TYPE coin_reason AS ENUM ('topup', 'attempt', 'store', 'refund', 'admin');
-- deliberately no 'cash_out' — coins are non-convertible (docs/11 R6)

CREATE TYPE notif_channel AS ENUM ('sms', 'in_app', 'telegram');
CREATE TYPE notif_status  AS ENUM ('queued', 'sent', 'failed');
CREATE TYPE match_stage   AS ENUM ('prelim', 'final');

-- ─── Ranking helper ──────────────────────────────────────────
-- Mirrors ranking.ts:pointsForPlacement exactly.
-- Single source of truth used by the ranking_entries materialized view.
CREATE FUNCTION points_for_placement(p_rank int, p_tier event_tier)
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

-- ─── Reference tables ─────────────────────────────────────────

CREATE TABLE disciplines (
  id         text        PRIMARY KEY,   -- 'efootball' | 'cs2' | 'eafc' | …
  name       text        NOT NULL,
  name_fa    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sponsors (
  id         text        PRIMARY KEY,
  name       text        NOT NULL,
  logo       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Players ──────────────────────────────────────────────────

CREATE TABLE players (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname    text        NOT NULL,
  full_name   text        NOT NULL,
  phone       text        NOT NULL,          -- identity key; normalize to +98XXXXXXXXXX
  city        text,
  province    text,
  play_style  text,
  photo       text,
  bio         text,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz                    -- soft delete only; never hard-delete
);

CREATE UNIQUE INDEX players_phone_uq ON players (phone);
CREATE        INDEX players_active_city ON players (city) WHERE deleted_at IS NULL;

-- Player ↔ Discipline  (many-to-many; a player competes in 1+ games)
CREATE TABLE player_disciplines (
  player_id     uuid NOT NULL REFERENCES players(id)     ON DELETE CASCADE,
  discipline_id text NOT NULL REFERENCES disciplines(id) ON DELETE RESTRICT,
  PRIMARY KEY (player_id, discipline_id)
);
CREATE INDEX player_disciplines_by_disc ON player_disciplines (discipline_id);

-- ─── Competitions ──────────────────────────────────────────────

CREATE TABLE competitions (
  id               text              PRIMARY KEY,
  name             text              NOT NULL,
  discipline_id    text              NOT NULL REFERENCES disciplines(id),
  tier             event_tier        NOT NULL,
  date             date              NOT NULL,
  city             text,
  venue            text,
  organizer        text,
  format           competition_format NOT NULL DEFAULT 'six_prelim_128_final',
  prize_pool_toman bigint            CHECK (prize_pool_toman > 0),
  created_at       timestamptz       NOT NULL DEFAULT now()
);

CREATE INDEX competitions_disc_date ON competitions (discipline_id, date DESC);

-- Competition ↔ Sponsor  (many-to-many)
CREATE TABLE competition_sponsors (
  competition_id text NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  sponsor_id     text NOT NULL REFERENCES sponsors(id)     ON DELETE RESTRICT,
  PRIMARY KEY (competition_id, sponsor_id)
);

-- Prizes — funded_by NOT NULL is a legal design constraint (docs/11 R1)
CREATE TABLE prizes (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id text    NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  rank           int     NOT NULL CHECK (rank >= 1),
  amount_toman   bigint  CHECK (amount_toman > 0),
  description    text,
  funded_by      text    NOT NULL REFERENCES sponsors(id),   -- NON-NULL by design
  UNIQUE (competition_id, rank)
);
CREATE INDEX prizes_by_comp ON prizes (competition_id);

-- ─── Competition Mechanics ─────────────────────────────────────

CREATE TABLE prelim_brackets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id text NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  index          int  NOT NULL CHECK (index BETWEEN 1 AND 6),
  size           int  NOT NULL CHECK (size > 0),
  seed_threshold int  NOT NULL CHECK (seed_threshold > 0),
  UNIQUE (competition_id, index)
);

-- Attempts — paid skill-service; not a stake (docs/11 R1, docs/15)
CREATE TABLE attempts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id text        NOT NULL REFERENCES competitions(id),
  bracket_id     uuid        NOT NULL REFERENCES prelim_brackets(id),
  player_id      uuid        NOT NULL REFERENCES players(id),
  coins_spent    int         NOT NULL CHECK (coins_spent > 0),
  attempt_number int         NOT NULL CHECK (attempt_number BETWEEN 1 AND 6),
  result_wins    int         NOT NULL DEFAULT 0 CHECK (result_wins >= 0),
  result_losses  int         NOT NULL DEFAULT 0 CHECK (result_losses >= 0),
  earned_seed    boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, player_id, attempt_number)
);

CREATE INDEX attempts_player_comp ON attempts (player_id, competition_id);
CREATE INDEX attempts_by_comp     ON attempts (competition_id);

-- Seeds — max 3 per player per competition (docs/15)
CREATE TABLE seeds (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id  text        NOT NULL REFERENCES competitions(id),
  player_id       uuid        NOT NULL REFERENCES players(id),
  from_bracket_id uuid        NOT NULL REFERENCES prelim_brackets(id),
  from_attempt_id uuid        NOT NULL UNIQUE REFERENCES attempts(id),  -- 1 seed per attempt
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, player_id, from_bracket_id)
);

CREATE INDEX seeds_player_comp ON seeds (player_id, competition_id);

-- Enforce max 3 seeds per (competition, player)
CREATE FUNCTION check_seed_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (
    SELECT count(*) FROM seeds
    WHERE competition_id = NEW.competition_id
      AND player_id      = NEW.player_id
  ) >= 3 THEN
    RAISE EXCEPTION 'max 3 seeds per player per competition (docs/15)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_limit
  BEFORE INSERT ON seeds
  FOR EACH ROW EXECUTE FUNCTION check_seed_limit();

-- ─── Match Results & Placements ────────────────────────────────

CREATE TABLE match_results (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id text        NOT NULL REFERENCES competitions(id),
  stage          match_stage NOT NULL,
  bracket_id     uuid        REFERENCES prelim_brackets(id),
  player_a_id    uuid        NOT NULL REFERENCES players(id),
  player_b_id    uuid        NOT NULL REFERENCES players(id),
  score_a        int         NOT NULL CHECK (score_a >= 0),
  score_b        int         NOT NULL CHECK (score_b >= 0),
  winner_id      uuid        NOT NULL REFERENCES players(id),
  played_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (player_a_id <> player_b_id),
  CHECK (winner_id = player_a_id OR winner_id = player_b_id)
);

CREATE INDEX match_results_comp ON match_results (competition_id, stage);
CREATE INDEX match_results_pla  ON match_results (player_a_id);
CREATE INDEX match_results_plb  ON match_results (player_b_id);

-- Final placements — one row per (competition, player); rank 1 = champion
CREATE TABLE placements (
  competition_id text NOT NULL REFERENCES competitions(id),
  player_id      uuid NOT NULL REFERENCES players(id),
  rank           int  NOT NULL CHECK (rank >= 1),
  PRIMARY KEY (competition_id, player_id)
);

CREATE INDEX placements_by_player ON placements (player_id);
CREATE INDEX placements_comp_rank ON placements (competition_id, rank);

-- ─── Coin Ledger ──────────────────────────────────────────────

CREATE TABLE coin_txns (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  uuid        NOT NULL REFERENCES players(id),
  delta      int         NOT NULL CHECK (delta <> 0),
  reason     coin_reason NOT NULL,
  ref_id     text,                       -- attempt_id, store item id, etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX coin_txns_player_time ON coin_txns (player_id, created_at DESC);

-- Balance derived from ledger; never store a mutable balance column
CREATE VIEW coin_balances AS
  SELECT player_id, coalesce(sum(delta), 0)::int AS balance
  FROM coin_txns
  GROUP BY player_id;

-- ─── Ranking Materialized View ────────────────────────────────
-- Rolling 52-week window; same curve as ranking.ts:computeRanking
-- Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY ranking_entries;
-- Call after each competition result is entered.
CREATE MATERIALIZED VIEW ranking_entries AS
  SELECT
    pl.player_id,
    c.discipline_id,
    sum(points_for_placement(pl.rank, c.tier))::int  AS points,
    count(*)::int                                     AS events,
    min(pl.rank)                                      AS best_placement,
    (array_agg(c.tier ORDER BY
      CASE c.tier WHEN 'S' THEN 4 WHEN 'A' THEN 3 WHEN 'B' THEN 2 ELSE 1 END DESC
    ))[1]                                             AS best_tier,
    max(c.date)                                       AS last_event_at
  FROM placements pl
  JOIN competitions c ON c.id = pl.competition_id
  JOIN players      p ON p.id = pl.player_id
  WHERE c.date    > current_date - interval '52 weeks'
    AND p.deleted_at IS NULL
  GROUP BY pl.player_id, c.discipline_id
WITH DATA;

CREATE UNIQUE INDEX ranking_entries_pk       ON ranking_entries (player_id, discipline_id);
CREATE        INDEX ranking_entries_disc_pts ON ranking_entries (discipline_id, points DESC);

-- ─── Notifications ────────────────────────────────────────────

CREATE TABLE notifications (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  uuid         NOT NULL REFERENCES players(id),
  channel    notif_channel NOT NULL,
  template   text         NOT NULL,
  payload    jsonb        NOT NULL DEFAULT '{}',
  status     notif_status NOT NULL DEFAULT 'queued',
  created_at timestamptz  NOT NULL DEFAULT now(),
  sent_at    timestamptz
);

CREATE INDEX notif_player_status ON notifications (player_id, status);
CREATE INDEX notif_queued        ON notifications (created_at) WHERE status = 'queued';

-- ─── Row-Level Security ────────────────────────────────────────
-- All tables locked down by default; policies define access.
-- "temp allow all" policies are placeholders until Supabase Auth is wired (Phase 1 → Auth epic).

ALTER TABLE disciplines          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE players              ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_disciplines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE prelim_brackets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE seeds                ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results        ENABLE ROW LEVEL SECURITY;
ALTER TABLE placements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_txns            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;

-- Public catalog reads
CREATE POLICY "public read" ON disciplines          FOR SELECT USING (true);
CREATE POLICY "public read" ON sponsors             FOR SELECT USING (true);
CREATE POLICY "public read" ON competitions         FOR SELECT USING (true);
CREATE POLICY "public read" ON competition_sponsors FOR SELECT USING (true);
CREATE POLICY "public read" ON prizes               FOR SELECT USING (true);
CREATE POLICY "public read" ON prelim_brackets      FOR SELECT USING (true);
CREATE POLICY "public read" ON match_results        FOR SELECT USING (true);
CREATE POLICY "public read" ON placements           FOR SELECT USING (true);

-- Players: public read non-deleted, self-registration insert
CREATE POLICY "public read active"   ON players            FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "public read"          ON player_disciplines  FOR SELECT USING (true);

-- Private tables: placeholder until Auth wired → replace with uid()-scoped policies
CREATE POLICY "temp allow all" ON players            FOR INSERT WITH CHECK (true);
CREATE POLICY "temp allow all" ON player_disciplines FOR ALL   USING (true);
CREATE POLICY "temp allow all" ON attempts           FOR ALL   USING (true);
CREATE POLICY "temp allow all" ON seeds              FOR ALL   USING (true);
CREATE POLICY "temp allow all" ON coin_txns          FOR ALL   USING (true);
CREATE POLICY "temp allow all" ON notifications      FOR ALL   USING (true);
