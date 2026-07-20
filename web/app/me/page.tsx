import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { getUserById, registrationsForUser, notifsForUser, unreadCount, allEvents, profileCompletion, hasAvatar } from '@/lib/store'
import { C, DISP, Num, GameBadge } from '@/components/ui'
import AvatarEditor from './avatar-editor'

export default async function MePage() {
  const session = await getServerSession(authOptions)
  if (!session || !(session as any).uid) redirect('/login?callbackUrl=/me')
  const uid = (session as any).uid as string
  const u = getUserById(uid)
  if (!u) redirect('/login')

  const regs = registrationsForUser(uid)
  const notifs = notifsForUser(uid).slice(0, 3)
  const unread = unreadCount(uid)
  const openEvents = allEvents().filter(c => c.status === 'open' || c.status === 'live' || c.status === 'soon').slice(0, 3)
  const pc = profileCompletion(u)

  return (
    <div style={{ padding: '16px 16px 28px' }} className="animate-fade-up">
      {/* Profile lower-third */}
      <div style={{ position: 'relative', overflow: 'hidden', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <span style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 4, background: C.accent }} />
        <AvatarEditor uid={uid} initial={u.tag[0]?.toUpperCase() ?? '؟'} hasPhoto={hasAvatar(uid)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: C.thi }}>{u.name}</div>
          <div dir="ltr" style={{ fontFamily: DISP, fontSize: 12, color: C.tmut, marginTop: 2, textAlign: 'right' }}>@{u.tag} · {u.city || '—'}</div>
        </div>
        <Link href="/welcome" style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: C.tbody, minHeight: 40, display: 'inline-flex', alignItems: 'center', padding: '0 14px', border: `1px solid ${C.line2}`, borderRadius: 9 }}>ویرایش</Link>
      </div>

      {/* Profile completion meter — only for gamers who aren't 100% yet */}
      {u.role === 'gamer' && !pc.complete && (
        <Link href="/welcome" style={{ all: 'unset', cursor: 'pointer', display: 'block', background: C.sf1, border: `1px solid ${C.gold}55`, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>پروفایلت رو کامل کن</span>
            <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: C.gold }}>{pc.percent}٪</span>
          </div>
          <div style={{ height: 7, borderRadius: 4, background: C.line, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pc.percent}%`, background: C.gold, borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 11.5, color: C.tbody, marginTop: 9, lineHeight: 1.8 }}>
            برای ثبت‌نام تو مسابقه‌ها باید پروفایلت ۱۰۰٪ باشه. مونده: <span style={{ color: C.thi, fontWeight: 700 }}>{pc.missing.join('، ')}</span>
          </div>
          <div style={{ fontSize: 11.5, color: C.gold, fontWeight: 700, marginTop: 8 }}>تکمیل پروفایل ›</div>
        </Link>
      )}

      {/* Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 16 }}>
        <Link href="/me/competitions" style={tile}>
          <span style={{ fontSize: 11, color: C.tmut }}>مسابقات من</span>
          <Num size={26} color={C.accent}>{regs.length}</Num>
        </Link>
        <Link href="/me/notifications" style={tile}>
          <span style={{ fontSize: 11, color: C.tmut }}>اعلان‌ها</span>
          <Num size={26} color={unread > 0 ? C.gold : C.thi}>{unread > 0 ? unread : '—'}</Num>
        </Link>
      </div>

      {u.role !== 'gamer' && (
        <Link href="/admin" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, padding: '13px 14px', background: C.goldSoft, border: `1px solid ${C.gold}`, borderRadius: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>پنل ادمین</span>
          <span style={{ color: C.gold }}>›</span>
        </Link>
      )}

      {openEvents.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.thi }}>ثبت‌نام در مسابقات</span>
            <Link href="/competitions" style={{ fontSize: 12, color: C.accent, textDecoration: 'none' }}>همه ›</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {openEvents.map(c => {
              const reg = regs.find(r => r.compId === c.id)
              return (
                <Link key={c.id} href={reg ? `/competitions/${c.id}/me` : `/competitions/${c.id}/register`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12 }}>
                  <GameBadge disc={c.disc} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{c.title}</div>
                    <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 2 }}>{reg ? `${reg.attempts} بلیط · ${reg.seedsEarned} seed` : c.statusLabel}</div>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: reg ? C.gold : C.accent }}>{reg ? 'مشاهده' : 'ثبت‌نام ›'}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {notifs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.thi }}>اعلان‌های اخیر</span>
            <Link href="/me/notifications" style={{ fontSize: 12, color: C.accent, textDecoration: 'none' }}>همه ›</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifs.map(n => (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: n.read ? C.sf1 : C.sf2, border: `1px solid ${n.read ? C.line : C.line2}`, borderRadius: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? C.line2 : C.accent, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: C.tbody, marginTop: 2 }}>{n.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link href="/me/settings" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 11 }}>
          <span style={{ fontSize: 13, color: C.thi }}>تنظیمات</span>
          <span style={{ color: C.tmut }}>›</span>
        </Link>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 6, fontSize: 11, color: C.tmut }}>
          <Link href="/support" style={{ color: C.tmut }}>پشتیبانی</Link><span>·</span>
          <Link href="/about" style={{ color: C.tmut }}>درباره</Link><span>·</span>
          <Link href="/rules" style={{ color: C.tmut }}>قوانین</Link>
        </div>
      </div>
    </div>
  )
}

const tile: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center',
  padding: '15px 0', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14,
}
