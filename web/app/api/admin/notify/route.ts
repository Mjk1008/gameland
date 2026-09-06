import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { allUsers, getUserById, pushNotif, matchesForComp } from '@/lib/store'

// Distinct player uids seated in one province bracket of one event — same
// (compId, groupKey, bracket) triple the bracket views and lib/bracket.ts
// key matches by (docs/37's live feed bracketLabel uses the same triple).
function bracketPlayerIds(compId: string, province: string, bracketIdx: number): Set<string> {
  const groupKey = `province:${province}`
  const ids = new Set<string>()
  for (const m of matchesForComp(compId)) {
    if (m.groupKey !== groupKey || m.bracket !== bracketIdx) continue
    if (m.p1UserId) ids.add(m.p1UserId)
    if (m.p2UserId) ids.add(m.p2UserId)
  }
  return ids
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const title = (b.title ?? '').toString().trim()
  const body  = (b.body  ?? '').toString().trim()
  // 'all' | 'gamers' | 'province:<name>' | 'disc:<id>' | 'bracket:<compId>:<province>:<idx>'
  // | 'players' (+ targetUids: string[]) — province/disc/bracket back the
  // Live Day Hub admin ops board's group-announce form.
  const audience = (b.audience ?? 'all').toString()
  if (!title || !body) return NextResponse.json({ error: 'عنوان و متن الزامی' }, { status: 400 })

  let targets: { id: string }[]
  if (audience === 'players') {
    const wanted = new Set((Array.isArray(b.targetUids) ? b.targetUids : []).map(String))
    if (wanted.size === 0) return NextResponse.json({ error: 'حداقل یک بازیکن رو انتخاب کن' }, { status: 400 })
    targets = allUsers().filter(u => wanted.has(u.id))
  } else if (audience.startsWith('bracket:')) {
    const [, compId, province, idxStr] = audience.split(':')
    const idx = Number(idxStr)
    if (!compId || !province || !Number.isFinite(idx)) return NextResponse.json({ error: 'براکت نامعتبر' }, { status: 400 })
    const ids = bracketPlayerIds(compId, province, idx)
    targets = allUsers().filter(u => ids.has(u.id))
  } else {
    targets = allUsers().filter(u => {
      if (audience === 'all') return true
      if (audience === 'gamers') return u.role === 'gamer'
      if (audience.startsWith('province:')) return u.province === audience.slice('province:'.length)
      if (audience.startsWith('disc:')) { const d = audience.slice('disc:'.length); return u.primaryDisc === d || !!u.discs?.includes(d as any) }
      return false
    })
  }
  for (const u of targets) pushNotif(u.id, 'announcement', title, body)
  return NextResponse.json({ ok: true, sent: targets.length })
}
