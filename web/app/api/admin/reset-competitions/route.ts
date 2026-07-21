import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resetCompetitionData, whenReady } from '@/lib/store'

// Fresh start before go-live: wipe all competitions/events/registrations/
// matches/placements. Keeps users, avatars, disciplines and promo slides.
export async function POST() {
  await whenReady()
  const session = await getServerSession(authOptions)
  if ((session as any)?.role !== 'admin') return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  const n = resetCompetitionData()
  return NextResponse.json({ ok: true, ...n })
}
