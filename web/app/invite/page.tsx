import { redirect } from 'next/navigation'

// «دعوت من» — the referral campaign is closed, no new invites or free سهم.
// Existing freeTickets/referredBy/referralMilestone are untouched and still
// apply automatically at registration; this hub just isn't a destination anymore.
export const dynamic = 'force-dynamic'

export default function InvitePage() {
  redirect('/me')
}
