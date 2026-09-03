import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, getRegistration, getUserById, hasReceipt, isTeamPartnerReg, getEventConfig } from '@/lib/store'
import { buyerTicketPricing, regPayableAmount, validatePromoCode } from '@/lib/promoter'
import PayView from './pay-view'

export const dynamic = 'force-dynamic'

export default async function PayPage({ params, searchParams }: { params: { id: string }; searchParams: { buy?: string; ref?: string; promo?: string; teamName?: string; partnerTag?: string } }) {
  const c = getEvent(params.id)
  if (!c) return notFound()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) redirect(`/login?callbackUrl=/competitions/${params.id}/pay`)
  const u = getUserById(uid)!
  const reg = getRegistration(uid, params.id)
  const live = reg && reg.status !== 'rejected' ? reg : null
  if (live && isTeamPartnerReg(live)) redirect(`/competitions/${params.id}/me`)

  const buy = Number(searchParams.buy)
  const committing = Number.isInteger(buy) && buy >= 1 && buy <= 6
  if (!live && !committing) redirect(`/competitions/${params.id}/register`)

  if (committing) {
    const freeUsed = Math.min(u.freeTickets ?? 0, buy)
    const ticketCount = buy - freeUsed
    let promoDiscount = live?.discountPercent ?? 0
    let promoLabel = searchParams.promo?.trim() || undefined
    if (promoLabel) {
      try { promoDiscount = validatePromoCode(promoLabel, uid, c.id).discountPercent }
      catch { promoLabel = undefined }
    }
    const pricing = buyerTicketPricing(c.id, promoDiscount)
    const isTeamEvent = getEventConfig(c.id).teamSize === 2
    const existingLabel = live ? regPayableAmount(live).codeLabel : undefined
    return (
      <PayView
        compId={c.id} title={c.title} attempts={(live?.attempts ?? 0) + buy}
        ticketCount={ticketCount} unitPrice={pricing.unitPrice} total={ticketCount * pricing.unitPrice}
        discountPercent={pricing.totalOffPercent} promoCode={promoLabel ?? existingLabel}
        alreadyPaid={live?.paidAttempts ?? 0} freeAttempts={freeUsed}
        status="pending" hasReceipt={false} disc={c.disc} city={u.city ?? ''}
        commit={{
          attempts: buy,
          ref: searchParams.ref?.trim() || undefined,
          promoCode: promoLabel,
          ...(isTeamEvent ? { teamName: searchParams.teamName?.trim() || undefined, partnerTag: searchParams.partnerTag?.trim() || undefined } : {}),
        }}
      />
    )
  }

  const pay = regPayableAmount(live!)
  return (
    <PayView
      compId={c.id} title={c.title} attempts={live!.attempts}
      ticketCount={pay.ticketCount} unitPrice={pay.unitPrice} total={pay.total}
      discountPercent={pay.totalOffPercent} promoCode={pay.codeLabel}
      alreadyPaid={live!.paidAttempts ?? 0} freeAttempts={live!.freeAttempts ?? 0}
      status={live!.status} hasReceipt={hasReceipt(live!.id)} disc={c.disc} city={u.city ?? ''}
    />
  )
}
