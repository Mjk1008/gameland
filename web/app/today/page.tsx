import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, whenReady } from '@/lib/store'
import { buildTodaySnapshot } from '@/lib/today-snapshot'
import TodayClient from './client'

export const dynamic = 'force-dynamic'

export default async function TodayPage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const u = uid ? getUserById(uid) : null
  if (!uid || !u) redirect('/login?callbackUrl=/today')

  await whenReady()
  const initial = buildTodaySnapshot(uid)

  return <TodayClient initial={initial} />
}
