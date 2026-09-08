import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { whenReady } from '@/lib/store'
import { buildAdminToday } from '@/lib/today-snapshot'
import TodayAdminClient from './client'

export const dynamic = 'force-dynamic'

// «تختهٔ روز» — station board + check-in queue + group announce. Sits
// alongside run-panel.tsx/MatchOps (result-posting stays on that path);
// this board only helps find the right match fast during a live match day.
//
// Three audiences reach it, and each panel below is backed by an API route
// with its own guard — so the panels are rendered by what the viewer can
// actually POST to, instead of showing everyone a control that 403s:
//   admin            → everything
//   organizer        → board + صدا کن + اعلانِ گروهی (stories/تابلوِ اعلان are
//                      role==='admin' only on the API side)
//   result_entry     → the board, read-only
export default async function AdminTodayPage() {
  await whenReady()
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  return (
    <TodayAdminClient
      initial={buildAdminToday()}
      staff={role === 'admin' || role === 'organizer'}
      isAdminRole={role === 'admin'}
    />
  )
}
