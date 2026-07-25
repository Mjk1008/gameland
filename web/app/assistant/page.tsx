import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, aiDayStart, AI_DAILY_LIMIT } from '@/lib/store'
import { persist } from '@/lib/db/persistence'
import AssistantChat from './chat'

export const dynamic = 'force-dynamic'

// «دستیار گیم‌لند» — full-screen chat. Login required (answers are grounded
// in the signed-in user's own account data).
export default async function AssistantPage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const u = uid ? getUserById(uid) : null
  if (!uid || !u) redirect('/login?callbackUrl=/assistant')

  const used = await persist.ai.usedSince(uid, aiDayStart())
  return <AssistantChat firstName={(u.name || u.tag).split(' ')[0]} quotaUsed={used} quotaLimit={AI_DAILY_LIMIT} />
}
