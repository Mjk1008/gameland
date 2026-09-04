import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { getUserById, registrationsForUser, notifsForUser, unreadCount, allEvents, profileCompletion, hasAvatar, teamsForUser, currentTeamMembers, getRegistration, getEvent, hasPermission } from '@/lib/store'
import { challengePointsOf } from '@/lib/arena'
import { isArenaEnabled } from '@/lib/arena-enabled'
import { isPromoter, promoterDashboard } from '@/lib/promoter'
import { queryUserRank, queryGamerCount } from '@/lib/ranking-store'
import { C, DISP, Num, GameBadge } from '@/components/ui'
import AvatarEditor from './avatar-editor'
import ShareCard from './share-card'
import TeamCard from './team-card'

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

  const myTeams = teamsForUser(uid).map(t => {
    const members = currentTeamMembers(t.id).map(m => {
      const mu = getUserById(m.userId)
      const reg = getRegistration(m.userId, t.compId)
      return { name: mu?.name ?? '', tag: mu?.tag ?? '', isMe: m.userId === uid, status: m.status, regStatus: reg?.status }
    })
    const needsAttention = members.some(m => m.status === 'declined' || m.regStatus === 'rejected') || members.length < 2
    return { team: t, comp: getEvent(t.compId), members, needsAttention }
  }).filter(x => x.comp)

  const { rank: myRank, points: myPoints } = await queryUserRank(uid)
  const gamerTotal = await queryGamerCount()
  const myArenaPoints = challengePointsOf(uid)
  const arenaOn = isArenaEnabled()
  const promoDash = isPromoter(uid) ? promoterDashboard(uid) : null

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

      {promoDash && (
        <Link href="/me/promoter" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, background: C.sf1, border: `1px solid ${C.gold}55`, borderRadius: 13, padding: '13px 14px', marginBottom: 16 }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: C.goldSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🎟</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: C.thi }}>پنل پروموتر</span>
            <span style={{ display: 'block', fontSize: 11, color: C.tmut, marginTop: 2 }}>
              {promoDash.primary && !promoDash.primaryPaused
                ? `${promoDash.totalUses} استفاده · ${promoDash.approved} تأیید`
                : promoDash.primaryPaused ? 'کدت موقتاً غیرفعاله'
                : promoDash.pendingRequest ? 'درخواست کد کمپین در انتظار' : 'کد اصلی ساخته می‌شه'}
              {promoDash.pendingCommission > 0 ? ` · ${promoDash.pendingCommission.toLocaleString('fa-IR')} ت معوق` : ''}
            </span>
          </span>
          <span style={{ color: C.gold, fontSize: 14 }}>‹</span>
        </Link>
      )}

      {arenaOn && (
      <Link href="/me/arena" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, background: C.sf1, border: `1px solid ${C.accent}44`, borderRadius: 13, padding: '13px 14px', marginBottom: 10 }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>⚔</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: C.thi }}>صندوق میدون</span>
          <span style={{ display: 'block', fontSize: 11, color: C.tmut, marginTop: 2 }}>{myArenaPoints > 0 ? `${myArenaPoints} امتیاز میدون` : 'بازی‌های ۱به۱ و درخواست‌ها'}</span>
        </span>
        <span style={{ color: C.accent, fontSize: 14 }}>‹</span>
      </Link>
      )}

      {/* AI assistant entry */}
      <Link href="/assistant" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, background: C.sf1, border: `1px solid ${C.gold}44`, borderRadius: 13, padding: '13px 14px', marginBottom: 16 }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, background: C.goldSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🎮</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: C.thi }}>دستیار گیم‌لند</span>
          <span style={{ display: 'block', fontSize: 11, color: C.tmut, marginTop: 2 }}>وضعیتِ ثبت‌نامت، قوانین، تریکِ بازی‌ها — بپرس</span>
        </span>
        <span style={{ color: C.gold, fontSize: 14 }}>‹</span>
      </Link>

      {/* shareable gamer card — identity worth showing off */}
      {u.role === 'gamer' && (
        <div style={{ marginBottom: 16 }}>
          <ShareCard uid={uid} name={u.name} tag={u.tag} city={u.city} disc={u.primaryDisc ?? null} rank={myRank} points={myPoints} total={gamerTotal} hasPhoto={hasAvatar(uid)} />
        </div>
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

      {u.role === 'gamer' && hasPermission(u, 'result_entry') && (
        <Link href="/competitions" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, padding: '13px 14px', background: C.goldSoft, border: `1px solid ${C.gold}`, borderRadius: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>ثبت نتیجه براکت</span>
          <span style={{ color: C.gold }}>›</span>
        </Link>
      )}

      {myTeams.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.thi }}>تیم‌های من</span>
          {myTeams.map(({ team, comp, members, needsAttention }) => (
            <TeamCard key={team.id} compId={team.compId} compTitle={comp!.title} teamId={team.id} teamName={team.name}
              isCaptain={team.captainId === uid} needsAttention={needsAttention} members={members} />
          ))}
        </div>
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
              const live = !!reg && reg.status !== 'rejected'
              return (
                <Link key={c.id} href={live ? `/competitions/${c.id}/me` : `/competitions/${c.id}/register`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12 }}>
                  <GameBadge disc={c.disc} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{c.title}</div>
                    <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 2 }}>{live ? `${reg!.attempts} بلیط · ${reg!.seedsEarned} seed` : c.statusLabel}</div>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: live ? C.gold : C.accent }}>{live ? 'مشاهده' : 'ثبت‌نام ›'}</span>
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
        {u.role === 'gamer' && (
          <Link href="/invite" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', background: C.sf1, border: `1px solid ${C.gold}44`, borderRadius: 11 }}>
            <span style={{ fontSize: 13, color: C.thi }}>دعوت رفیق — سهم رایگان</span>
            <span style={{ color: C.gold, fontSize: 11.5, fontWeight: 700 }}>REF ›</span>
          </Link>
        )}
        <Link href="/gamenet" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 11 }}>
          <span style={{ fontSize: 13, color: C.thi }}>گیم‌نت داری؟ ثبتش کن</span>
          <span style={{ color: C.tmut }}>›</span>
        </Link>
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
