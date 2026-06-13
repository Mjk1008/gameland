import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById } from '@/lib/store'

export const dynamic = 'force-dynamic'

const TABS = [
  { href: '/admin',             label: 'داشبورد' },
  { href: '/admin/events',      label: 'مسابقات' },
  { href: '/admin/gamers',      label: 'گیمرها' },
  { href: '/admin/gamenets',    label: 'گیم‌نت‌ها' },
  { href: '/admin/disciplines', label: 'رشته‌ها' },
  { href: '/admin/sponsors',    label: 'حامیان' },
  { href: '/admin/notify',      label: 'اعلان' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  const u = uid ? getUserById(uid) : null
  if (!u) redirect('/login?callbackUrl=/admin')
  if (role !== 'admin' && role !== 'organizer') redirect('/me')

  return (
    <>
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(11,15,20,.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px' }}>
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, color: '#f5c84b', letterSpacing: '.05em' }} dir="ltr">GAMELAND ADMIN</span>
          <Link href="/me" style={{ all: 'unset', cursor: 'pointer', fontSize: 11, color: '#64748b' }}>خروج از پنل ›</Link>
        </div>
        <div className="gl-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 16px 10px' }}>
          {TABS.map(t => (
            <Link key={t.href} href={t.href} style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999, background: '#121821', border: '1px solid #1e293b', color: '#94a3b8' }}>{t.label}</Link>
          ))}
        </div>
      </header>
      {children}
    </>
  )
}
