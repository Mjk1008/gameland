import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { whenReady, pushNotif, getUserById } from './store'
import { isArenaEnabled } from './arena-enabled'
import type { ArenaNotify } from './arena'

export function arenaDisabledResponse() {
  return NextResponse.json({ error: 'میدون فعلاً غیرفعاله' }, { status: 404 })
}

export async function withArenaUser(
  handler: (uid: string) => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  if (!isArenaEnabled()) return arenaDisabledResponse()
  await whenReady()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  if (!uid || !getUserById(uid)) {
    return NextResponse.json({ error: 'لاگین کن' }, { status: 401 })
  }
  return handler(uid)
}

export function sendArenaNotifs(notifs: ArenaNotify[]) {
  for (const n of notifs) pushNotif(n.userId, 'announcement', n.title, n.body)
}

export function userBrief(uid: string) {
  const u = getUserById(uid)
  if (!u) return null
  return { id: u.id, name: u.name, tag: u.tag, city: u.city }
}
