import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { whenReady } from '@/lib/store'
import { isMatchCenterEnabled } from '@/lib/match-center-enabled'
import { buildCenterSnapshot } from '@/lib/match-center'
import CenterClient from './client'

export const dynamic = 'force-dynamic'

export default async function CenterPage() {
  await whenReady()
  if (!isMatchCenterEnabled()) return notFound()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const role = (session as any)?.role as string | undefined
  const snap = buildCenterSnapshot(uid, role)
  return <CenterClient initial={snap} />
}
