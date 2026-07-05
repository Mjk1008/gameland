import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getEvent, registrationsForComp, getUserById, matchesForComp, placementsForComp } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import { C, Num, StatusChip, DISC_DOT } from '@/components/ui'
import ResultControls from './result-controls'
import DrawButton from './draw-button'
import StatusControl from './status-control'
import FinalizeControls from './finalize-controls'

export const dynamic = 'force-dynamic'

export default function AdminEventPage({ params }: { params: { id: string } }) {
  const c = getEvent(params.id)
  if (!c) return notFound()

  const regs = registrationsForComp(c.id)
  const totalAttempts = regs.reduce((s, r) => s + r.attempts, 0)
  const totalSeeds = regs.reduce((s, r) => s + r.seedsEarned, 0)
  const participants = regs.map(r => { const u = getUserById(r.userId); return { userId: r.userId, name: u?.name || '?', tag: u?.tag || '?' } })
  const alreadyFinalized = placementsForComp(c.id).length > 0

  return (
    <div style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link href="/admin/events" style={{ fontSize: 12, color: C.tmut, textDecoration: 'none' }}>‹ مسابقات</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: DISC_DOT[c.disc] ?? C.tmut, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: C.thi }}>{c.title}</div>
          <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 2 }}>{DISC[c.disc as keyof typeof DISC]?.name ?? c.disc}</div>
        </div>
        <StatusChip status={c.status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
        <Stat label="ثبت‌نام" value={regs.length} color={C.accent} />
        <Stat label="بلیط کل" value={totalAttempts} color={C.tbody} />
        <Stat label="seed" value={totalSeeds} color={C.gold} />
      </div>

      <Card><StatusControl compId={c.id} status={c.status} /></Card>
      <Card><DrawButton compId={c.id} drawn={matchesForComp(c.id).length > 0} regCount={regs.length} /></Card>
      <Card><ResultControls compId={c.id} regs={regs.map(r => ({ id: r.id, userId: r.userId, attempts: r.attempts, seedsEarned: r.seedsEarned, prelimsCompleted: r.prelimsCompleted, userName: getUserById(r.userId)?.name || '?', userTag: getUserById(r.userId)?.tag || '?' }))} /></Card>
      <Card><FinalizeControls compId={c.id} participants={participants} done={alreadyFinalized} /></Card>

      <Link href={`/competitions/${c.id}/bracket`} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', background: 'transparent', border: `1px solid ${C.line2}`, borderRadius: 11, padding: '12px 0', color: C.thi, fontWeight: 700, fontSize: 13 }}>
        مشاهدهٔ براکت کامل ›
      </Link>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 15 }}>{children}</div>
}
function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <Num size={22} color={color}>{value}</Num>
      <span style={{ fontSize: 10, color: C.tmut }}>{label}</span>
    </div>
  )
}
