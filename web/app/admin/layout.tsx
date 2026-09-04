import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, isSuperAdmin } from '@/lib/store'
import { pendingCodeRequests } from '@/lib/promoter'
import { C, DISP } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  const u = uid ? getUserById(uid) : null
  if (!u) redirect('/login?callbackUrl=/admin')
  if (role !== 'admin' && role !== 'organizer') redirect('/me')

  const codeReqPending = pendingCodeRequests().length

  const TABS = [
    { href: '/admin', label: 'داشبورد' },
    { href: '/admin/events', label: 'مسابقات' },
    { href: '/admin/content', label: 'محتوا' },
    { href: '/admin/analytics', label: 'آنالیتیکس' },
    { href: '/admin/requests', label: 'درخواست‌ها' },
    { href: '/admin/promoters', label: 'پروموتر', badge: codeReqPending },
    { href: '/admin/gamers', label: 'گیمرها' },
    { href: '/admin/notify', label: 'اعلان' },
    ...(isSuperAdmin(u) ? [{ href: '/admin/access', label: 'دسترسی‌ها' }] : []),
  ]

  return (
    <>
      <header style={{ position: 'sticky', top: 'env(safe-area-inset-top, 0px)', zIndex: 10, background: 'rgba(20,17,13,.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
          <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 16, color: C.accent, letterSpacing: '.1em' }}>GAMELAND · ADMIN</span>
          <Link href="/me" style={{ all: 'unset', cursor: 'pointer', fontSize: 11, color: C.tmut }}>خروج ›</Link>
        </div>
        <div className="gl-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 16px 10px' }}>
          {TABS.map(t => (
            <Link key={t.href} href={t.href} style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, position: 'relative', fontSize: 12, fontWeight: 700, padding: '7px 13px', borderRadius: 999, background: C.sf1, border: `1px solid ${C.line}`, color: C.tbody }}>
              {t.label}
              {!!t.badge && t.badge > 0 && (
                <span style={{ position: 'absolute', top: -4, insetInlineEnd: -2, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: C.gold, color: C.ink, fontSize: 9, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{t.badge}</span>
              )}
            </Link>
          ))}
        </div>
      </header>
      {children}
    </>
  )
}
