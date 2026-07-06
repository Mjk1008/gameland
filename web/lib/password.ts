// Password hashing via Node's built-in scrypt (no external dep).
// Stored format: "salt:hash" (both hex). Constant-time compare on verify.
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pw, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(pw: string, stored: string | undefined | null): boolean {
  if (!stored) return false
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  try {
    const a = scryptSync(pw, salt, 64)
    const b = Buffer.from(hash, 'hex')
    return a.length === b.length && timingSafeEqual(a, b)
  } catch { return false }
}

export const MIN_PASSWORD = 8
