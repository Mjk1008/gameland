import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import NewGamenetForm from './form'

export const dynamic = 'force-dynamic'

export default async function NewGamenetPage() {
  const session = await getServerSession(authOptions)
  if (!(session as any)?.uid) redirect('/login?callbackUrl=/gamenets/new')
  return <NewGamenetForm/>
}
