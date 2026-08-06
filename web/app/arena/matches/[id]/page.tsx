import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPlayMatch } from '@/lib/arena'
import { whenReady } from '@/lib/store'
import MatchFlowClient from './client'

export const dynamic = 'force-dynamic'

export default async function MatchPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  if (!uid) redirect(`/login?callbackUrl=/arena/matches/${params.id}`)

  await whenReady()
  const m = getPlayMatch(params.id)
  if (!m) notFound()
  if (uid !== m.requesterId && uid !== m.acceptorId) notFound()

  return <MatchFlowClient matchId={params.id} myId={uid} />
}
