#!/usr/bin/env node
// Deploy the CURRENT working tree to a rehearsal app.
//
//   node scripts/rehearsal/deploy.mjs --app gameland-rehearsal
//
// Guards (CLAUDE.md §1): refuses if the checkout is behind origin/mvp, because
// `liara deploy` uploads the working directory, not git — a stale tree would
// silently ship old code into the rehearsal and make the test meaningless.
// Use --allow-dirty to deploy an intentionally-modified tree.

import { assertSafeTarget, argApp, sh } from './_lib.mjs'
import { execFileSync } from 'node:child_process'

const app = argApp()
assertSafeTarget(app)   // never let this point at "gameland"

execFileSync('git', ['fetch', 'origin', 'mvp', '--quiet'], { stdio: 'inherit' })
const behind = sh('git', ['rev-list', '--count', 'HEAD..origin/mvp']).trim()
const dirty = sh('git', ['status', '--porcelain']).trim()

if (behind !== '0') {
  console.error(`\n✖ checkout is ${behind} commit(s) behind origin/mvp — rebase/pull before a rehearsal deploy.\n`)
  process.exit(1)
}
if (dirty && !process.argv.includes('--allow-dirty')) {
  console.error(`\n✖ working tree has uncommitted changes:\n${dirty}\n  pass --allow-dirty if that is intentional for this rehearsal.\n`)
  process.exit(1)
}

console.log(`\n▶ liara deploy --app ${app} --no-app-logs\n`)
execFileSync('liara', ['deploy', '--app', app, '--no-app-logs'], { stdio: 'inherit' })
console.log(`\n✓ deployed to ${app}. Give it ~30s, then open https://${app}.liara.run\n`)
