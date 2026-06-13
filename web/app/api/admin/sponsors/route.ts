import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createSponsor } from '@/lib/store'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if ((session as any)?.role !== 'admin') return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  if (!b.id || !b.name) return NextResponse.json({ error: 'id و name الزامی' }, { status: 400 })
  try {
    const s = createSponsor({ id: b.id, name: b.name, website: b.website || undefined, logoUrl: b.logoUrl || undefined })
    return NextResponse.json({ ok: true, sponsor: s })
  } catch (e: any) {
    return NextResponse.json({ error: e.message === 'SPONSOR_EXISTS' ? 'این id قبلاً ثبت شده' : e.message }, { status: 400 })
  }
}
