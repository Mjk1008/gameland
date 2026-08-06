import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteGamenet, getGamenet } from '@/lib/store'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if ((session as any)?.role !== 'admin') return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })

  const { id } = await req.json().catch(() => ({}))
  if (!id || !getGamenet(id)) return NextResponse.json({ error: 'گیم‌نت پیدا نشد' }, { status: 404 })

  deleteGamenet(id)
  return NextResponse.json({ ok: true })
}
