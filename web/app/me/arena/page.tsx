import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isArenaEnabled } from '@/lib/arena-enabled'
import MyArenaClient from './client'

export const dynamic = 'force-dynamic'

export default async function MyArenaPage() {
  const session = await getServerSession(authOptions)
  if (!(session as any)?.uid) redirect('/login?callbackUrl=/me/arena')
  if (!isArenaEnabled()) redirect('/me')
  return <MyArenaClient />
}
