import { NextResponse } from 'next/server'
import {
  myArenaSummary, getPlayRequest, getPlayMatch, challengePointsOf,
} from '@/lib/arena'
import { getUserById, getGamenet } from '@/lib/store'
import { withArenaUser, userBrief } from '@/lib/arena-http'

function serializeMatch(m: ReturnType<typeof getPlayMatch>) {
  if (!m) return null
  const req = getPlayRequest(m.requestId)
  return {
    ...m,
    request: req ?? null,
    requester: userBrief(m.requesterId),
    acceptor: userBrief(m.acceptorId),
    gamenet: m.gamenetId ? getGamenet(m.gamenetId) : null,
  }
}

export async function GET() {
  return withArenaUser(async uid => {
    const s = myArenaSummary(uid)
    return NextResponse.json({
      arenaPoints: challengePointsOf(uid),
      openRequest: s.openRequest,
      pendingMatches: s.pendingMatches.map(m => serializeMatch(m)!),
      scheduledMatches: s.scheduledMatches.map(m => serializeMatch(m)!),
      history: s.history.map(m => serializeMatch(m)!),
    })
  })
}
