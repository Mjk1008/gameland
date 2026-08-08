import { notFound } from 'next/navigation'
import { isArenaEnabled } from '@/lib/arena-enabled'

// میدون فقط وقتی flag روشنه برای کاربر دیده می‌شه — تا آماده نشده ۴۰۴.
export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  if (!isArenaEnabled()) notFound()
  return children
}
