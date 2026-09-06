import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { removeAnnouncement } from '@/lib/stories'

function guard(session: any) {
  return session?.role === 'admin'
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!guard(session as any)) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  removeAnnouncement(params.id)
  return NextResponse.json({ ok: true })
}
