import { Suspense } from 'react'
import { allDisciplines } from '@/lib/store'
import { BackHeader } from '@/components/ui'
import HubTabs from '@/components/admin-tabs'
import EventsListContent from './list-content'
import CompetitionsContent from './competitions-content'
import DiscClient from '../disciplines/client'

export const dynamic = 'force-dynamic'

// Tournaments hub — discipline-events, multi-discipline competitions (رویداد),
// and the discipline catalog were three separate tiles for one job area.
export default function TournamentsHubPage() {
  return (
    <div className="animate-fade-up">
      <BackHeader title="مسابقات" href="/admin" />
      <Suspense>
        <HubTabs tabs={[
          { key: 'events', label: 'مسابقات', content: <EventsListContent /> },
          { key: 'competitions', label: 'رویدادها', content: <CompetitionsContent /> },
          { key: 'disciplines', label: 'رشته‌ها', content: <DiscClient initial={allDisciplines()} /> },
        ]} />
      </Suspense>
    </div>
  )
}
