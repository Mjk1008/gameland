import { notFound } from 'next/navigation'
import { isTodayHubEnabled } from '@/lib/today-hub-enabled'

// «امروز» فقط وقتی flag روشنه دیده می‌شه — تا آماده نشده ۴۰۴ (الگوی میدون).
export default function TodayLayout({ children }: { children: React.ReactNode }) {
  if (!isTodayHubEnabled()) notFound()
  return children
}
