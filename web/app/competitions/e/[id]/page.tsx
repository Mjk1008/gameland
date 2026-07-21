import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCompetition, eventsForCompetition, getUserById, registrationsForUser } from '@/lib/store'
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

  return (
    <div className="animate-fade-up">
      <BackHeader title={comp.title} href="/competitions" />
      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 21, fontWeight: 800, color: C.thi }}>{comp.title}</div>
          <div style={{ fontSize: 12.5, color: C.tmut, marginTop: 5 }}>
            {[comp.location, comp.date].filter(Boolean).join(' · ') || 'رویدادِ چندرشته‌ای'}
          </div>
          <div style={{ fontSize: 12.5, color: C.tbody, marginTop: 8, lineHeight: 1.8 }}>
            رشته‌ای که می‌خوای رو انتخاب کن و توش ثبت‌نام کن — هر رشته براکت و جایزهٔ خودش رو داره.
          </div>
        </div>

        {discs.length === 0 ? (
          <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}>
            <EmptyState text="رشته‌های این رویداد به‌زودی اعلام می‌شن." />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {discs.map(e => <DisciplineCard key={e.id} ev={e} reg={regByComp.get(e.id)} />)}
          </div>
        )}
      </div>
    </div>
  )
}
