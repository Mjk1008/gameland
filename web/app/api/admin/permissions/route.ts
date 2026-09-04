import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { allUsers, getUserById, isSuperAdmin, setUserPermissions, whenReady, PERMISSIONS, type Permission, type User } from '@/lib/store'

// Only the super admin (role === 'admin') can see or change access levels —
// 'organizer' is already full staff access, not a grantor of scoped ones.
async function superAdminOnly() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid) return null
  const u = getUserById(uid)
  if (!u || !isSuperAdmin(u)) return null
  return u
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
  return !!u.deletedAt
}

function matchesQuery(u: User, raw: string, lower: string, key: string): boolean {
  const ascii = toAsciiDigits(raw).trim().toLowerCase()
  const tagQ = ascii.replace(/^@/, '')
  if (u.tag.toLowerCase().includes(tagQ) || u.tag.toLowerCase().includes(lower.replace(/^@/, ''))) return true
  if (u.name.toLowerCase().includes(lower) || u.name.toLowerCase().includes(ascii)) return true
  if (key.length >= 3) {
    const stored = phoneKey(u.phone ?? '')
    if (stored && (stored.includes(key) || key.includes(stored))) return true
  }
  return false
}

function toRow(u: User) {
  return { id: u.id, name: u.name, tag: u.tag, phone: u.phone ?? '', role: u.role, permissions: u.permissions ?? [] }
}

// GET ?q=… → search a user to grant/revoke. No q → list everyone who
// currently holds any scoped permission, so the super admin can see/revoke
// at a glance without knowing who they are.
export async function GET(req: Request) {
  await whenReady()
  if (!await superAdminOnly()) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const raw = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (!raw) {
    const granted = allUsers().filter(u => !isDeleted(u) && (u.permissions?.length ?? 0) > 0).map(toRow)
    return NextResponse.json({ users: granted, granted: true })
  }

  const key = phoneKey(raw)
  const ascii = toAsciiDigits(raw).trim()
  const ready = key.length >= 3 || ascii.length >= 2
  if (!ready) return NextResponse.json({ users: [], ready: false })

  const lower = ascii.toLowerCase()
  const users = allUsers()
    .filter(u => !isDeleted(u) && u.role === 'gamer')
    .filter(u => matchesQuery(u, raw, lower, key))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 12)
    .map(toRow)

  return NextResponse.json({ users, ready: true })
}

export async function POST(req: Request) {
  await whenReady()
  if (!await superAdminOnly()) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const { userId, permission, grant } = b as { userId?: string; permission?: Permission; grant?: boolean }
  if (!userId || !permission || typeof grant !== 'boolean') {
    return NextResponse.json({ error: 'پارامتر نامعتبر' }, { status: 400 })
  }
  if (!PERMISSIONS.some(p => p.key === permission)) {
    return NextResponse.json({ error: 'سطح دسترسی نامعتبر' }, { status: 400 })
  }
  const target = getUserById(userId)
  if (!target) return NextResponse.json({ error: 'کاربر پیدا نشد' }, { status: 404 })
  // Granting is only for plain gamer accounts — staff already has full
  // access. Revoking stays allowed regardless (clears a stale grant if a
  // role changed after the fact).
  if (grant && target.role !== 'gamer') {
    return NextResponse.json({ error: 'این حساب از قبل دسترسی کادر دارد' }, { status: 400 })
  }

  const current = new Set(target.permissions ?? [])
  if (grant) current.add(permission)
  else current.delete(permission)
  const u = setUserPermissions(userId, Array.from(current) as Permission[])

  return NextResponse.json({ ok: true, user: u ? toRow(u) : undefined })
}
