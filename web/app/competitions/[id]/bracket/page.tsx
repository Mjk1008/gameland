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
  const role = (session as any)?.role
  const isAdmin = role === 'admin' || role === 'organizer'

  const real = matchesForComp(c.id)
  const drawn = real.length > 0

  const player = (uid?: string): Player => {
    if (!uid) return null
    const u = getUserById(uid)
    return u ? { uid: u.id, tag: u.tag, name: u.name } : null
  }

  if (drawn) {
    const dto: MatchDTO[] = real.map(m => ({
      id: m.id, stage: m.stage, groupKey: m.groupKey, bracket: m.bracket, round: m.round, slot: m.slot,
      p1: player(m.p1UserId), p2: player(m.p2UserId),
      winnerUid: m.winnerUserId, score: m.score, status: m.status,
    }))
    return (
      <div className="animate-fade-up">
        <BackHeader title={`براکت — ${c.title}`} href={`/competitions/${c.id}`} />
        <div style={{ padding: '14px 16px 28px' }}>
          <BracketView matches={dto} meUid={meUid} isAdmin={isAdmin} compId={c.id} />
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
          هنوز قرعه‌کشی نشده. بعد از بسته‌شدن ثبت‌نام‌ها و تأیید پرداخت‌ها، ادمین قرعه‌کشی رو انجام می‌ده و کل جدول اینجا میاد — مسیرِ خودت و همهٔ حریف‌ها.
        </div>
        {/* empty structure preview so the player knows the stages ahead */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column' }}>
          {[
            { title: 'مرحلهٔ مقدماتی', sub: 'گروه‌بندیِ شهری · تا ۶ براکت' },
            { title: `فینالِ ${(c.finalSize ?? 128).toLocaleString('fa-IR')} نفره`, sub: 'برگزیده‌های مقدماتی' },
          ].map((s, i, arr) => (
            <div key={i} style={{ display: 'flex', gap: 13, minHeight: 56 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
                <div style={{ width: 15, height: 15, borderRadius: '50%', background: C.sf1, border: `2px dashed ${C.line2}`, marginTop: 4 }} />
                {i < arr.length - 1 && <div style={{ flex: 1, width: 2, background: C.line }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: 13, minWidth: 0 }}>
                <div style={{ background: C.sf1, border: `1px dashed ${C.line2}`, borderRadius: 12, padding: '11px 14px', opacity: 0.75 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.tbody }}>{s.title}</div>
                  <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 4 }}>{s.sub}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
