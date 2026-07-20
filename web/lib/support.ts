// Support contact channels shown on /support. Fill these with the real team
// handles (or set the matching env vars). Empty channels are hidden on the page.
export const SUPPORT = {
  telegram:  process.env.SUPPORT_TELEGRAM  || '',   // username without @, e.g. 'gamelandsupport'
  whatsapp:  process.env.SUPPORT_WHATSAPP  || '',   // intl digits, e.g. '989120000000'
  instagram: process.env.SUPPORT_INSTAGRAM || '',   // username without @
  email:     process.env.SUPPORT_EMAIL     || '',
  phone:     process.env.SUPPORT_PHONE     || '',   // e.g. '09120000000'
  hours:     process.env.SUPPORT_HOURS     || 'هر روز ۱۰ تا ۲۲',
}

export type SupportChannel = { key: string; label: string; value: string; href: string }

export function supportChannels(): SupportChannel[] {
  const out: SupportChannel[] = []
  if (SUPPORT.telegram)  out.push({ key: 'telegram',  label: 'تلگرام',    value: '@' + SUPPORT.telegram, href: `https://t.me/${SUPPORT.telegram}` })
  if (SUPPORT.whatsapp)  out.push({ key: 'whatsapp',  label: 'واتساپ',    value: 'پیام مستقیم', href: `https://wa.me/${SUPPORT.whatsapp}` })
  if (SUPPORT.instagram) out.push({ key: 'instagram', label: 'اینستاگرام', value: '@' + SUPPORT.instagram, href: `https://instagram.com/${SUPPORT.instagram}` })
  if (SUPPORT.phone)     out.push({ key: 'phone',     label: 'تماس تلفنی', value: SUPPORT.phone, href: `tel:${SUPPORT.phone}` })
  if (SUPPORT.email)     out.push({ key: 'email',     label: 'ایمیل',      value: SUPPORT.email, href: `mailto:${SUPPORT.email}` })
  return out
}
