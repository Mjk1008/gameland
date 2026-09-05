import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, whenReady, newsForPlacement } from '@/lib/store'
import { buildTodaySnapshot } from '@/lib/today-snapshot'
import TodayClient from './client'

export const dynamic = 'force-dynamic'

export default async function TodayPage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const u = uid ? getUserById(uid) : null
  if (!uid || !u) redirect('/login?callbackUrl=/today')

  await whenReady()
  const initial = buildTodaySnapshot(uid)
  // same anti-bloat rule as the home slider — covers served via /api/news-image
  const news = newsForPlacement('today').slice(0, 8).map(n => ({
    id: n.id, title: n.title, body: n.body, tags: n.tags, at: n.createdAt,
    cover: n.imageData.startsWith('data:') ? `/api/news-image/${n.id}` : n.imageData,
  }))

  return <TodayClient initial={initial} news={news} />
}
