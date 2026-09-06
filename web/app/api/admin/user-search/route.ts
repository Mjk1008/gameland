import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { allUsers, getUserById } from '@/lib/store'

const LIMIT = 8

// Backs the group-announce form's player picker — a plain <select> with
// every user would be unusable at real scale, so this returns a short,
// server-side-filtered list instead of shipping the whole roster to the client.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().toLowerCase()
  if (q.length < 2) return NextResponse.json({ users: [] })

  const rows = allUsers()
    .filter(u => u.name?.toLowerCase().includes(q) || u.tag?.toLowerCase().includes(q) || u.phone?.includes(q))
    .slice(0, LIMIT)
    .map(u => ({ id: u.id, name: u.name, tag: u.tag, city: u.city }))
  return NextResponse.json({ users: rows })
}
