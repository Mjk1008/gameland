#!/usr/bin/env node
// ONE-OFF INCIDENT RECOVERY — restores the PES2021 event that was hard-deleted
// from LIVE production by an admin misclick, using the rehearsal DB clone as
// the recovery source (rehearsal was cloned from live before the delete).
//
// Incident:
//   event   e_ku24s9o5  "GAME LAND THE BEST IV — PES 2021"  (disc: pes21, 1v1)
//   mother  cup_9ndr0xjv "GAME LAND THE BEST IV"  — untouched, do not restore it
//   deleteEvent() hard-deletes + CASCADEs: app_events, app_registrations,
//   app_matches, app_event_covers for that comp_id. Confirmed nothing else
//   was touched (other events/competitions on live are fine).
//
// Source of truth: gameland-rehearsal DB (READ ONLY — never write to it).
// Target: gameland (LIVE) DB — the only intentional live-write script in this
// repo. It does NOT route through assertSafeTarget() (that helper exists to
// keep rehearsal scripts OFF live; here live is the deliberate target), so
// read every log line before passing --confirm.
//
// What this restores:  app_events row + app_event_covers row (if any) +
//   ALL app_registrations rows for e_ku24s9o5 (pending/approved/rejected —
//   all 357, not just approved).
// What this deliberately skips:
//   - app_matches / app_placements — none existed yet (bracket wasn't drawn
//     on live before the delete); tonight's draw runs fresh on live.
//   - app_receipts / app_promoter_earnings — both key by reg_id with NO
//     foreign key to app_registrations, so the ~170 orphaned receipt rows
//     and any orphaned promoter-earning rows already sitting on LIVE
//     re-attach automatically the instant a registration with that same
//     `id` exists again. Do not touch either table.
//
// The rehearsal clone is a snapshot from ~2026-09-05 21:24 UTC. Anyone who
// registered on LIVE after that moment (during the outage window) is NOT in
// this dataset — run with --report-gap to list them from live
// app_track_events so they can be handled by hand (do not guess their
// attempts/payment fields from analytics events).
//
// Usage:
//   node scripts/restore-e_ku24s9o5-once.mjs                 # dry run (default)
//   node scripts/restore-e_ku24s9o5-once.mjs --report-gap     # list post-clone live signups (read-only, either DB)
//   node scripts/restore-e_ku24s9o5-once.mjs --confirm        # actually write to LIVE
//
// After a successful --confirm run you MUST restart live so it re-hydrates
// from Postgres (the store is in-memory):
//   liara app restart --app gameland
//
// Requires: `liara` CLI logged in, run from web/ (resolves the `postgres` pkg
// from web/node_modules), network path to both Liara Postgres instances.

import { liaraEnv, parsePg } from './rehearsal/_lib.mjs'
import postgres from 'postgres'

const EVENT_ID = 'e_ku24s9o5'
const REHEARSAL_APP = 'gameland-rehearsal'
const LIVE_APP = 'gameland'

const CONFIRM = process.argv.includes('--confirm')
const REPORT_GAP = process.argv.includes('--report-gap')

function connect(url) {
  return postgres(url, { prepare: false, ssl: false, idle_timeout: 5 })
}

const rehearsalEnv = liaraEnv(REHEARSAL_APP)
const liveEnv = liaraEnv(LIVE_APP)

{
  const r = parsePg(rehearsalEnv.DATABASE_URL)
  const l = parsePg(liveEnv.DATABASE_URL)
  if (`${r.host}:${r.db}` === `${l.host}:${l.db}`) {
    console.error('\n✖ rehearsal and live resolved to the SAME database — aborting before touching anything.\n')
    process.exit(1)
  }
  console.log(`source (read-only) → ${r.host}/${r.db}`)
  console.log(`target (${CONFIRM ? 'WRITE' : 'dry-run, no write'})   → ${l.host}/${l.db}\n`)
}

const rdb = connect(rehearsalEnv.DATABASE_URL)
const ldb = connect(liveEnv.DATABASE_URL)

try {
  if (REPORT_GAP) {
    // Read-only on both sides. Lists live users whose reg_approved track
    // event for this comp postdates the rehearsal clone — i.e. they are NOT
    // in the dataset we're about to restore and need manual handling.
    const cloned = await rdb`SELECT user_id FROM app_registrations WHERE comp_id = ${EVENT_ID}`
    const clonedIds = new Set(cloned.map(r => r.user_id))
    const liveApproved = await ldb`
      SELECT DISTINCT user_id, min(created_at) AS first_seen
      FROM app_track_events
      WHERE name = 'reg_approved' AND props LIKE ${'%' + EVENT_ID + '%'} AND user_id IS NOT NULL
      GROUP BY user_id ORDER BY first_seen`
    const gap = liveApproved.filter(r => !clonedIds.has(r.user_id))
    console.log(`live reg_approved track rows for ${EVENT_ID}: ${liveApproved.length}`)
    console.log(`already covered by rehearsal clone: ${liveApproved.length - gap.length}`)
    console.log(`NOT in the restore set — handle by hand:\n`)
    for (const g of gap) console.log(`  ${g.user_id}  first tracked ${g.first_seen.toISOString()}`)
    process.exit(0)
  }

  // ── Pull from rehearsal (read-only) ────────────────────────────────────
  const [eventRow] = await rdb`SELECT * FROM app_events WHERE id = ${EVENT_ID}`
  if (!eventRow) { console.error(`✖ ${EVENT_ID} not found on rehearsal — nothing to restore from.`); process.exit(1) }
  const [coverRow] = await rdb`SELECT * FROM app_event_covers WHERE event_id = ${EVENT_ID}`
  const regRows = await rdb`SELECT * FROM app_registrations WHERE comp_id = ${EVENT_ID} ORDER BY created_at`

  console.log(`rehearsal has: event row ✓, cover ${coverRow ? '✓' : '(none)'}, ${regRows.length} registrations`)
  const byStatus = regRows.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {})
  console.log(`  by status: ${JSON.stringify(byStatus)}`)

  // ── Pre-checks against LIVE ─────────────────────────────────────────────
  const [alreadyLive] = await ldb`SELECT 1 FROM app_events WHERE id = ${EVENT_ID}`
  if (alreadyLive) { console.error(`✖ ${EVENT_ID} already exists on LIVE — has this already been restored? Aborting.`); process.exit(1) }

  const [discOk] = await ldb`SELECT 1 FROM app_disciplines WHERE id = ${eventRow.disc}`
  if (!discOk) { console.error(`✖ discipline "${eventRow.disc}" missing on LIVE — cannot satisfy FK. Aborting.`); process.exit(1) }

  const [orgOk] = await ldb`SELECT 1 FROM app_users WHERE id = ${eventRow.organizer_id}`
  if (!orgOk) { console.error(`✖ organizer_id "${eventRow.organizer_id}" missing on LIVE — cannot satisfy FK. Aborting.`); process.exit(1) }

  const regIds = regRows.map(r => r.id)
  const collidingRegs = regIds.length ? await ldb`SELECT id FROM app_registrations WHERE id IN ${ldb(regIds)}` : []
  if (collidingRegs.length) {
    console.error(`✖ ${collidingRegs.length} registration id(s) already exist on LIVE (id collision) — aborting:`)
    for (const c of collidingRegs) console.error(`  ${c.id}`)
    process.exit(1)
  }

  const userIds = [...new Set(regRows.map(r => r.user_id))]
  const liveUsers = userIds.length ? await ldb`SELECT id FROM app_users WHERE id IN ${ldb(userIds)}` : []
  const liveUserSet = new Set(liveUsers.map(u => u.id))
  const missingUsers = userIds.filter(id => !liveUserSet.has(id))
  if (missingUsers.length) {
    console.error(`✖ ${missingUsers.length} user_id(s) referenced by these registrations no longer exist on LIVE — aborting (decide by hand whether to drop just those rows):`)
    for (const m of missingUsers) console.error(`  ${m}`)
    process.exit(1)
  }

  console.log('\nall pre-checks passed.')
  if (!CONFIRM) {
    console.log('\nDRY RUN — nothing written. Re-run with --confirm to write to LIVE.')
    console.log('Run with --report-gap first/also to see post-clone live signups this restore will NOT cover.\n')
    process.exit(0)
  }

  // ── Write to LIVE, one transaction ──────────────────────────────────────
  await ldb.begin(async (tx) => {
    await tx`INSERT INTO app_events ${tx(eventRow)}`
    if (coverRow) await tx`INSERT INTO app_event_covers ${tx(coverRow)}`
    for (const r of regRows) await tx`INSERT INTO app_registrations ${tx(r)}`
  })

  console.log(`\n✓ restored event ${EVENT_ID} + ${regRows.length} registrations to LIVE.`)
  console.log('  app_receipts / app_promoter_earnings need no action — they re-attach automatically (no FK, matched by reg id).')
  console.log('\n⚠ REQUIRED NEXT STEP — live is in-memory, this SQL write is invisible until restart:')
  console.log(`    liara app restart --app ${LIVE_APP}`)
  console.log('\n  Then verify:')
  console.log(`    https://gamelandteam.ir/competitions/${EVENT_ID}`)
  console.log(`    SELECT status, count(*) FROM app_registrations WHERE comp_id='${EVENT_ID}' GROUP BY status;  -- expect approved=147, pending=30, rejected=180`)
  console.log(`    node scripts/restore-e_ku24s9o5-once.mjs --report-gap   -- handle any listed users by hand before drawing`)
} finally {
  await rdb.end()
  await ldb.end()
}
