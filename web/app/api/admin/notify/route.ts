import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { allUsers, getUserById, pushNotif } from '@/lib/store'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const title = (b.title ?? '').toString().trim()
  const body  = (b.body  ?? '').toString().trim()
  // 'all' | 'gamers' | 'province:<name>' | 'disc:<id>' — the province/disc
  // forms back the Live Day Hub admin ops board's group-announce form.
  const audience = (b.audience ?? 'all').toString()
  if (!title || !body) return NextResponse.json({ error: 'عنوان و متن الزامی' }, { status: 400 })

  const targets = allUsers().filter(u => {
    if (audience === 'all') return true
    if (audience === 'gamers') return u.role === 'gamer'
    if (audience.startsWith('province:')) return u.province === audience.slice('province:'.length)
    if (audience.startsWith('disc:')) { const d = audience.slice('disc:'.length); return u.primaryDisc === d || !!u.discs?.includes(d as any) }
    return false
  })
  for (const u of targets) pushNotif(u.id, 'announcement', title, body)
  return NextResponse.json({ ok: true, sent: targets.length })
}
