import { allNews } from '@/lib/store'
import { C, BackHeader } from '@/components/ui'
import NewsAdminClient from './client'

export const dynamic = 'force-dynamic'

// Admin news manager — items feed the home news slider + detail modal.
export default function NewsAdmin() {
  const items = allNews().map(n => ({
    id: n.id, title: n.title, body: n.body, tags: n.tags, active: n.active,
    cover: n.imageData.startsWith('data:') ? `/api/news-image/${n.id}` : n.imageData,
  }))
  return (
    <div className="animate-fade-up">
      <BackHeader title="اخبار" href="/admin" />
      <NewsAdminClient initial={items} />
    </div>
  )
}
