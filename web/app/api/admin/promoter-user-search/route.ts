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

function matchesQuery(u: User, raw: string, lower: string, digits: string): boolean {
  if (u.tag.toLowerCase().includes(lower)) return true
  if (u.name.toLowerCase().includes(lower)) return true
  if (u.city?.includes(raw)) return true
  if (u.id.toLowerCase().includes(lower)) return true
  if (u.playerId && u.playerId.toLowerCase().includes(lower)) return true
  if (digits.length >= 3) {
    const phone = (u.phone ?? '').replace(/\D/g, '')
    if (phone.includes(digits)) return true
  }
  return false
}

function queryReady(raw: string): boolean {
  const trimmed = raw.trim()
  if (trimmed.length < 2) return false
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length > 0 && digits.length === trimmed.length) return digits.length >= 3
  return true
}

export async function GET(req: Request) {
  await whenReady()
  if (!await adminOnly()) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const raw = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (!queryReady(raw)) {
    return NextResponse.json({ users: [], ready: false })
  }

  const lower = raw.toLowerCase()
  const digits = raw.replace(/\D/g, '')

  const users = allUsers()
    .filter(u => u.role === 'gamer' && !u.deletedAt)
    .filter(u => matchesQuery(u, raw, lower, digits))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 12)
    .map(u => ({
      id: u.id,
      name: u.name,
      tag: u.tag,
      phone: u.phone ?? '',
      city: u.city ?? '',
      playerId: u.playerId ?? '',
    }))

  return NextResponse.json({ users, ready: true })
}
