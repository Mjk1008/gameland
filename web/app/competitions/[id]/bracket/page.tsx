import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, matchesForComp, getUserById } from '@/lib/store'
import { C, BackHeader } from '@/components/ui'
import BracketView, { type MatchDTO, type Player } from './BracketView'

export const dynamic = 'force-dynamic'

export default async function BracketPage({ params }: { params: { id: string } }) {
  const c = getEvent(params.id)
  if (!c) return notFound()

  const session = await getServerSession(authOptions)
  const meUid = (session as any)?.uid as string | undefined

  const real = matchesForComp(c.id)
  const drawn = real.length > 0

  const player = (uid?: string): Player => {
    if (!uid) return null
    const u = getUserById(uid)
    return u ? { uid: u.id, tag: u.tag, name: u.name } : null
  }

  if (drawn) {
    const dto: MatchDTO[] = real.map(m => ({
      id: m.id, bracket: m.bracket, round: m.round, slot: m.slot,
      p1: player(m.p1UserId), p2: player(m.p2UserId),
      winnerUid: m.winnerUserId, score: m.score, status: m.status,
    }))
    return (
      <div className="animate-fade-up">
        <BackHeader title={`براکت — ${c.title}`} href={`/competitions/${c.id}`} />
        <div style={{ padding: '14px 16px 28px' }}>
          <BracketView matches={dto} meUid={meUid} />
        </div>
      </div>
    )
  }

  // Not drawn yet — simple preview.
  return (
    <div className="animate-fade-up">
      <BackHeader title={`براکت — ${c.title}`} href={`/competitions/${c.id}`} />
      <div style={{ padding: '14px 16px 28px' }}>
        <div style={{ fontSize: 12.5, color: C.tbody, padding: '12px 14px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, lineHeight: 1.9 }}>
          هنوز قرعه‌کشی نشده. بعد از بسته‌شدن ثبت‌نام‌ها و تأیید پرداخت‌ها، ادمین قرعه‌کشی رو انجام می‌ده و کل جدول اینجا میاد — از مرحلهٔ اول تا فینال.
        </div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '30px 0', border: `1px dashed ${C.line}`, borderRadius: 14 }}>
          <span style={{ fontSize: 30 }}>🏆</span>
          <span style={{ fontSize: 13, color: C.tmut }}>جدول مسابقات به‌زودی</span>
        </div>
      </div>
    </div>
  )
}
