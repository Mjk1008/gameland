// DB client — lazy connection to Postgres via Drizzle when DATABASE_URL set.
// When unset, callers fall back to in-memory store. This makes the buyer
// flip from dev → prod by setting one env var and running migrations.

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let _db: PostgresJsDatabase<typeof schema> | null = null
let _initTried = false

export function db(): PostgresJsDatabase<typeof schema> | null {
  if (_initTried) return _db
  _initTried = true
  const url = process.env.DATABASE_URL
  if (!url) return null
  try {
    const sql = postgres(url, { max: 5, idle_timeout: 30, prepare: false })
    _db = drizzle(sql, { schema })
    return _db
  } catch (err) {
    console.error('[db] connection failed:', err)
    return null
  }
}

export const usingDb = () => db() !== null

export { schema }
