import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { activeAnnouncements, createAnnouncement } from '@/lib/stories'

function guard(session: any) {
  return session?.role === 'admin'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!guard(session as any)) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  return NextResponse.json({ announcements: activeAnnouncements() })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!guard(session as any)) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  const uid = (session as any)?.uid as string | undefined
  if (!uid) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const text = (b.text ?? '').toString().trim().slice(0, 500)
  if (!text) return NextResponse.json({ error: 'متنِ اعلان رو بنویس' }, { status: 400 })

  const a = createAnnouncement(text, uid)
  return NextResponse.json({ ok: true, announcement: a })
}
