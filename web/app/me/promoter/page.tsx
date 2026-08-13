import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById } from '@/lib/store'
import { isPromoter, promoterDashboard } from '@/lib/promoter'
import PromoterDashboard from './dashboard'

export const dynamic = 'force-dynamic'

export default async function PromoterPage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid) redirect('/login?callbackUrl=/me/promoter')
  if (!isPromoter(uid)) notFound()

  const data = promoterDashboard(uid)
  if (!data) notFound()

  return <PromoterDashboard data={data} />
}
