import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, notifsForUser, markAllNotifsRead } from '@/lib/store'
import { C, BackHeader, EmptyState } from '@/components/ui'

export const dynamic = 'force-dynamic'

const TYPE_META: Record<string, { color: string; label: string }> = {
  registration: { color: C.win,  label: 'ثبت‌نام' },
  draw:         { color: C.accent, label: 'قرعه‌کشی' },
  match_ready:  { color: C.gold,  label: 'بازی' },
  result:       { color: C.info,  label: 'نتیجه' },
  advance:      { color: C.win,   label: 'صعود' },
  announcement: { color: C.tbody, label: 'اطلاعیه' },
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
              const meta = TYPE_META[n.type] ?? { color: C.tbody, label: 'اعلان' }
              return (
                <div key={n.id} style={{ position: 'relative', display: 'flex', gap: 11, padding: '12px 14px', background: n.read ? C.sf1 : C.sf2, border: `1px solid ${n.read ? C.line : meta.color + '55'}`, borderRadius: 12, overflow: 'hidden' }}>
                  {!n.read && <span style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 3, background: meta.color }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: meta.color + '1f', padding: '2px 8px', borderRadius: 6 }}>{meta.label}</span>
                      {!n.read && <span style={{ fontSize: 10, color: meta.color }}>جدید</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: C.thi }}>{n.title}</div>
                    <div style={{ fontSize: 12.5, color: C.tbody, marginTop: 3, lineHeight: 1.8 }}>{n.body}</div>
                    <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 6 }}>{relativeTime(n.createdAt)}</div>
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
