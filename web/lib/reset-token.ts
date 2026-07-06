// Stateless password-reset token: HMAC-signed "userId.expiry" (no DB table).
import { createHmac, timingSafeEqual } from 'crypto'

const TTL_MS = 30 * 60 * 1000 // 30 minutes
const secret = () => process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-prod'

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function makeResetToken(userId: string): string {
  const exp = Date.now() + TTL_MS
  const payload = `${userId}.${exp}`
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`
}

// Returns userId if valid & unexpired, else null.
export function verifyResetToken(token: string): string | null {
  try {
    const [b64, sig] = token.split('.')
    if (!b64 || !sig) return null
    const payload = Buffer.from(b64, 'base64url').toString('utf8')
    const expected = sign(payload)
    const a = Buffer.from(sig), b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const [userId, expStr] = payload.split('.')
    if (!userId || Number(expStr) < Date.now()) return null
    return userId
  } catch { return null }
}
