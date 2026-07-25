import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { setSetting, AI_KNOWLEDGE_KEY } from '@/lib/store'

// Admin-authored facts injected into every assistant answer (venue, schedule,
// prize details, anything the data model doesn't hold).
export async function POST(req: Request) {
  const role = (await getServerSession(authOptions) as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  setSetting(AI_KNOWLEDGE_KEY, (b.text ?? '').toString().slice(0, 3000))
  return NextResponse.json({ ok: true })
}
