#!/usr/bin/env node
// Reset a rehearsal database back to "approved, not yet drawn" so you can run
// the whole قرعه‌کشی → prelim → final → finalize flow again from scratch.
//
//   node scripts/rehearsal/reset-brackets.mjs --app gameland-rehearsal --confirm
//   node scripts/rehearsal/reset-brackets.mjs --app gameland-rehearsal --comp <eventId> --confirm
//
// Keeps: users, teams, registrations (rows), avatars, receipts, competitions, events.
// Wipes: matches, placements; zeroes registrations.seeds_earned / prelims_completed;
//        zeroes users.ranking_points / ranking_events  (bonus_points is left alone).
// Does NOT touch reg.status — approved regs stay approved so the redraw has a field.
//
// AFTER running this you MUST restart the rehearsal app (it caches all of the
// above in RAM):   liara app restart --app <app>     (or run deploy.mjs)

import { liaraEnv, assertSafeTarget, argApp, requireFlag } from './_lib.mjs'
import postgres from 'postgres'   // resolved from web/node_modules

requireFlag('--confirm', 'reset-brackets.mjs deletes all match/placement rows in the target DB.')

const app = argApp()
const env = assertSafeTarget(app)
const ci = process.argv.indexOf('--comp')
const comp = ci !== -1 ? process.argv[ci + 1] : null

const sql = postgres(env.DATABASE_URL, { prepare: false, ssl: false, idle_timeout: 5 })

const where = comp ? sql`WHERE comp_id = ${comp}` : sql``
const regWhere = comp ? sql`WHERE comp_id = ${comp}` : sql``

try {
  const m = await sql`DELETE FROM app_matches ${where}`
  const p = await sql`DELETE FROM app_placements ${where}`
  const r = await sql`UPDATE app_registrations SET seeds_earned = 0, prelims_completed = 0 ${regWhere}`
  // ranking points are recomputed on finalize; zero them globally for a clean
  // re-run only when resetting every event (scoped resets leave them be).
  let uCount = 0
  if (!comp) uCount = (await sql`UPDATE app_users SET ranking_points = 0, ranking_events = 0`).count

  console.log(`\n✓ reset "${app}"${comp ? ` (event ${comp})` : ' (all events)'}`)
  console.log(`  matches deleted     : ${m.count}`)
  console.log(`  placements deleted  : ${p.count}`)
  console.log(`  registrations reset : ${r.count}`)
  if (!comp) console.log(`  users ranking zeroed: ${uCount}`)
  console.log(`\n⚠ restart the app so it re-hydrates:  liara app restart --app ${app}\n`)
} finally {
  await sql.end()
}
