import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createDiscipline } from '@/lib/store'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if ((session as any)?.role !== 'admin') return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  if (!b.id || !b.name || !b.short || !b.color) return NextResponse.json({ error: 'فیلدها ناقص' }, { status: 400 })
  try {
    const d = createDiscipline({ id: b.id, name: b.name, short: b.short, color: b.color, active: !!b.active })
    return NextResponse.json({ ok: true, discipline: d })
  } catch (e: any) {
    return NextResponse.json({ error: e.message === 'DISCIPLINE_EXISTS' ? 'این id قبلاً ثبت شده' : e.message }, { status: 400 })
  }
}
