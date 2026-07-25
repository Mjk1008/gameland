import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCompetition, updateCompetition, deleteCompetition, eventsForCompetition } from '@/lib/store'

// Admin: manage parent competitions (رویداد) that group disciplines.
// action: create (default) | edit | delete
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const action = (b.action ?? 'create').toString()
  const id = (b.id ?? '').toString()

  try {
    if (action === 'delete') {
      // Deleting a competition cascades to its disciplines (and their
      // registrations/matches) — refuse while children still exist.
      const kids = eventsForCompetition(id)
      if (kids.length > 0) {
        return NextResponse.json({ error: `اول ${kids.length} رشتهٔ زیرمجموعه رو حذف کن` }, { status: 409 })
      }
      deleteCompetition(id)
      return NextResponse.json({ ok: true })
    }

    if (action === 'edit') {
      const patch: any = {}
      if (b.title !== undefined) {
        const t = b.title.toString().trim()
        if (!t) return NextResponse.json({ error: 'عنوان نمی‌تونه خالی باشه' }, { status: 400 })
        patch.title = t
      }
      if (b.location !== undefined) patch.location = b.location.toString().trim()
      if (b.date !== undefined) patch.date = b.date.toString().trim()
      return NextResponse.json({ ok: true, competition: updateCompetition(id, patch) })
    }

    const title = (b.title ?? '').toString().trim()
    if (!title) return NextResponse.json({ error: 'عنوان مسابقه الزامیه' }, { status: 400 })
    const c = createCompetition({
      title,
      location: (b.location ?? '').toString().trim(),
      date: (b.date ?? '').toString().trim(),
    })
    return NextResponse.json({ ok: true, competition: c })
  } catch (e: any) {
    return NextResponse.json({ error: e.message === 'COMPETITION_NOT_FOUND' ? 'رویداد پیدا نشد' : 'انجام نشد' }, { status: 400 })
  }
}
