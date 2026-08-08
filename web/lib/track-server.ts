import { persist } from '@/lib/db/persistence'

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
    id: 'ev_' + Math.random().toString(36).slice(2, 10),
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
