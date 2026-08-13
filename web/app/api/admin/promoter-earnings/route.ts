import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, whenReady } from '@/lib/store'
import { markEarningPaid } from '@/lib/promoter'

export async function POST(req: Request) {
  await whenReady()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { earningId, note } = await req.json().catch(() => ({}))
  if (!earningId) return NextResponse.json({ error: 'شناسه نامعتبر' }, { status: 400 })

  try {
    markEarningPaid(String(earningId), note)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'رکورد پیدا نشد' }, { status: 404 })
  }
}
