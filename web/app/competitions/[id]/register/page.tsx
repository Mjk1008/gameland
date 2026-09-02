import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DISC, avatarBg, statusColor } from '@/lib/mock-data'
import { getUserById, getRegistration, getEvent, getEventConfig, profileCompletion, remainingTickets, matchesForComp, teamForUser, captainTeamFor, currentTeamMembers } from '@/lib/store'
import { ticketPriceFor } from '@/lib/ticket-price'
import { C } from '@/components/ui'
import Link from 'next/link'
import RegisterForm from './form'

export const dynamic = 'force-dynamic'

export default async function RegisterPage({ params }: { params: { id: string } }) {
  const c = getEvent(params.id)
  if (!c) return notFound()

  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const u = uid ? getUserById(uid) : null
  if (!uid || !u) redirect(`/login?callbackUrl=/competitions/${params.id}/register`)

  // Ticket cap is per discipline (6). Once the draw is done, or the cap is
  // reached, buying is closed → send them to their roadmap.
  // a rejected registration doesn't count as owned tickets — the user is
  // starting over (store reuses the row with a fresh count)
  const existingReg = getRegistration(uid, params.id)
  const owned = existingReg && existingReg.status !== 'rejected' ? existingReg.attempts : 0
  const remaining = remainingTickets(uid, params.id)
  const drawn = matchesForComp(params.id).length > 0
  if ((owned > 0 && remaining === 0) || drawn) redirect(`/competitions/${params.id}/me`)

  const isTeamEvent = getEventConfig(c.id).teamSize === 2
  // On a 2v2 event the partner has nothing to do here — the captain runs the
  // team's سهم and payment. Send them to their status page. (The captain falls
  // through and can top up the same team.)
  const myTeam = isTeamEvent ? teamForUser(uid, c.id) : undefined
  if (myTeam && myTeam.captainId !== uid) redirect(`/competitions/${params.id}/me`)
  const reuseTeam = isTeamEvent ? captainTeamFor(uid, c.id) : undefined
  const reusePartner = reuseTeam
    ? currentTeamMembers(reuseTeam.id).find(m => m.slot === 1)
    : undefined
  const reusePartnerTag = reusePartner ? getUserById(reusePartner.userId)?.tag : undefined

  // A complete gamer profile is required before joining any competition.
  const pc = profileCompletion(u)
  if (u.role === 'gamer' && !pc.complete) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 34, marginBottom: 12 }}>🎮</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.thi, marginBottom: 8 }}>اول پروفایلت رو کامل کن</div>
        <div style={{ fontSize: 13, color: C.tbody, lineHeight: 2, marginBottom: 18 }}>
          برای ثبت‌نام تو «{c.title}» باید پروفایلت ۱۰۰٪ باشه. الان {pc.percent}٪ پره.<br />
          مونده: <span style={{ color: C.thi, fontWeight: 700 }}>{pc.missing.join('، ')}</span>
        </div>
        <div style={{ height: 8, borderRadius: 5, background: C.line, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: '100%', width: `${pc.percent}%`, background: C.gold, borderRadius: 5 }} />
        </div>
        <Link href={`/welcome`} style={{ all: 'unset', cursor: 'pointer', display: 'block', background: C.accent, color: '#0B0A08', fontWeight: 800, fontSize: 14, padding: '13px 0', borderRadius: 12 }}>تکمیل پروفایل</Link>
        <Link href={`/competitions/${c.id}`} style={{ display: 'block', marginTop: 12, fontSize: 12.5, color: C.tmut, textDecoration: 'none' }}>بازگشت به مسابقه</Link>
      </div>
    )
  }

  if (c.status === 'done') {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>این مسابقه تموم شده — دیگه نمی‌شه ثبت‌نام کرد</div>
      </div>
    )
  }

  const price = ticketPriceFor(c.id)
  return <RegisterForm comp={{ id: c.id, title: c.title, disc: c.disc, status: c.status, statusLabel: c.statusLabel, prize: c.prize, format: c.format, teams: c.teams }} owned={owned} remaining={remaining} canSetRef={!u.referredBy} canUsePromo={owned === 0} freeTickets={u.freeTickets ?? 0} price={price} isTeamEvent={isTeamEvent} reuseTeam={reuseTeam ? { name: reuseTeam.name, partnerTag: reusePartnerTag } : undefined} />
}
