import { allEvents, getSetting, MATCH_CENTER_KEY } from './store'

/** Bottom-nav + /center gate. Env forces on; admin setting `off` forces off; else live events auto-on. */
export function isMatchCenterEnabled(): boolean {
  const env = process.env.MATCH_CENTER_ENABLED ?? process.env.NEXT_PUBLIC_MATCH_CENTER_ENABLED
  if (env === 'true') return true
  const setting = getSetting(MATCH_CENTER_KEY)
  if (setting === 'on') return true
  if (setting === 'off') return false
  return allEvents().some(e => e.status === 'live')
}
