import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, whenReady } from '@/lib/store'
import {
  queryLeaderboard, queryCityRanking, queryLeaderboardRow,
} from '@/lib/ranking-store'

export async function GET(req: Request) {
  await whenReady()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0)
  const disc = searchParams.get('disc') || undefined
  const q = searchParams.get('q') || undefined

  const session = await getServerSession(authOptions)
  const meUid = (session as any)?.uid as string | undefined
  const meTag = meUid ? getUserById(meUid)?.tag : undefined

  const [{ rows, total }, cities, me] = await Promise.all([
    queryLeaderboard({ limit, offset, disc: disc === 'all' ? undefined : disc, q }),
    offset === 0 && !q && !disc ? queryCityRanking() : Promise.resolve([]),
    meUid ? queryLeaderboardRow(meUid) : Promise.resolve(null),
  ])

  return NextResponse.json({
    ranked: rows,
    total,
    cities: offset === 0 ? cities : undefined,
    meTag,
    me,
  })
}
