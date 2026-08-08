import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getRegistration, getUserById, hasReceipt, unpaidAttempts } from '@/lib/store'
import { ticketPriceFor } from '@/lib/ticket-price'
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
  const u = getUserById(uid)!

  return <PayView compId={c.id} title={c.title} attempts={reg.attempts} payable={unpaidAttempts(reg)} alreadyPaid={reg.paidAttempts ?? 0} freeAttempts={reg.freeAttempts ?? 0} status={reg.status} hasReceipt={hasReceipt(reg.id)} price={ticketPriceFor(c.id).price} disc={c.disc} city={u.city ?? ''} />
}
