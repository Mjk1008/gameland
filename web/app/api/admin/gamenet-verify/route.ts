import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { verifyGamenet } from '@/lib/store'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if ((session as any)?.role !== 'admin') return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  const { id, verified } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id الزامی' }, { status: 400 })
  verifyGamenet(id, !!verified)
  return NextResponse.json({ ok: true })
}
