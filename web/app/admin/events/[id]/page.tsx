import { notFound } from 'next/navigation'
import Link from 'next/link'
import { COMPS, DISC, avatarBg, statusColor } from '@/lib/mock-data'
import { allEvents, registrationsForComp, getUserById, matchesForComp } from '@/lib/store'
import ResultControls from './result-controls'
import DrawButton from './draw-button'

export const dynamic = 'force-dynamic'

export default function AdminEventPage({ params }: { params: { id: string } }) {
  const c = COMPS.find(x => x.id === params.id) ?? allEvents().find(x => x.id === params.id)
  if (!c) return notFound()

  const d = DISC[c.disc as keyof typeof DISC]
  const sc = statusColor(c.status as any)
  const regs = registrationsForComp(c.id)
  const totalAttempts = regs.reduce((s, r) => s + r.attempts, 0)
  const totalSeeds    = regs.reduce((s, r) => s + r.seedsEarned, 0)

  return (
    <div style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/admin/events" style={{ all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 10, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>مدیریت ایونت</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{ width: 48, height: 48, borderRadius: 13, background: avatarBg(d.color), border: `1px solid ${d.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13, color: d.color }}>{d.short}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#f1f5f9' }}>{c.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: sc, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc }}/>{c.statusLabel}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
        <Stat label="ثبت‌نام" value={regs.length} color="#22d3ee"/>
        <Stat label="شانس کل" value={totalAttempts} color="#94a3b8"/>
        <Stat label="seed به فاینال" value={totalSeeds} color="#f5c84b"/>
      </div>

      <DrawButton compId={c.id} drawn={matchesForComp(c.id).length > 0} regCount={regs.length}/>

      <ResultControls compId={c.id} regs={regs.map(r => ({ id: r.id, userId: r.userId, attempts: r.attempts, seedsEarned: r.seedsEarned, prelimsCompleted: r.prelimsCompleted, userName: getUserById(r.userId)?.name || '?', userTag: getUserById(r.userId)?.tag || '?' }))}/>

      <Link href={`/competitions/${c.id}/bracket`} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', background: '#121821', border: '1px solid #22d3ee', borderRadius: 12, padding: '11px 0', color: '#22d3ee', fontWeight: 700, fontSize: 13 }}>
        مشاهدهٔ براکت کامل ›
      </Link>
    </div>
  )
}
function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 13, padding: '13px 0', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22, color }}>{value}</span>
      <span style={{ fontSize: 10, color: '#64748b' }}>{label}</span>
    </div>
  )
}
