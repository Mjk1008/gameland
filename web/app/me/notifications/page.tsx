import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, notifsForUser } from '@/lib/store'

export const dynamic = 'force-dynamic'

const TYPE_META: Record<string, { color: string; icon: string }> = {
  registration: { color: '#34d399', icon: '✓' },
  draw:         { color: '#22d3ee', icon: '◆' },
  match_ready:  { color: '#f5c84b', icon: '▶' },
  result:       { color: '#a78bfa', icon: '★' },
  advance:      { color: '#22d3ee', icon: '↑' },
  announcement: { color: '#94a3b8', icon: 'i' },
}

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) redirect('/login?callbackUrl=/me/notifications')

  const list = notifsForUser(uid)

  return (
    <div className="animate-fade-up">
      <div style={{ position: 'sticky', top: 0, zIndex: 6, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(11,15,20,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1e293b' }}>
        <Link href="/me" style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 11, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>اعلان‌ها</span>
      </div>

      <div style={{ padding: '14px 16px 28px' }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b', fontSize: 13 }}>هنوز اعلانی نداری</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map(n => {
              const meta = TYPE_META[n.type] ?? TYPE_META.announcement
              return (
                <div key={n.id} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: '#121821', border: `1px solid ${n.read ? '#1e293b' : meta.color + '55'}`, borderRadius: 13 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: meta.color + '22', color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>{meta.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, lineHeight: 1.7 }}>{n.body}</div>
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>{relativeTime(n.createdAt)}</div>
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
  const dd = Math.floor(h / 24)
  return `${dd} روز پیش`
}
