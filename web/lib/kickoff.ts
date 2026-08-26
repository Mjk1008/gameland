import { toGregorian } from './jalali'
import { GAME_BANNER } from './game-assets'

/** ۱۶ شهریور ۱۴۰۵، ۱۸:۰۰ تهران. ساعت را همین‌جا عوض کن. */
export const KICKOFF = { jy: 1405, jm: 6, jd: 16, hour: 18, minute: 0 }

export function kickoffAtMs(): number {
  const g = toGregorian(KICKOFF.jy, KICKOFF.jm, KICKOFF.jd)
  const d = String(g.gd).padStart(2, '0')
  const m = String(g.gm).padStart(2, '0')
  const h = String(KICKOFF.hour).padStart(2, '0')
  const min = String(KICKOFF.minute).padStart(2, '0')
  return Date.parse(`${g.gy}-${m}-${d}T${h}:${min}:00+03:30`)
}

export function kickoffPosters(urls: string[]): string[] {
  const uniq = [...new Set(urls.filter(Boolean))]
  if (uniq.length > 0) return uniq.slice(0, 5)
  return Object.values(GAME_BANNER)
}
