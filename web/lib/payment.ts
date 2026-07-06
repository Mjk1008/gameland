// Ticket pricing (Tomans). Launch discount → strike-through original for FOMO.
export const TICKET = {
  price: 500_000,     // فعلی (با تخفیف)
  original: 798_000,  // قیمت اصلی
}
export const ticketOffPercent = Math.round((1 - TICKET.price / TICKET.original) * 100)
export const toman = (n: number) => n.toLocaleString('en-US')

// Manual card-to-card payment + receipt channels (MVP — no coins/gateway).
// User pays to this card, sends the receipt to one of the channels, admin approves.
export const PAYMENT = {
  card: '6219861840268659',
  cardName: 'آرین کردی',
  bank: 'بلو بانک سامان',
  channels: {
    whatsapp: '09358653937',
    bale:     '09358653937',
    instagram:'gamelandteam',
  },
}

// Deep links for the "send receipt" buttons.
export function paymentLinks() {
  const wa = '98' + PAYMENT.channels.whatsapp.replace(/^0/, '')
  const msg = encodeURIComponent('سلام، رسید پرداخت ثبت‌نام مسابقه گیم‌لند رو فرستادم.')
  return {
    whatsapp:  `https://wa.me/${wa}?text=${msg}`,
    bale:      `https://ble.ir/gamelandteam`,
    instagram: `https://instagram.com/${PAYMENT.channels.instagram}`,
  }
}
