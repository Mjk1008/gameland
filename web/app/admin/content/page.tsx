import { Suspense } from 'react'
import { allPromos, allNews, allEvents } from '@/lib/store'
import { BackHeader } from '@/components/ui'
import HubTabs from '@/components/admin-tabs'
import PromosClient from '../promos/client'
import NewsAdminClient from '../news/client'

export const dynamic = 'force-dynamic'

// Content hub — sliders + news were two scattered tiles for the same job
// (home-page content management). One URL, one set of tabs.
export default function ContentHubPage() {
  const events = allEvents().map(e => ({ id: e.id, title: e.title, disc: e.disc }))
  // previews go through /api/promo/[id] — passing raw base64 made this page's payload several MB
  const promos = allPromos().map(p => ({ ...p, imageData: p.imageData.startsWith('data:') ? `/api/promo/${p.id}` : p.imageData }))
  const news = allNews().map(n => ({
    id: n.id, title: n.title, body: n.body, tags: n.tags, active: n.active,
    cover: n.imageData.startsWith('data:') ? `/api/news-image/${n.id}` : n.imageData,
  }))

  return (
    <div className="animate-fade-up">
      <BackHeader title="محتوا" href="/admin" />
      <Suspense>
        <HubTabs tabs={[
          { key: 'promos', label: 'اسلایدر', content: <PromosClient initial={promos} events={events} /> },
          { key: 'news', label: 'اخبار', content: <NewsAdminClient initial={news} /> },
        ]} />
      </Suspense>
    </div>
  )
}
