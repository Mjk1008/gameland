import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, whenReady } from '@/lib/store'
import { getPlayRequest, matchForRequest } from '@/lib/arena'
import RequestDetailClient from './client'

export const dynamic = 'force-dynamic'

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  if (!uid) redirect(`/login?callbackUrl=/arena/requests/${params.id}`)

  await whenReady()
  const r = getPlayRequest(params.id)
  if (!r) notFound()
  const u = getUserById(r.userId)
  const match = matchForRequest(r.id)

  return (
    <RequestDetailClient
      requestId={r.id}
      requesterId={r.userId}
      myId={uid}
      disc={r.disc}
      bestOf={r.bestOf}
      city={r.city}
      province={r.province}
      note={r.note}
      requesterTag={u?.tag ?? '؟'}
      requesterName={u?.name ?? ''}
      status={r.status}
      createdAt={r.createdAt}
      matchId={match?.id}
    />
  )
}
