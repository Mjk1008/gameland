import { persist } from '@/lib/db/persistence'
import { trackEventId } from '@/lib/track-events'

type UserCtx = { city?: string; primaryDisc?: string | null }

/** Server-fired behavioral events — same table as client track(), with user_id set. */
export function trackServer(e: {
  userId?: string
  sessionId?: string
  name: string
  path: string
  props?: Record<string, unknown>
}) {
  persist.track.insertMany([{
    id: trackEventId(e.name, e.userId),
    userId: e.userId,
    sessionId: (e.sessionId ?? 'server').slice(0, 40),
    name: e.name.slice(0, 60),
    path: e.path.slice(0, 200),
    props: JSON.stringify(e.props ?? {}).slice(0, 500),
  }])
}

export function trackUserProps(u: UserCtx | null | undefined, extra?: Record<string, unknown>) {
  const p: Record<string, unknown> = { ...extra }
  if (u?.city) p.city = u.city
  if (u?.primaryDisc) p.disc = u.primaryDisc
  return p
}
