import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById } from '@/lib/store'
import EditForm from './form'

export default async function MeEditPage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const u = uid ? getUserById(uid) : null
  if (!u) redirect('/login?callbackUrl=/me/edit')

  return <EditForm user={{ name: u.name, tag: u.tag, city: u.city, primaryDisc: u.primaryDisc ?? '', nationalId: u.nationalId ?? '' }} />
}
