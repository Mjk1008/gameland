import { buildAdminToday } from '@/lib/today-snapshot'
import TodayAdminClient from './client'

export const dynamic = 'force-dynamic'

// «تختهٔ روز» — station board + check-in queue + group announce. Sits
// alongside run-panel.tsx/MatchOps (result-posting stays on that path);
// this board only helps find the right match fast during a live match day.
export default function AdminTodayPage() {
  return <TodayAdminClient initial={buildAdminToday()} />
}
