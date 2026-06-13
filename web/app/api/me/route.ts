import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, updateUser } from '@/lib/store'

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const patch: any = {}
  if (typeof body.name === 'string')        patch.name = body.name.trim()
  if (typeof body.tag === 'string')         patch.tag = body.tag.trim()
  if (typeof body.city === 'string')        patch.city = body.city.trim()
  if (typeof body.primaryDisc === 'string') patch.primaryDisc = body.primaryDisc
  if (typeof body.nationalId === 'string')  patch.nationalId = body.nationalId.trim() || undefined

  try {
    const u = updateUser(uid, patch)
    return NextResponse.json({ ok: true, user: u })
  } catch (e: any) {
    const map: Record<string, string> = {
      TAG_TAKEN: 'این تگ قبلاً گرفته شده',
      NATIONAL_ID_TAKEN: 'این کد ملی قبلاً ثبت شده',
    }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
