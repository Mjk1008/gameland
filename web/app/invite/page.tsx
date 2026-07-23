import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, approvedReferralCount, referralLeaderboard, allUsers, hasAvatar } from '@/lib/store'
import InviteClient from './client'

export const dynamic = 'force-dynamic'

// «دعوت من» — the referral campaign hub. Code = the user's own @tag.
export default async function InvitePage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const u = uid ? getUserById(uid) : null
  if (!uid || !u) redirect('/login?callbackUrl=/invite')

  const count = approvedReferralCount(uid)
  const invitedTotal = allUsers().filter(x => x.referredBy === uid).length
  const board = referralLeaderboard(10).map(r => ({ ...r, hasPhoto: hasAvatar(r.uid), isMe: r.uid === uid }))

  return (
    <InviteClient
      tag={u.tag}
      approved={count}
      invited={invitedTotal}
      freeTickets={u.freeTickets ?? 0}
      milestone={u.referralMilestone ?? 0}
      board={board}
    />
  )
}
