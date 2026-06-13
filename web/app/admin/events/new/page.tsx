import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import NewEventForm from './form'

export const dynamic = 'force-dynamic'

export default async function NewEventPage() {
  const session = await getServerSession(authOptions)
  if (!(session as any)?.uid) redirect('/login?callbackUrl=/admin/events/new')
  return <NewEventForm/>
}
