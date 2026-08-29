#!/usr/bin/env node
// Verify a rehearsal app is safely isolated BEFORE seeding / cloning / drawing.
// Read-only. Run this first, and again any time you change the staging env.
//
//   node scripts/rehearsal/preflight.mjs --app gameland-rehearsal

import { liaraEnv, assertSafeTarget, parsePg, argApp, LIVE_APP } from './_lib.mjs'

const app = argApp()
console.log(`\nPreflight for "${app}"\n${'─'.repeat(40)}`)

const env = liaraEnv(app)
const live = liaraEnv(LIVE_APP)

const tgt = parsePg(env.DATABASE_URL)
const src = parsePg(live.DATABASE_URL)
console.log(`  DATABASE_URL   → ${tgt.host}:${tgt.port}/${tgt.db}`)
console.log(`  live DB is     → ${src.host}:${src.port}/${src.db}`)
console.log(`  KAVENEGAR key  → ${env.KAVENEGAR_API_KEY ? 'PRESENT ✖' : 'absent ✓'}`)
console.log(`  METIS key      → ${env.METIS_API_KEY ? 'present (assistant billable)' : 'absent (assistant off)'}`)
console.log(`  ASSISTANT_ENABLED → ${env.ASSISTANT_ENABLED ?? '(unset → on)'}`)
console.log(`  NEXTAUTH_URL   → ${env.NEXTAUTH_URL ?? '(unset)'}`)
console.log(`  ADMIN_PHONES   → ${env.ADMIN_PHONES ?? env.ADMIN_EMAILS ?? '(unset)'}`)

assertSafeTarget(app, env)
console.log(`\n✓ "${app}" looks isolated. Safe to clone / seed / draw.\n`)
