import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { purgeTestData } from '@/lib/store'

// Admin-only maintenance: remove all fake test participants (@gameland.test)
// and clear every bracket match. Real accounts + competitions stay.
export async function POST() {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })
  const r = purgeTestData()
  return NextResponse.json({ ok: true, ...r })
}
