// Live Day Hub («امروز») — HTTP guard helpers. Mirrors lib/arena-http.ts.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { whenReady, getUserById } from './store'
import { isTodayHubEnabled } from './today-hub-enabled'

export function todayHubDisabledResponse() {
  return NextResponse.json({ error: 'این بخش فعلاً غیرفعاله' }, { status: 404 })
}

export async function withTodayUser(
  handler: (uid: string) => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  if (!isTodayHubEnabled()) return todayHubDisabledResponse()
  await whenReady()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  if (!uid || !getUserById(uid)) {
    return NextResponse.json({ error: 'لاگین کن' }, { status: 401 })
  }
  return handler(uid)
}
