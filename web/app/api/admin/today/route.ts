import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildAdminToday } from '@/lib/today-snapshot'

function guard(session: any) {
  const role = session?.role
  return role === 'admin' || role === 'organizer'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!guard(session as any)) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  return NextResponse.json(buildAdminToday())
}
