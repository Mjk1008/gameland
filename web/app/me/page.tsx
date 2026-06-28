import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { getUserById, registrationsForUser, notifsForUser, unreadCount, coinBalance } from '@/lib/store'
import { DISC, avatarBg } from '@/lib/mock-data'
import { allEvents } from '@/lib/store'

export default async function MePage() {
  const session = await getServerSession(authOptions)
  if (!session || !(session as any).uid) redirect('/login?callbackUrl=/me')

  const uid = (session as any).uid as string
  const u = getUserById(uid)
  if (!u) redirect('/login')

  const regs = registrationsForUser(uid)
  const notifs = notifsForUser(uid).slice(0, 3)
  const unread = unreadCount(uid)

  return (
    <div style={{ padding: '14px 16px 28px' }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 18 }}>
        <div style={{ width: 54, height: 54, borderRadius: 14, background: avatarBg('#22d3ee'), border: '1px solid #22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22, color: '#22d3ee' }}>{u.tag[0]?.toUpperCase()}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>{u.name}</div>
          <div dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: '#94a3b8', marginTop: 2 }}>@{u.tag} · {u.city}</div>
        </div>
        <Link href="/me/edit" style={{ all: 'unset', cursor: 'pointer', fontSize: 11, color: '#22d3ee', padding: '6px 10px', border: '1px solid #1e293b', borderRadius: 9 }}>ویرایش</Link>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9, marginBottom: 18 }}>
        <Link href="/me/wallet" style={tile}>
          <span style={{ fontSize: 11, color: '#64748b' }}>سکه</span>
          <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22, color: '#f5c84b' }}>{coinBalance(uid).toLocaleString('en-US')}</span>
        </Link>
        <Link href="/me/competitions" style={tile}>
          <span style={{ fontSize: 11, color: '#64748b' }}>مسابقات</span>
          <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22, color: '#22d3ee' }}>{regs.length}</span>
        </Link>
        <Link href="/me/notifications" style={tile}>
          <span style={{ fontSize: 11, color: '#64748b' }}>اعلان</span>
          <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22, color: unread > 0 ? '#f5c84b' : '#e2e8f0' }}>{unread > 0 ? unread : '—'}</span>
        </Link>
      </div>

      {u.role !== 'gamer' && (
        <Link href="/admin" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18, padding: '12px 14px', background: 'linear-gradient(90deg, rgba(245,200,75,.1), #121821)', border: '1px solid rgba(245,200,75,.3)', borderRadius: 13 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5c84b" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f5c84b' }}>پنل ادمین</span>
        </Link>
      )}

      {/* Open events to join */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>ثبت‌نام در مسابقات</span>
          <Link href="/competitions" style={{ fontSize: 11, color: '#22d3ee', textDecoration: 'none' }}>همه ›</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allEvents().filter(c => c.status === 'open' || c.status === 'live' || c.status === 'soon').slice(0, 3).map(c => {
            const d = DISC[c.disc as keyof typeof DISC]
            const reg = regs.find(r => r.compId === c.id)
            return (
              <Link key={c.id} href={reg ? `/competitions/${c.id}/me` : `/competitions/${c.id}/register`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: '#121821', border: '1px solid #1e293b', borderRadius: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: avatarBg(d.color), border: `1px solid ${d.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 11, color: d.color }} dir="ltr">{d.short}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{c.title}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{reg ? `${reg.attempts} شانس · ${reg.seedsEarned} seed` : c.statusLabel}</div>
                </div>
                <span style={{ fontSize: 11, color: reg ? '#f5c84b' : '#22d3ee' }}>{reg ? 'مشاهده' : 'ثبت‌نام ›'}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent notifications */}
      {notifs.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>اعلان‌های اخیر</span>
            <Link href="/me/notifications" style={{ fontSize: 11, color: '#22d3ee', textDecoration: 'none' }}>همه ›</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifs.map(n => (
              <div key={n.id} style={{ padding: '10px 13px', background: '#121821', border: `1px solid ${n.read ? '#1e293b' : '#22d3ee44'}`, borderRadius: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{n.title}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{n.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings + footer */}
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link href="/me/settings" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#121821', border: '1px solid #1e293b', borderRadius: 11 }}>
          <span style={{ fontSize: 13, color: '#e2e8f0' }}>تنظیمات</span>
          <span style={{ color: '#475569' }}>›</span>
        </Link>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 4, fontSize: 10, color: '#475569' }}>
          <Link href="/about" style={{ color: '#475569' }}>درباره</Link>
          <span>·</span>
          <Link href="/rules" style={{ color: '#475569' }}>قوانین</Link>
          <span>·</span>
          <Link href="/sponsors" style={{ color: '#475569' }}>حامیان</Link>
        </div>
      </div>
    </div>
  )
}

const tile: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
  padding: '13px 0', background: '#121821', border: '1px solid #1e293b', borderRadius: 14,
}
