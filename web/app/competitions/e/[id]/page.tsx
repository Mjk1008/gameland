import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCompetition, eventsForCompetition, getUserById, registrationsForUser, resolveCompetitionCardCover, resolveEventCardCover } from '@/lib/store'
import { C, BackHeader, EmptyState } from '@/components/ui'
import { DisciplineCard } from '../../cards'

export const dynamic = 'force-dynamic'

export default async function CompetitionSetPage({ params }: { params: { id: string } }) {
  const comp = getCompetition(params.id)
  if (!comp) return notFound()
  const discs = eventsForCompetition(params.id)

  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const regs = uid && getUserById(uid) ? registrationsForUser(uid) : []
  const regByComp = new Map(regs.map(r => [r.compId, r]))
  const heroCover = resolveCompetitionCardCover(params.id)

  return (
    <div className="animate-fade-up">
      <BackHeader title={comp.title} href="/competitions" />
      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {heroCover ? (
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.line}` }}>
            <img src={heroCover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,17,13,.05) 0%, rgba(20,17,13,.94) 100%)' }} />
            <div style={{ position: 'absolute', insetInline: 14, bottom: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.thi, textShadow: '0 2px 10px rgba(0,0,0,.8)' }}>{comp.title}</div>
              <div style={{ fontSize: 12, color: '#fff', opacity: .85, marginTop: 4 }}>
                {[comp.location, comp.date].filter(Boolean).join(' · ') || 'رویدادِ چندرشته‌ای'}
              </div>
            </div>
          </div>
        ) : (
        <div>
          <div style={{ fontSize: 21, fontWeight: 800, color: C.thi }}>{comp.title}</div>
          <div style={{ fontSize: 12.5, color: C.tmut, marginTop: 5 }}>
            {[comp.location, comp.date].filter(Boolean).join(' · ') || 'رویدادِ چندرشته‌ای'}
          </div>
        </div>
        )}

        <div style={{ fontSize: 12.5, color: C.tbody, lineHeight: 1.8 }}>
          رشته‌ای که می‌خوای رو انتخاب کن و توش ثبت‌نام کن — هر رشته براکت و جایزهٔ خودش رو داره.
        </div>

        {discs.length === 0 ? (
          <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}>
            <EmptyState text="رشته‌های این رویداد به‌زودی اعلام می‌شن." />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {discs.map(e => <DisciplineCard key={e.id} ev={e} reg={regByComp.get(e.id)} coverSrc={resolveEventCardCover(e.id, e.disc)} />)}
          </div>
        )}
      </div>
    </div>
  )
}
