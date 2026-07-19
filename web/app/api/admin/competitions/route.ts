import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCompetition } from '@/lib/store'

// Admin: create a parent competition (رویداد) that groups disciplines.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const title = (b.title ?? '').toString().trim()
  if (!title) return NextResponse.json({ error: 'عنوان مسابقه الزامیه' }, { status: 400 })

  const c = createCompetition({
    title,
    location: (b.location ?? '').toString().trim(),
    date: (b.date ?? '').toString().trim(),
  })
  return NextResponse.json({ ok: true, competition: c })
}
