import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, aiQuota } from '@/lib/store'
import AssistantChat from './chat'

export const dynamic = 'force-dynamic'

// «دستیار گیم‌لند» — full-screen chat. Login required (answers are grounded
// in the signed-in user's own account data).
export default async function AssistantPage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const u = uid ? getUserById(uid) : null
  if (!uid || !u) redirect('/login?callbackUrl=/assistant')

  const q = aiQuota(uid)
  return <AssistantChat firstName={(u.name || u.tag).split(' ')[0]} quotaUsed={q.used} quotaLimit={q.limit} />
}
