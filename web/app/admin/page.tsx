import Link from 'next/link'
import { allUsers, allEvents, pendingRegistrations, allPromos, allCompetitions } from '@/lib/store'
import { C, Num, StatusChip, EmptyState, DISC_DOT } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default function AdminHome() {
  const userCount = allUsers().length
  const events = allEvents()
  const liveComps = events.filter(c => c.status === 'live' || c.status === 'open').length
  const pending = pendingRegistrations().length
  const slideCount = allPromos().length
  const comps = allCompetitions()

  const tools: { href: string; label: string; sub: string; icon: JSX.Element; badge?: number }[] = [
    { href: '/admin/analytics',   label: 'آنالیتیکس',  sub: 'مانیتورینگ و نمودارها',      icon: <IconChart /> },
    { href: '/admin/competitions/new', label: 'رویداد چندرشته‌ای', sub: 'مسابقهٔ مادر + رشته‌ها', icon: <IconTrophy /> },
    { href: '/admin/events',      label: 'مسابقات',    sub: `${events.length} مسابقه`,   icon: <IconGrid /> },
    { href: '/admin/promos',      label: 'اسلایدر',    sub: `${slideCount} اسلاید`,      icon: <IconImage /> },
    { href: '/admin/requests',    label: 'درخواست‌ها', sub: pending ? `${pending} منتظر` : 'همه رسیدگی‌شده', icon: <IconInbox />, badge: pending },
    { href: '/admin/gamers',      label: 'گیمرها',     sub: `${userCount} کاربر`,        icon: <IconUsers /> },
    { href: '/admin/disciplines', label: 'رشته‌ها',    sub: 'مدیریت بازی‌ها',            icon: <IconGrid /> },
    { href: '/admin/gamenets',    label: 'گیم‌نت‌ها',  sub: 'تأیید و مدیریت',            icon: <IconPin /> },
    { href: '/admin/notify',      label: 'اعلان',      sub: 'ارسال پیام همگانی',         icon: <IconBell /> },
    { href: '/admin/events/new',  label: 'مسابقهٔ جدید', sub: 'ساخت رویداد',            icon: <IconPlus /> },
  ]

  return (
    <div style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.thi }}>داشبورد</div>

      {/* at-a-glance stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Stat label="گیمرها" value={userCount} color={C.accent} />
        <Stat label="فعال" value={liveComps} color={C.win} />
        <Stat label="کل مسابقه" value={events.length} color={C.gold} />
      </div>

      {/* pending alert */}
      {pending > 0 && (
        <Link href="/admin/requests" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', background: C.accentSoft, border: `1px solid ${C.accent}`, borderRadius: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent }} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.accent }}>درخواست ثبت‌نام منتظر تایید</span>
          <Num size={18} color={C.accent}>{pending}</Num>
        </Link>
      )}

      {/* everything the admin can do — one hub */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.thi, marginBottom: 10 }}>ابزارها</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {tools.map(t => (
            <Link key={t.href} href={t.href} style={{ all: 'unset', cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 96, padding: '13px 13px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: C.accentSoft, color: C.accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{t.icon}</span>
              <div style={{ marginTop: 'auto' }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: C.thi }}>{t.label}</div>
                <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>{t.sub}</div>
              </div>
              {!!t.badge && t.badge > 0 && (
                <span style={{ position: 'absolute', top: 12, insetInlineEnd: 12, minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, background: C.live, color: '#fff', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{t.badge}</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* multi-discipline events (رویدادها) */}
      {comps.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.thi, marginBottom: 10 }}>رویدادها</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {comps.map(cp => (
              <Link key={cp.id} href={`/admin/competitions/${cp.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: C.gold, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: C.thi, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cp.title}</span>
                <span style={{ color: C.tmut, fontSize: 13 }}>›</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* per-discipline competitions quick list */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.thi, marginBottom: 10 }}>مسابقات (رشته‌ها)</div>
        {events.length === 0 ? (
          <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}><EmptyState text="هنوز مسابقه‌ای نساختی." /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.map(c => (
              <Link key={c.id} href={`/admin/events/${c.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: DISC_DOT[c.disc] ?? C.tmut, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: C.thi, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                <StatusChip status={c.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <Num size={24} color={color}>{value}</Num>
      <span style={{ fontSize: 11, color: C.tmut }}>{label}</span>
    </div>
  )
}

// ── inline stroke icons (consistent 20px, strokeWidth 2) ──
const svg = (path: React.ReactNode) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
)
const IconTrophy = () => svg(<><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" /></>)
const IconImage  = () => svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="M21 16l-5-5L5 20" /></>)
const IconInbox  = () => svg(<><path d="M3 12h5l2 3h4l2-3h5M4 4h16v16H4z" /></>)
const IconUsers  = () => svg(<><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M21 20a5 5 0 0 0-4-5" /></>)
const IconGrid   = () => svg(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>)
const IconPin    = () => svg(<><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></>)
const IconBell   = () => svg(<><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" /></>)
const IconPlus   = () => svg(<><path d="M12 5v14M5 12h14" /></>)
const IconChart  = () => svg(<><path d="M3 3v18h18M8 15v3M13 9v9M18 5v13" /></>)
