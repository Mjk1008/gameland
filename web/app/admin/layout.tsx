import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, isSuperAdmin, hasPermission, whenReady } from '@/lib/store'
import { pendingCodeRequests } from '@/lib/promoter'
import { C, DISP } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  // getUserById reads the in-memory store, which is empty until startHydration()
  // has pulled the users back out of Postgres. Without this gate a request that
  // lands during the first seconds after a restart finds no user and bounces a
  // signed-in admin to /login — the same race whenReady() already guards on the
  // auth/signup/register paths. router.refresh() after recording a result is a
  // fresh request, so it can hit exactly that window mid-session.
  await whenReady()
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  const u = uid ? getUserById(uid) : null
  if (!u) redirect('/login?callbackUrl=/admin')
  const isAdmin = role === 'admin' || role === 'organizer'
  // A scoped 'result_entry' grant (docs: PERMISSIONS above lib/store.ts) is
  // meant to stay narrow — no analytics, no player attempts, no bracket
  // build/edit — but they need to see which matches are live to know what
  // to record, so let them into روزِ زنده only, never the rest of /admin.
  const recordOnly = !isAdmin && hasPermission(u, 'result_entry')
  if (!isAdmin && !recordOnly) redirect('/me')
  // middleware.ts stamps x-pathname on every non-asset request, so it is
  // present here in practice — but "missing header" must not resolve to
  // "redirect to /admin/today", which would be an endless server redirect
  // onto a page whose own header is equally missing. Fail closed to /me.
  const path = headers().get('x-pathname')
  if (recordOnly && path !== '/admin/today') redirect(path ? '/admin/today' : '/me')

  const codeReqPending = pendingCodeRequests().length

  const TABS = recordOnly ? [] : [
    { href: '/admin', label: 'داشبورد' },
    { href: '/admin/events', label: 'مسابقات' },
    { href: '/admin/content', label: 'محتوا' },
    { href: '/admin/analytics', label: 'آنالیتیکس' },
    { href: '/admin/requests', label: 'درخواست‌ها' },
    { href: '/admin/promoters', label: 'پروموتر', badge: codeReqPending },
    { href: '/admin/gamers', label: 'گیمرها' },
    { href: '/admin/notify', label: 'اعلان' },
    { href: '/admin/today', label: 'روزِ زنده' },
    ...(isSuperAdmin(u) ? [{ href: '/admin/access', label: 'دسترسی‌ها' }] : []),
  ]

  return (
    <>
      <header style={{ position: 'sticky', top: 'env(safe-area-inset-top, 0px)', zIndex: 10, background: 'rgba(20,17,13,.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
          <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 16, color: C.accent, letterSpacing: '.1em' }}>GAMELAND · ADMIN</span>
          <Link href="/me" style={{ all: 'unset', cursor: 'pointer', fontSize: 11, color: C.tmut }}>خروج ›</Link>
        </div>
        {TABS.length > 0 && (
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
        )}
      </header>
      {children}
    </>
  )
}
