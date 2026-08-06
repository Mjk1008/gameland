#!/usr/bin/env node
/**
 * Sync production Liara env into .env.local for production-like local testing.
 *
 * - Pulls DATABASE_URL + admin flags from Liara (same Postgres as live).
 * - Forces NEXTAUTH_URL / NEXT_PUBLIC_APP_URL to localhost (cookies work locally).
 * - Strips KAVENEGAR by default so OTP stays 123456 (pass --with-sms for real SMS).
 *
 * ⚠ Writes go to the LIVE database — treat local edits as production mutations.
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(__dirname, '..')
const envPath = path.join(webRoot, '.env.local')
const withSms = process.argv.includes('--with-sms')

const PULL_KEYS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'AUTH_PROVIDER',
  'ADMIN_EMAILS',
  'ADMIN_PHONES',
  'HONOR_USER_PHONE',
  'GOOGLE_OAUTH_ENABLED',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
]
if (withSms) {
  PULL_KEYS.push('KAVENEGAR_API_KEY', 'KAVENEGAR_OTP_TEMPLATE', 'KAVENEGAR_SENDER')
}

const LOCAL_OVERRIDES = {
  NEXTAUTH_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  GOOGLE_OAUTH_ENABLED: 'false',
}

function parseEnvFile(text) {
  const map = new Map()
  const lines = text.split('\n')
  for (const line of lines) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim())
    if (m) map.set(m[1], m[2])
  }
  return map
}

function serializeEnv(map, header) {
  const keys = [...map.keys()].sort((a, b) => {
    const order = ['DATABASE_URL', 'AUTH_PROVIDER', 'NEXTAUTH_URL', 'NEXTAUTH_SECRET']
    const ai = order.indexOf(a), bi = order.indexOf(b)
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    return a.localeCompare(b)
  })
  const body = keys.map(k => `${k}=${map.get(k) ?? ''}`).join('\n')
  return `${header}\n${body}\n`
}

function pullLiaraEnv() {
  const raw = execSync('liara env ls -a gameland --output json', { encoding: 'utf8', cwd: webRoot })
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error('Could not parse liara env json')
  const rows = JSON.parse(raw.slice(start, end + 1))
  const out = new Map()
  for (const row of rows) {
    if (PULL_KEYS.includes(row.key)) out.set(row.key, row.value ?? '')
  }
  return out
}

const header = `# Generated/updated by npm run local:prod:sync — production-like local testing
# ⚠ DATABASE_URL points at LIVE Liara Postgres. Local writes affect production data.
# OTP: 123456 unless you ran with --with-sms`

const existing = fs.existsSync(envPath) ? parseEnvFile(fs.readFileSync(envPath, 'utf8')) : new Map()
const pulled = pullLiaraEnv()

for (const [k, v] of pulled) existing.set(k, v)
for (const [k, v] of Object.entries(LOCAL_OVERRIDES)) existing.set(k, v)

if (!withSms) {
  existing.delete('KAVENEGAR_API_KEY')
  existing.delete('KAVENEGAR_OTP_TEMPLATE')
  existing.delete('KAVENEGAR_SENDER')
}

if (!existing.get('DATABASE_URL')) {
  console.error('ERROR: DATABASE_URL missing from Liara — are you logged in? (liara login)')
  process.exit(1)
}

fs.writeFileSync(envPath, serializeEnv(existing, header))
console.log('✓ .env.local synced for production-like local testing')
console.log('  DATABASE_URL → Liara Postgres (live data)')
console.log(`  OTP → ${withSms ? 'real SMS via Kavenegar' : '123456 (dev stub)'}`)
console.log('  NEXTAUTH_URL → http://localhost:3000')
console.log('')
console.log('Next: npm run local:prod')
