// «پخش زنده» — MVP live-stream layer. Gameland never ingests, transcodes or
// serves video: the broadcaster goes live on their own verified Aparat
// account, and this just embeds that stream inside the app (an iframe
// pointed at aparat.com) and tracks which event it belongs to.
//
// Deliberately in-memory only, no DB table: this is throwaway state for a
// live event — started/ended by hand within minutes, nobody needs it back
// after a restart.
//
// Access: every 'admin' account is a broadcaster by default (today's staff
// double as پخاش). Beyond that, the super admin can grant the scoped
// 'live_broadcast' permission to a plain gamer account from /admin/access —
// that account gets nothing else (no analytics, no bracket, no other admin
// screen), same pattern as 'result_entry'.

import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { getUserById, hasPermission } from './store'

/** True when the signed-in user may start/end a live stream. */
export async function isBroadcaster(): Promise<boolean> {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  if (!uid) return false
  const u = getUserById(uid)
  if (!u) return false
  return u.role === 'admin' || hasPermission(u, 'live_broadcast')
}

/**
 * Turns whatever the broadcaster pastes — an Aparat share link
 * (aparat.com/v/HASH), an already-embed link, or a full <iframe> snippet —
 * into a safe iframe src. Only aparat.com is ever allowed, so a pasted
 * mistake (or a compromised broadcaster account) can't inject an arbitrary
 * third-party iframe into the app.
 */
export function normalizeAparatEmbed(raw: string): string | null {
  const input = raw.trim()
  if (!input) return null

  const iframeMatch = input.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i)
  const candidate = iframeMatch ? iframeMatch[1] : input

  let url: URL
  try { url = new URL(candidate) } catch { return null }

  if (url.protocol !== 'https:') return null
  if (!/(^|\.)aparat\.com$/i.test(url.hostname)) return null

  // share link → embed link
  const short = url.pathname.match(/^\/v\/([A-Za-z0-9]+)\/?$/)
  if (short) return `https://www.aparat.com/video/video/embed/videohash/${short[1]}/vt/frame`

  return url.toString()
}

export interface LiveStream {
  id: string
  eventId: string
  eventTitle: string
  disc: string
  embedUrl: string
  startedAt: number
  startedByPhone: string
}

const liveStreams = new Map<string, LiveStream>()

/** Newest-first, matching the rest of the app's list ordering. */
export function listLiveStreams(): LiveStream[] {
  return Array.from(liveStreams.values()).sort((a, b) => b.startedAt - a.startedAt)
}

export function getLiveStream(id: string): LiveStream | undefined {
  return liveStreams.get(id)
}

export function startLiveStream(input: { eventId: string; eventTitle: string; disc: string; embedUrl: string; phone: string }): LiveStream {
  const id = 'live_' + Math.random().toString(36).slice(2, 10)
  const s: LiveStream = {
    id, eventId: input.eventId, eventTitle: input.eventTitle, disc: input.disc,
    embedUrl: input.embedUrl, startedAt: Date.now(), startedByPhone: input.phone,
  }
  liveStreams.set(id, s)
  return s
}

export function endLiveStream(id: string): void {
  liveStreams.delete(id)
}
