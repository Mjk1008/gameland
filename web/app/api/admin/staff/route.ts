import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  allUsers, getUserById, whenReady, isAdminPhone, setUserRoleAsync,
  type Role, type User,
} from '@/lib/store'

type SessionGate = { uid: string; role: Role }

async function gate(): Promise<SessionGate | null> {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const role = (session as any)?.role as Role | undefined
  if (!uid || !getUserById(uid)) return null
  if (role !== 'admin' && role !== 'organizer') return null
  return { uid, role }
}

function staffPayload(u: User) {
  return {
    id: u.id,
    name: u.name,
    tag: u.tag,
    phone: u.phone ?? '',
    city: u.city ?? '',
    role: u.role,
    locked: !!(u.phone && isAdminPhone(u.phone)),
  }
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

function liveUsers(): User[] {
  return allUsers().filter(u => !u.deletedAt)
}

function staffList() {
  return liveUsers()
    .filter(u => u.role === 'admin' || u.role === 'organizer')
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'admin' ? -1 : 1
      return b.createdAt - a.createdAt
    })
    .map(staffPayload)
}

export async function GET(req: Request) {
  await whenReady()
  const g = await gate()
  if (!g) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const raw = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (!raw) return NextResponse.json({ staff: staffList() })

  if (g.role !== 'admin') return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  if (!queryReady(raw)) return NextResponse.json({ staff: staffList(), users: [], ready: false })

  const lower = raw.toLowerCase()
  const digits = raw.replace(/\D/g, '')
  const users = liveUsers()
    .filter(u => u.role === 'gamer')
    .filter(u => matchesQuery(u, raw, lower, digits))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 12)
    .map(u => ({
      id: u.id,
      name: u.name,
      tag: u.tag,
      phone: u.phone ?? '',
      city: u.city ?? '',
    }))

  return NextResponse.json({ staff: staffList(), users, ready: true })
}

export async function POST(req: Request) {
  await whenReady()
  const g = await gate()
  if (!g || g.role !== 'admin') return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  const role = body.role as Role
  if (!userId || (role !== 'admin' && role !== 'gamer')) {
    return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 400 })
  }

  const target = getUserById(userId)
  if (!target || target.deletedAt) return NextResponse.json({ error: 'کاربر پیدا نشد' }, { status: 404 })
  if (target.id === g.uid) return NextResponse.json({ error: 'نقش خودت رو نمی‌تونی عوض کنی' }, { status: 400 })

  if (role === 'admin') {
    if (target.role === 'admin') return NextResponse.json({ ok: true, staff: staffList() })
  } else {
    if (target.role !== 'admin') {
      return NextResponse.json({ error: 'فقط ادمین رو می‌شه به گیمر برگردوند' }, { status: 400 })
    }
    if (target.phone && isAdminPhone(target.phone)) {
      return NextResponse.json({ error: 'این شماره توی لیست ادمین سروره — از اون‌جا بردار' }, { status: 400 })
    }
    const adminCount = liveUsers().filter(u => u.role === 'admin').length
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'آخرین ادمین رو نمی‌شه برداشت' }, { status: 400 })
    }
  }

  try {
    await setUserRoleAsync(target.id, role)
  } catch (e) {
    console.error('[staff] setRole failed:', e)
    return NextResponse.json({ error: 'ذخیره نشد' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, staff: staffList() })
}
