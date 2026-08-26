// One-time SMS codes — in-memory (single-instance Liara), short TTL + limits.
import crypto from 'crypto'

type Rec = { code: string; exp: number; tries: number }
const codes = new Map<string, Rec>()
const lastSend = new Map<string, number>()

const TTL = 2 * 60 * 1000          // code valid 2 min
const COOLDOWN = 60 * 1000         // one send per phone per 60s
const MAX_TRIES = 5

export function canSend(phone: string): boolean {
  const t = lastSend.get(phone)
  return !t || Date.now() - t > COOLDOWN
}

export function issueCode(phone: string): string {
  // lazy prune so the maps don't grow unbounded over the instance's lifetime
  // (10k+ phones during launch). Only sweeps once the map is sizeable.
  if (lastSend.size > 500) {
    const now = Date.now()
    for (const [p, t] of lastSend) if (now - t > COOLDOWN) lastSend.delete(p)
    for (const [p, r] of codes) if (now > r.exp) codes.delete(p)
  }
  // No Kavenegar → fixed dev code (README + local:prod). With Kavenegar → random 5-digit.
  const code = process.env.KAVENEGAR_API_KEY
    ? String(crypto.randomInt(10000, 100000))
    : '123456'
  codes.set(phone, { code, exp: Date.now() + TTL, tries: 0 })
  lastSend.set(phone, Date.now())
  if (!process.env.KAVENEGAR_API_KEY) {
    console.log(`[OTP] ${phone} → ${code} (dev stub — set KAVENEGAR_API_KEY for real SMS)`)
  }
  return code
}

export function verifyCode(phone: string, input: string): boolean {
  // No unconditional bypass here, even in dev: without KAVENEGAR_API_KEY,
  // issueCode() already stores the fixed '123456' code for that phone, so
  // the normal check below still lets local dev in — but only for a phone
  // that actually requested a code, respecting TTL/tries like production.
  const r = codes.get(phone)
  if (!r) return false
  if (Date.now() > r.exp || r.tries >= MAX_TRIES) { codes.delete(phone); return false }
  r.tries++
  if (r.code === (input || '').trim()) { codes.delete(phone); return true }
  return false
}
