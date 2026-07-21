// Support uses the SAME channels as the payment-receipt flow (single source of
// truth in payment.ts), so "support" and "send your receipt" reach the same place.
import { PAYMENT, paymentLinks } from './payment'

export const SUPPORT = { hours: process.env.SUPPORT_HOURS || 'هر روز ۱۰ تا ۲۲' }

export type SupportChannel = { key: string; label: string; value: string; href: string }

export function supportChannels(): SupportChannel[] {
  const l = paymentLinks()
  const out: SupportChannel[] = []
  if (PAYMENT.channels.whatsapp)  out.push({ key: 'whatsapp',  label: 'واتساپ',    value: PAYMENT.channels.whatsapp, href: l.whatsapp })
  if (PAYMENT.channels.bale)      out.push({ key: 'bale',      label: 'بله',       value: PAYMENT.channels.bale, href: l.bale })
  if (PAYMENT.channels.instagram) out.push({ key: 'instagram', label: 'اینستاگرام', value: '@' + PAYMENT.channels.instagram, href: l.instagram })
  return out
}
