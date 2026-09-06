import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, notifsForUser, markAllNotifsRead } from '@/lib/store'
import { C, BackHeader, EmptyState } from '@/components/ui'
import NotifList from './notif-list'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) redirect('/login?callbackUrl=/me/notifications')

  const list = notifsForUser(uid)
  markAllNotifsRead(uid)

  return (
    <div className="animate-fade-up">
      <BackHeader title="اعلان‌ها" href="/me" />
      <div style={{ padding: '16px 16px 28px' }}>
        {list.length === 0 ? (
          <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}>
            <EmptyState text="هنوز اعلانی نداری — اینجا خبرت می‌کنیم." />
          </div>
        ) : (
          <NotifList list={list} />
        )}
      </div>
    </div>
  )
}
