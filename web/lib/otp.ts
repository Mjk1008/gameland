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
  const code = String(crypto.randomInt(10000, 100000))  // 5 digits
  codes.set(phone, { code, exp: Date.now() + TTL, tries: 0 })
  lastSend.set(phone, Date.now())
  return code
}

export function verifyCode(phone: string, input: string): boolean {
  const r = codes.get(phone)
  if (!r) return false
  if (Date.now() > r.exp || r.tries >= MAX_TRIES) { codes.delete(phone); return false }
  r.tries++
  if (r.code === (input || '').trim()) { codes.delete(phone); return true }
  return false
}
