-- Gameland read-only analytics role (Phase 0)
-- Run once against Liara Postgres as a superuser / owner — NOT from the app.
-- Idempotent-ish: safe to re-run; adjusts grants and role settings.
--
-- After run: set a real password and store in a secrets manager.
--   ALTER ROLE gameland_readonly PASSWORD '...';
--
-- Tables verified against web/lib/db/schema.ts + ensureSchema in persistence.ts (2026-08-13).

-- ─── Role ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gameland_readonly') THEN
    CREATE ROLE gameland_readonly LOGIN;
    RAISE NOTICE 'Created role gameland_readonly — set PASSWORD before use.';
  ELSE
    RAISE NOTICE 'Role gameland_readonly already exists.';
  END IF;
END
$$;

ALTER ROLE gameland_readonly SET statement_timeout = '10s';
ALTER ROLE gameland_readonly SET lock_timeout = '5s';
ALTER ROLE gameland_readonly SET default_transaction_read_only = on;
ALTER ROLE gameland_readonly SET search_path = public;

-- ─── Database + schema ──────────────────────────────────────────────────────

DO $$
DECLARE dbname text := current_database();
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO gameland_readonly', dbname);
END
$$;
GRANT USAGE ON SCHEMA public TO gameland_readonly;

-- ─── Full-table SELECT (analytics-safe, no blob bytes) ─────────────────────

GRANT SELECT ON
  app_competitions,
  app_disciplines,
  app_events,
  app_registrations,
  app_matches,
  app_placements,
  app_teams,
  app_team_members,
  app_notifications,
  app_coin_txns,
  app_sponsors,
  app_track_events,
  app_promoter_codes,
  app_promoter_earnings,
  app_gamenets,
  app_play_requests,
  app_play_matches,
  app_settings
TO gameland_readonly;

-- ─── Column-level SELECT (PII trimmed) ──────────────────────────────────────

REVOKE ALL ON app_users FROM gameland_readonly;
GRANT SELECT (
  id,
  tag,
  province,
  city,
  primary_disc,
  discs,
  experience_years,
  role,
  referred_by,
  free_tickets,
  referral_milestone,
  bonus_points,
  coin_balance,
  created_at,
  deleted_at
) ON app_users TO gameland_readonly;
-- Excluded: phone, email, name, first_name, last_name, national_id, password_hash,
--           google_sub, messenger, player_id, avatar_url, team_name

REVOKE ALL ON app_receipts FROM gameland_readonly;
GRANT SELECT (reg_id, created_at) ON app_receipts TO gameland_readonly;
-- Excluded: data_url (payment receipt image bytes)

REVOKE ALL ON app_ai_messages FROM gameland_readonly;
GRANT SELECT (
  id,
  user_id,
  role,
  prompt_tokens,
  completion_tokens,
  created_at
) ON app_ai_messages TO gameland_readonly;
-- Excluded: content (chat transcript)

-- ─── Blob / media tables — explicit REVOKE ──────────────────────────────────

REVOKE ALL ON
  app_avatars,
  app_competition_covers,
  app_event_covers,
  app_gamenet_photos,
  app_promos,
  app_news
FROM gameland_readonly;

-- ─── Default privileges (optional: new tables created by app owner) ───────────
-- Uncomment if the app DB user creates future tables and you want deny-by-default:
--
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   REVOKE ALL ON TABLES FROM gameland_readonly;

-- ─── Smoke test (run as gameland_readonly after setting password) ───────────
--
--   SELECT COUNT(*) FROM app_registrations;
--   SELECT COUNT(*) FROM app_receipts;          -- should work (metadata only)
--   SELECT data_url FROM app_receipts LIMIT 1;  -- should FAIL
--   SELECT phone FROM app_users LIMIT 1;        -- should FAIL
