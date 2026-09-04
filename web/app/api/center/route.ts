import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { whenReady } from '@/lib/store'
import { isMatchCenterEnabled } from '@/lib/match-center-enabled'
import { buildCenterSnapshot } from '@/lib/match-center'

export const dynamic = 'force-dynamic'

export async function GET() {
  await whenReady()
  if (!isMatchCenterEnabled()) return NextResponse.json({ error: 'off' }, { status: 404 })
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const role = (session as any)?.role as string | undefined
  return NextResponse.json(buildCenterSnapshot(uid, role))
}
