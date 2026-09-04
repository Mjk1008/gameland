#!/usr/bin/env node
// Clone the LIVE gameland database into a rehearsal database.
//
//   node scripts/rehearsal/clone.mjs --app gameland-rehearsal --confirm
//   node scripts/rehearsal/clone.mjs --app gameland-rehearsal --confirm --with-blobs
//
// - Source : gameland DATABASE_URL   (read-only: pg_dump, custom format → file)
// - Target : <app>    DATABASE_URL   (must pass assertSafeTarget)
// - Two-phase: dump to a compressed file in the scratchpad, then pg_restore.
//   (Streaming pg_dump|psql over Liara's public gateway drops mid-COPY on the
//   big base64 tables — "server closed the connection unexpectedly".)
// - Skips row-data for noise + every base64-blob table by default. The app
//   tolerates missing blobs (serves nothing, hasAvatar()→false). Pass
//   --with-blobs to include them (slower, may need retries).
// - Liara Postgres rejects SSL → ?sslmode=disable ; libpq keepalives added so
//   a slow COPY isn't reaped.
//
// Needs pg_dump + pg_restore + psql (brew install libpq && brew link --force libpq).

import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { liaraEnv, assertSafeTarget, parsePg, argApp, requireFlag, LIVE_APP, pgRestoreUrl } from './_lib.mjs'

requireFlag('--confirm', 'clone.mjs OVERWRITES the target database with a copy of live data.')

const app = argApp()
const withBlobs = process.argv.includes('--with-blobs')
const targetEnv = assertSafeTarget(app)
const SRC = tune(liaraEnv(LIVE_APP).DATABASE_URL)
const DST = tune(pgRestoreUrl(app, targetEnv.DATABASE_URL))

function tune(u) {
  const extra = 'sslmode=disable&keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=6'
  return u + (u.includes('?') ? '&' : '?') + extra
}

// Always skip: churn/noise tables. Also skip base64-blob tables unless --with-blobs.
const BLOB_TABLES = [
  'app_avatars', 'app_receipts', 'app_gamenet_photos',
  'app_news', 'app_promos', 'app_competition_covers', 'app_event_covers',
]
const SKIP_DATA = [
  'app_ai_messages', 'app_track_events', 'app_notifications', 'app_coin_txns',
  ...(withBlobs ? [] : BLOB_TABLES),
]

const s = parsePg(SRC), d = parsePg(DST)
console.log(`\nclone  ${s.host}:${s.port}/${s.db}  →  ${d.host}:${d.port}/${d.db}   (app: ${app})`)
console.log(`blobs: ${withBlobs ? 'INCLUDED' : 'skipped (schema kept, data omitted)'}`)
console.log(`skip row-data: ${SKIP_DATA.join(', ')}\n`)

const dir = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'gl-clone-'))
const dumpFile = join(dir, 'live.dump')

console.log('▶ 1/2  pg_dump  (live, read-only, custom format → ' + dumpFile + ')')
execFileSync('pg_dump', [
  SRC,
  '--format=custom', '--no-owner', '--no-privileges', '--no-comments',
  '--file=' + dumpFile,
  ...SKIP_DATA.flatMap(t => ['--exclude-table-data', t]),
], { stdio: 'inherit' })

console.log('\n▶ 2/2  wipe rehearsal public schema, then pg_restore')
// --clean --if-exists cannot DROP tables that still have FKs pointing at them
// (app_matches → app_users). Empty the target schema first. DST already passed
// assertSafeTarget(); refuse anyway if host:port/db equals live.
if (`${d.host}:${d.port}/${d.db}` === `${s.host}:${s.port}/${s.db}`) {
  console.error('✖ abort: restore URL equals live DB')
  process.exit(1)
}
execFileSync('psql', [
  DST, '-v', 'ON_ERROR_STOP=1',
  '-c', 'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;',
], { stdio: 'inherit' })
execFileSync('pg_restore', [
  '--dbname=' + DST,
  '--no-owner', '--no-privileges',
  '--jobs=3',
  dumpFile,
], { stdio: 'inherit' })

console.log('\n✓ clone done.  file: ' + dumpFile + '  (delete when satisfied)')
console.log('  next:  node scripts/rehearsal/deploy.mjs --app ' + app + '\n')
