import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, whenReady } from '@/lib/store'
import { isArenaEnabled } from '@/lib/arena-enabled'
import { countOpenRequestsInCity } from '@/lib/arena'
import ArenaFeed from './arena-feed'

export const dynamic = 'force-dynamic'

export default async function ArenaPage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const u = uid ? getUserById(uid) : null
  if (!uid || !u) redirect('/login?callbackUrl=/arena')

  await whenReady()
  const cityOpenCount = countOpenRequestsInCity(u.city ?? '', u.province ?? '')

  return (
    <Suspense fallback={null}>
      <ArenaFeed
        myId={uid}
        defaultCity={u.city ?? ''}
        defaultProvince={u.province ?? ''}
        discs={u.discs ?? (u.primaryDisc ? [u.primaryDisc] : [])}
        enabled={isArenaEnabled()}
        myCityOpenCount={cityOpenCount}
      />
    </Suspense>
  )
}
