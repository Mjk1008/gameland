import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getRegistration, getUserById, hasReceipt, isTeamPartnerReg } from '@/lib/store'
import { regPayableAmount } from '@/lib/promoter'
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
  // A 2v2 partner owes nothing — the captain paid for the whole team. Nothing
  // to do on the payment screen; send them to their status page.
  if (isTeamPartnerReg(reg)) redirect(`/competitions/${params.id}/me`)
  const u = getUserById(uid)!
  const pay = regPayableAmount(reg)

  return (
    <PayView
      compId={c.id} title={c.title} attempts={reg.attempts}
      ticketCount={pay.ticketCount} unitPrice={pay.unitPrice} total={pay.total}
      discountPercent={pay.totalOffPercent} promoCode={pay.codeLabel}
      alreadyPaid={reg.paidAttempts ?? 0} freeAttempts={reg.freeAttempts ?? 0}
      status={reg.status} hasReceipt={hasReceipt(reg.id)} disc={c.disc} city={u.city ?? ''}
    />
  )
}
