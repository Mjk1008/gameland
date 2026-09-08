import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, hasPermission } from '@/lib/store'
import { buildAdminToday } from '@/lib/today-snapshot'

// Read-only board snapshot. Staff, plus a scoped 'result_entry' grant: the
// admin shell lets that account into /admin/today (app/admin/layout.tsx) so it
// can see which matches are live — but this endpoint stayed staff-only, so the
// 5s poll behind the board answered 403 and usePolling silently kept the very
// first render forever. Every WRITE on this board (call/announce/story) is a
// separate route and stays staff-only.
export async function GET() {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  const uid = (session as any)?.uid as string | undefined
  const staff = role === 'admin' || role === 'organizer'
  const recordOnly = !staff && hasPermission(uid ? getUserById(uid) : undefined, 'result_entry')
  if (!staff && !recordOnly) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  return NextResponse.json(buildAdminToday())
}
