import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, notifsForUser, markAllNotifsRead } from '@/lib/store'
import { C, BackHeader, EmptyState } from '@/components/ui'

export const dynamic = 'force-dynamic'

const TYPE_COLOR: Record<string, string> = {
  registration: C.win, draw: C.accent, match_ready: C.gold,
  result: C.info, advance: C.win, announcement: C.tbody,
}

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map(n => {
              const color = TYPE_COLOR[n.type] ?? C.tbody
              return (
                <div key={n.id} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: n.read ? C.sf1 : C.sf2, border: `1px solid ${n.read ? C.line : C.line2}`, borderRadius: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? C.line2 : color, flexShrink: 0, marginTop: 6 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{n.title}</div>
                    <div style={{ fontSize: 11.5, color: C.tbody, marginTop: 3, lineHeight: 1.7 }}>{n.body}</div>
                    <div style={{ fontSize: 10, color: C.tmut, marginTop: 5 }}>{relativeTime(n.createdAt)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'الان'
  if (m < 60) return `${m} دقیقه پیش`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ساعت پیش`
  return `${Math.floor(h / 24)} روز پیش`
}
