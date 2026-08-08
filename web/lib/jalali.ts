// Self-contained Jalali (Persian/Shamsi) ↔ Gregorian conversion — no deps.
// Algorithm: jalaali-js (MIT). Used by the admin date-range picker so we never
// pull an external calendar lib (Iran/CDN/build risk).

// NOTE: jalaali-js truncates toward zero (~~), NOT floor — differs for the
// negative operands in g2d (e.g. div(gm-8,6)), so Math.trunc is required.
function div(a: number, b: number) { return Math.trunc(a / b) }
function mod(a: number, b: number) { return a - Math.trunc(a / b) * b }

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178]
  const bl = breaks.length
  const gy = jy + 621
  let leapJ = -14, jp = breaks[0], jm = 0, jump = 0, i
  for (i = 1; i < bl; i += 1) {
    jm = breaks[i]; jump = jm - jp
    if (jy < jm) break
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4)
    jp = jm
  }
  let n = jy - jp
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  const march = 20 + leapJ - leapG
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  let leap = mod(mod(n + 1, 33) - 1, 4)
  if (leap === -1) leap = 4
  return { leap, gy, march }
}

function g2d(gy: number, gm: number, gd: number) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
  return d
}
function d2g(jdn: number) {
  let j = 4 * jdn + 139361631
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div(mod(j, 1461), 4) * 5 + 308
  const gd = div(mod(i, 153), 5) + 1
  const gm = mod(div(i, 153), 12) + 1
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6)
  return { gy, gm, gd }
}
function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy)
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
}
function d2j(jdn: number) {
  const gy = d2g(jdn).gy, jy0 = gy - 621, r = jalCal(jy0)
  const jdn1f = g2d(gy, 3, r.march)
  let jy = jy0, jm, jd, k = jdn - jdn1f
  if (k >= 0) {
    if (k <= 185) { jm = 1 + div(k, 31); jd = mod(k, 31) + 1; return { jy, jm, jd } }
    else k -= 186
  } else { jy -= 1; k += 179; if (r.leap === 1) k += 1 }
  jm = 7 + div(k, 30); jd = mod(k, 30) + 1
  return { jy, jm, jd }
}

export type Jalali = { jy: number; jm: number; jd: number }

export function toJalali(gy: number, gm: number, gd: number): Jalali { return d2j(g2d(gy, gm, gd)) }
export function toGregorian(jy: number, jm: number, jd: number) { return d2g(j2d(jy, jm, jd)) }
export function isLeapJalali(jy: number) { return jalCal(jy).leap === 0 }
export function jalaliMonthLength(jy: number, jm: number) {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  return isLeapJalali(jy) ? 30 : 29
}
// weekday of a Jalali date: 0 = شنبه … 6 = جمعه
export function jalaliWeekday(jy: number, jm: number, jd: number): number {
  const g = toGregorian(jy, jm, jd)
  const dow = new Date(g.gy, g.gm - 1, g.gd).getDay() // 0=Sun..6=Sat
  return (dow + 1) % 7
}
// serial day number for comparisons/ranges
export function jdn(jy: number, jm: number, jd: number) { return j2d(jy, jm, jd) }

export const J_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
export const J_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

export const faDigits = (n: number | string) => n.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])

// Human range string, e.g. «۵ تا ۱۲ مرداد ۱۴۰۴» or «۲۸ مرداد تا ۳ شهریور ۱۴۰۴».
export function formatJalaliRange(from: Jalali, to?: Jalali): string {
  if (!to || (from.jy === to.jy && from.jm === to.jm && from.jd === to.jd)) {
    return `${faDigits(from.jd)} ${J_MONTHS[from.jm - 1]} ${faDigits(from.jy)}`
  }
  if (from.jy === to.jy && from.jm === to.jm) {
    return `${faDigits(from.jd)} تا ${faDigits(to.jd)} ${J_MONTHS[from.jm - 1]} ${faDigits(from.jy)}`
  }
  if (from.jy === to.jy) {
    return `${faDigits(from.jd)} ${J_MONTHS[from.jm - 1]} تا ${faDigits(to.jd)} ${J_MONTHS[to.jm - 1]} ${faDigits(from.jy)}`
  }
  return `${faDigits(from.jd)} ${J_MONTHS[from.jm - 1]} ${faDigits(from.jy)} تا ${faDigits(to.jd)} ${J_MONTHS[to.jm - 1]} ${faDigits(to.jy)}`
}

export function todayJalali(): Jalali {
  const n = new Date()
  return toJalali(n.getFullYear(), n.getMonth() + 1, n.getDate())
}

export function formatJalali(j: Jalali): string {
  return `${faDigits(j.jd)} ${J_MONTHS[j.jm - 1]} ${faDigits(j.jy)}`
}

export function jalaliToIso(j: Jalali): string {
  const g = toGregorian(j.jy, j.jm, j.jd)
  return `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`
}

export function isoToJalali(iso: string): Jalali | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  return toJalali(+m[1], +m[2], +m[3])
}

export function formatIsoRangeJalali(fromIso: string, toIso: string): string {
  const f = isoToJalali(fromIso), t = isoToJalali(toIso)
  if (!f || !t) return `${fromIso} تا ${toIso}`
  return formatJalaliRange(f, t)
}
