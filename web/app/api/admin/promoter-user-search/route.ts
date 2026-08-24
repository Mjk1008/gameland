import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { allUsers, getUserById, whenReady, type User } from '@/lib/store'

async function adminOnly() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return null
  if (role !== 'admin' && role !== 'organizer') return null
  return uid
}

/** Persian/Arabic-Indic digits → ASCII. */
function toAsciiDigits(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
}

/** National 10-digit key: 9121234567 from 09… / +98… / 98… / Persian digits. */
function phoneKey(raw: string): string {
  let d = toAsciiDigits(raw).replace(/\D/g, '')
  if (d.startsWith('0098')) d = d.slice(4)
  else if (d.startsWith('98') && d.length >= 12) d = d.slice(2)
  if (d.startsWith('0')) d = d.slice(1)
  return d
}

function isDeleted(u: User): boolean {
  return !!(u.deletedAt ?? (u as { deletedAt?: number }).deletedAt)
}

function matchesQuery(u: User, raw: string, lower: string, key: string): boolean {
  const ascii = toAsciiDigits(raw).trim().toLowerCase()
  const tagQ = ascii.replace(/^@/, '')
  if (u.tag.toLowerCase().includes(tagQ) || u.tag.toLowerCase().includes(lower.replace(/^@/, ''))) return true
  if (u.name.toLowerCase().includes(lower) || u.name.toLowerCase().includes(ascii)) return true
  if (u.city?.includes(raw) || u.city?.includes(ascii)) return true
  if (u.id.toLowerCase().includes(lower)) return true
  if (u.playerId && u.playerId.toLowerCase().includes(lower)) return true
  if (key.length >= 3) {
    const stored = phoneKey(u.phone ?? '')
    if (stored && (stored.includes(key) || key.includes(stored))) return true
  }
  return false
}

function queryReady(raw: string): boolean {
  const key = phoneKey(raw)
  if (key.length >= 3) return true
  const t = toAsciiDigits(raw).trim()
  if (t.length < 2) return false
  if (/^\d+$/.test(t.replace(/[+\s()-]/g, '')) && key.length < 3) return false
  return t.length >= 2
}

function blockedReason(role: string): string | undefined {
  if (role === 'gamer') return undefined
  if (role === 'admin') return 'ادمین است — پروموتر فقط از حساب گیمر'
  if (role === 'organizer') return 'برگزارکننده است — پروموتر فقط از حساب گیمر'
  return 'نقش این حساب گیمر نیست'
}

export async function GET(req: Request) {
  await whenReady()
  if (!await adminOnly()) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const raw = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (!queryReady(raw)) {
    return NextResponse.json({ users: [], ready: false })
  }

  const lower = toAsciiDigits(raw).trim().toLowerCase()
  const key = phoneKey(raw)

  const users = allUsers()
    .filter(u => !isDeleted(u))
    .filter(u => matchesQuery(u, raw, lower, key))
    .sort((a, b) => Number(b.role === 'gamer') - Number(a.role === 'gamer') || b.createdAt - a.createdAt)
    .slice(0, 12)
    .map(u => ({
      id: u.id,
      name: u.name,
      tag: u.tag,
      phone: u.phone ?? '',
      city: u.city ?? '',
      playerId: u.playerId ?? '',
      role: u.role,
      blocked: blockedReason(u.role),
    }))

  return NextResponse.json({ users, ready: true })
}
