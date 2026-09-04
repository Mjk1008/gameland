import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMatch, getUserById, hasPermission, playerName, pushNotif } from '@/lib/store'

const KINDS = {
  elim5: 'حذف تا پنج دقیقه آینده',
  play: 'اعلان بازی',
  cancel: 'اعلان لغو بازی',
} as const

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const meUid = (session as any)?.uid
  const role = (session as any)?.role
  const staff = role === 'admin' || role === 'organizer'
  const resultOnly = !staff && hasPermission(meUid ? getUserById(meUid) : undefined, 'result_entry')
  if (!staff && !resultOnly) return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { matchId, kind, who } = await req.json().catch(() => ({}))
  const title = KINDS[kind as keyof typeof KINDS]
  if (!matchId || !title) return NextResponse.json({ error: 'ورودی نامعتبر' }, { status: 400 })
  const m = getMatch(matchId)
  if (!m) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })

  const ids: string[] = []
  if (who === 'p1' && m.p1UserId) ids.push(m.p1UserId)
  else if (who === 'p2' && m.p2UserId) ids.push(m.p2UserId)
  else if (who === 'both') {
    if (m.p1UserId) ids.push(m.p1UserId)
    if (m.p2UserId && m.p2UserId !== m.p1UserId) ids.push(m.p2UserId)
  }
  if (ids.length === 0) return NextResponse.json({ error: 'بازیکن نیست' }, { status: 400 })

  for (const uid of ids) {
    if (uid !== m.p1UserId && uid !== m.p2UserId) continue
    pushNotif(uid, 'announcement', title, title)
  }
  return NextResponse.json({ ok: true, n: ids.length, names: ids.map(id => { const u = getUserById(id); return u ? playerName(u) : id }) })
}
