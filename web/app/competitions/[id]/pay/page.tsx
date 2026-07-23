import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getRegistration, getUserById, hasReceipt } from '@/lib/store'
import PayView from './pay-view'

export const dynamic = 'force-dynamic'

export default async function PayPage({ params }: { params: { id: string } }) {
  const c = getEvent(params.id)
  if (!c) return notFound()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) redirect(`/login?callbackUrl=/competitions/${params.id}/pay`)
  const reg = getRegistration(uid, params.id)
  if (!reg) redirect(`/competitions/${params.id}/register`)

  return <PayView compId={c.id} title={c.title} attempts={reg.attempts} freeAttempts={reg.freeAttempts ?? 0} status={reg.status} hasReceipt={hasReceipt(reg.id)} />
}
