import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById } from '@/lib/store'
import NewRequestForm from './form'

export const dynamic = 'force-dynamic'

export default async function ArenaNewPage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const u = uid ? getUserById(uid) : null
  if (!uid || !u) redirect('/login?callbackUrl=/arena/new')
  const discs = u.discs?.length ? u.discs : u.primaryDisc ? [u.primaryDisc] : []
  if (!discs.length) redirect('/welcome?callbackUrl=/arena/new')

  return (
    <NewRequestForm discs={discs} defaultCity={u.city ?? ''} defaultProvince={u.province ?? ''} />
  )
}
