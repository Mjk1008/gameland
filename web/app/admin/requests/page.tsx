import { pendingRegistrations, getUserById, getEvent, hasReceipt } from '@/lib/store'
import { regAdminReview } from '@/lib/promoter'
import RequestList from './request-list'

export const dynamic = 'force-dynamic'

export default function RequestsAdmin() {
  const rows = pendingRegistrations().map(r => {
    const u = getUserById(r.userId)
    const c = getEvent(r.compId)
    const review = regAdminReview(r)
    return {
      regId: r.id, attempts: r.attempts, freeAttempts: r.freeAttempts ?? 0, paidAttempts: r.paidAttempts ?? 0,
      referrerTag: u?.referredBy ? getUserById(u.referredBy)?.tag : undefined,
      promoCode: review.codeLabel, discountPercent: review.discountPercent,
      promoterName: review.promoterName, promoterTag: review.promoterTag,
      name: u?.name ?? '?', tag: u?.tag ?? '?', phone: u?.phone ?? '', city: u?.city ?? '',
      event: c?.title ?? r.compId, hasReceipt: hasReceipt(r.id),
      unitPrice: review.unitPrice, fullUnitPrice: review.fullUnitPrice,
      expectedTotal: review.expectedTotal, revenueTotal: review.revenueTotal,
      slots: review.slots,
    }
  })
  return <RequestList rows={rows} />
}
