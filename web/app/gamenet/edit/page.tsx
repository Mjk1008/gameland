import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, gamenetsForOwner } from '@/lib/store'
import EditGamenetForm from './form'

export const dynamic = 'force-dynamic'

export default async function EditGamenetPage() {
  const session = await getServerSession(authOptions)
  if (!session || !(session as any).uid) redirect('/login?callbackUrl=/gamenet/edit')
  const uid = (session as any).uid as string
  if (!getUserById(uid)) redirect('/login')

  const mine = gamenetsForOwner(uid)
  if (mine.length === 0) redirect('/gamenets/new')

  return <EditGamenetForm g={mine[0]} />
}
