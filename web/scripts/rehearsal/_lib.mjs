// Shared helpers for the rehearsal (dry-run) tooling.
//
// SAFETY MODEL — every script that can write to a database routes through
// assertSafeTarget(). It refuses to run unless ALL of these hold:
//   1. target app name is in the REHEARSAL_APPS allow-list (never "gameland")
//   2. target DATABASE_URL host+db differ from the LIVE gameland DB
//   3. target env has NO KAVENEGAR_API_KEY  (so no SMS reaches real numbers)
//
// Nothing here talks to the live app except read-only `liara env ls`.

import { execFileSync } from 'node:child_process'

export const LIVE_APP = 'gameland'
export const REHEARSAL_APPS = ['gameland-rehearsal', 'gameland-staging', 'gameland-dryrun']

export function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'], ...opts })
}

/** Pull an app's env from Liara as a plain object. Read-only. */
export function liaraEnv(app) {
  const raw = sh('liara', ['env', 'ls', '-a', app, '--output', 'json'])
  const s = raw.indexOf('['), e = raw.lastIndexOf(']')
  if (s === -1 || e === -1) throw new Error(`could not parse "liara env ls -a ${app}" output`)
  const rows = JSON.parse(raw.slice(s, e + 1))
  const out = {}
  for (const r of rows) out[r.key] = r.value ?? ''
  return out
}

export function parsePg(url) {
  // postgres://user:pass@host:port/db?params
  const m = /^postgres(?:ql)?:\/\/(?:([^:@/]+)(?::([^@/]*))?@)?([^:/?]+)(?::(\d+))?\/([^?]+)/.exec(url || '')
  if (!m) throw new Error('unparseable DATABASE_URL')
  return { user: m[1], pass: m[2], host: m[3], port: m[4] || '5432', db: m[5] }
}

let _liveKey = null
function liveDbKey() {
  if (_liveKey) return _liveKey
  const p = parsePg(liaraEnv(LIVE_APP).DATABASE_URL)
  _liveKey = `${p.host}:${p.port}/${p.db}`
  return _liveKey
}

/**
 * Throw unless `app` is a safe rehearsal target.
 * @param {string} app        target Liara app name
 * @param {object} [env]       already-fetched env for that app (optional)
 */
export function assertSafeTarget(app, env) {
  const problems = []
  env = env || liaraEnv(app)

  if (app === LIVE_APP) problems.push(`app is the LIVE app "${LIVE_APP}"`)
  if (!REHEARSAL_APPS.includes(app))
    problems.push(`app "${app}" not in allow-list [${REHEARSAL_APPS.join(', ')}] — add it to REHEARSAL_APPS in _lib.mjs if it is genuinely a throwaway`)

  if (!env.DATABASE_URL) problems.push('target has no DATABASE_URL')
  else {
    const p = parsePg(env.DATABASE_URL)
    const key = `${p.host}:${p.port}/${p.db}`
    if (key === liveDbKey()) problems.push(`target DATABASE_URL is the LIVE gameland database (${key})`)
  }

  if (env.KAVENEGAR_API_KEY)
    problems.push('target env still has KAVENEGAR_API_KEY — strip it first (real SMS would fire to real numbers on draw/approve)')

  if (problems.length) {
    console.error(`\n✖ refusing to touch "${app}":`)
    for (const x of problems) console.error(`  - ${x}`)
    console.error('')
    process.exit(1)
  }
  return env
}

export function requireFlag(flag, msg) {
  if (!process.argv.includes(flag)) {
    console.error(`\n✖ ${msg}\n  re-run with ${flag} once you have read docs/29-rehearsal-plan.md\n`)
    process.exit(1)
  }
}

export function argApp(fallback = 'gameland-rehearsal') {
  const i = process.argv.indexOf('--app')
  return i !== -1 ? process.argv[i + 1] : fallback
}
