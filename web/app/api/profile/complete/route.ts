import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, updateUser } from '@/lib/store'
import { DISC } from '@/lib/mock-data'

const VALID_DISCS = new Set(Object.keys(DISC))
const VALID_MSG = new Set(['whatsapp', 'telegram', 'both'])

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  const firstName = (b.firstName ?? '').trim()
  const lastName  = (b.lastName ?? '').trim()
  const province  = (b.province ?? '').trim()
  const city      = (b.city ?? '').trim()
  const phone     = (b.phone ?? '').trim()
  const tag       = (b.tag ?? '').trim()
  const messenger = VALID_MSG.has(b.messenger) ? b.messenger : 'whatsapp'
  const discs     = Array.isArray(b.discs) ? b.discs.filter((d: string) => VALID_DISCS.has(d)) : []
  const experienceYears = b.experienceYears != null && b.experienceYears !== '' ? Number(b.experienceYears) : undefined
  const teamName  = (b.teamName ?? '').trim() || undefined
  const playerId  = (b.playerId ?? '').trim().slice(0, 60) || undefined   // in-game / platform ID

  if (!firstName || !lastName || !province || !city || !phone || !tag || discs.length === 0) {
    return NextResponse.json({ error: 'همهٔ فیلدها به‌جز نام تیم الزامی است' }, { status: 400 })
  }

  try {
    const u = updateUser(uid, {
      firstName, lastName, province, city, phone, messenger,
      tag, discs, primaryDisc: discs[0], experienceYears, teamName, playerId,
    })
    return NextResponse.json({ ok: true, user: { id: u.id, tag: u.tag } })
  } catch (e: any) {
    const map: Record<string, string> = {
      TAG_TAKEN: 'این تگ قبلاً گرفته شده',
      USER_NOT_FOUND: 'کاربر پیدا نشد',
    }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
