import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, updateUser } from '@/lib/store'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  const name = (b.name ?? '').trim()
  const tag  = (b.tag  ?? '').trim()
  const city = (b.city ?? '').trim()
  const disc = b.disc || null

  if (!name || !tag || !city || !disc) {
    return NextResponse.json({ error: 'همهٔ فیلدها الزامی است' }, { status: 400 })
  }

  try {
    const u = updateUser(uid, { name, tag, city, primaryDisc: disc })
    return NextResponse.json({ ok: true, user: { id: u.id, tag: u.tag } })
  } catch (e: any) {
    const map: Record<string, string> = {
      TAG_TAKEN: 'این تگ قبلاً گرفته شده',
      USER_NOT_FOUND: 'کاربر پیدا نشد',
    }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
