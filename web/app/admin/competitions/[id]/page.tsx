import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCompetition, eventsForCompetition, approvedRegistrationsForComp, hasCompetitionCover, hasEventCover, getEventConfig } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import { disciplineDisplayName, disciplineSlotKey, formatModeLabel } from '@/lib/discipline-format'
import { C, Num, StatusChip, GameBadge } from '@/components/ui'
import AddDisciplineForm from './add-discipline'
import EditCompetition from './edit-competition'
import CompetitionCoverPanel from './competition-cover-panel'

export const dynamic = 'force-dynamic'

export default function CompetitionAdmin({ params }: { params: { id: string } }) {
  const comp = getCompetition(params.id)
  if (!comp) return notFound()
  const discEvents = eventsForCompetition(params.id)
  const existingSlots = discEvents.map(e => disciplineSlotKey(e.disc, getEventConfig(e.id).teamSize))

  return (
    <div style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link href="/admin" style={{ fontSize: 12, color: C.tmut, textDecoration: 'none' }}>‹ داشبورد</Link>

      {/* competition header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div>
          <div style={{ fontSize: 21, fontWeight: 800, color: C.thi }}>{comp.title}</div>
          <div style={{ fontSize: 12.5, color: comp.location ? C.tmut : C.gold, marginTop: 5 }}>
            {[comp.location, comp.date].filter(Boolean).join(' · ') || '⚠ محل و تاریخ ثبت نشده — دستیار و کارت‌ها چیزی برای نشون‌دادن ندارن'}
          </div>
        </div>
        <EditCompetition id={comp.id} title={comp.title} location={comp.location} date={comp.date} childCount={discEvents.length} />
      </div>

      <CompetitionCoverPanel id={comp.id} hasCover={hasCompetitionCover(comp.id)} />

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
              const teamSize = getEventConfig(e.id).teamSize
              const regs = approvedRegistrationsForComp(e.id).length
              return (
                <Link key={e.id} href={`/admin/events/${e.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12 }}>
                  <GameBadge disc={e.disc} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.thi }}>{disciplineDisplayName(d?.name ?? e.disc, teamSize)}</div>
                    <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>
                      {formatModeLabel(teamSize)}{e.prize > 0 ? ` · ${e.prize}M تومان` : ''} · فینال {e.finalSize ?? 128} · <span className="gl-num">{regs}</span> ثبت‌نام
                    </div>
                  </div>
                  <StatusChip status={e.status} />
                </Link>
              )
            })}
          </div>
        )}

        <AddDisciplineForm compId={comp.id} compTitle={comp.title} compDate={comp.date} existingSlots={existingSlots} />
      </div>

      <div style={{ fontSize: 11.5, color: C.tmut, lineHeight: 1.9, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '11px 13px' }}>
        هر رشته یه مسابقهٔ مستقل با براکتِ خودشه — روی هرکدوم بزن تا جایزه، قرعه‌کشی و فینالش رو مدیریت کنی.
      </div>
    </div>
  )
}
