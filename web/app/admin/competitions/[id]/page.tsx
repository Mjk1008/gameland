import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCompetition, eventsForCompetition, approvedRegistrationsForComp } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import { C, Num, StatusChip, GameBadge } from '@/components/ui'
import AddDisciplineForm from './add-discipline'

export const dynamic = 'force-dynamic'

export default function CompetitionAdmin({ params }: { params: { id: string } }) {
  const comp = getCompetition(params.id)
  if (!comp) return notFound()
  const discEvents = eventsForCompetition(params.id)
  const existing = discEvents.map(e => e.disc)

  return (
    <div style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link href="/admin" style={{ fontSize: 12, color: C.tmut, textDecoration: 'none' }}>‹ داشبورد</Link>

      {/* competition header */}
      <div>
        <div style={{ fontSize: 21, fontWeight: 800, color: C.thi }}>{comp.title}</div>
        <div style={{ fontSize: 12.5, color: C.tmut, marginTop: 5 }}>
          {[comp.location, comp.date].filter(Boolean).join(' · ') || 'رویدادِ چندرشته‌ای'}
        </div>
      </div>

      {/* disciplines in this competition */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.thi }}>رشته‌ها</span>
          <span style={{ fontSize: 11.5, color: C.tmut }}><span className="gl-num">{discEvents.length}</span> رشته</span>
        </div>

        {discEvents.length === 0 ? (
          <div style={{ fontSize: 12.5, color: C.tmut, textAlign: 'center', padding: '18px 0 20px', background: C.sf1, border: `1px dashed ${C.line}`, borderRadius: 12, marginBottom: 12 }}>
            هنوز رشته‌ای اضافه نشده — از پایین اولین رشته رو اضافه کن.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {discEvents.map(e => {
              const d = DISC[e.disc as keyof typeof DISC]
              const regs = approvedRegistrationsForComp(e.id).length
              return (
                <Link key={e.id} href={`/admin/events/${e.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12 }}>
                  <GameBadge disc={e.disc} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.thi }}>{d?.name ?? e.disc}</div>
                    <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>
                      {e.prize > 0 ? `${e.prize}M تومان · ` : ''}فینال {e.finalSize ?? 128} · <span className="gl-num">{regs}</span> ثبت‌نام
                    </div>
                  </div>
                  <StatusChip status={e.status} />
                </Link>
              )
            })}
          </div>
        )}

        <AddDisciplineForm compId={comp.id} compTitle={comp.title} compDate={comp.date} existing={existing} />
      </div>

      <div style={{ fontSize: 11.5, color: C.tmut, lineHeight: 1.9, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '11px 13px' }}>
        هر رشته یه مسابقهٔ مستقل با براکتِ خودشه — روی هرکدوم بزن تا جایزه، قرعه‌کشی و فینالش رو مدیریت کنی.
      </div>
    </div>
  )
}
