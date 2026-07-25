// Honorary-user gate — a one-off, fully isolated perk.
//
// Fail-closed by design: with HONOR_USER_PHONE unset the whole feature is
// inert, so shipping this code without the env var changes nothing for
// anybody. Nothing here touches auth, the store, the schema or ranking.
//
// To retire the feature: unset the env var (instant, no deploy), or delete
// this file together with components/HonorPoster.tsx and app/arcade/.

import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

// Persian/Arabic-Indic digits → ASCII, so a number typed in either script
// compares equal.
function normalizePhone(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/\D/g, '')
}

/**
 * Allow-list, comma-separated so a tester can be added and dropped again
 * without a deploy: HONOR_USER_PHONE="09xxxxxxxxx,09yyyyyyyyy".
 */
function allowList(): string[] {
  return (process.env.HONOR_USER_PHONE || '')
    .split(',')
    .map(normalizePhone)
    .filter(Boolean)
}

/** True when the signed-in user is on the honorary allow-list. */
export async function isHonoraryUser(): Promise<boolean> {
  const allowed = allowList()
  if (!allowed.length) return false // feature off

  const session = await getServerSession(authOptions)
  const phone = normalizePhone((session as any)?.phone)
  return !!phone && allowed.includes(phone)
}
