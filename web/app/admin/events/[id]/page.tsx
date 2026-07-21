import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getEvent, registrationsForComp, approvedRegistrationsForComp, getUserById, matchesForComp, placementsForComp, prelimGroupKeys, getEventConfig, qualifyKey } from '@/lib/store'
import { computeQualifiers } from '@/lib/bracket'
import { DISC } from '@/lib/mock-data'
import { C, Num, StatusChip, GameBadge } from '@/components/ui'
import StatusControl from './status-control'
import FinalizeControls from './finalize-controls'
import TournamentPanel, { type BracketInfo } from './tournament-panel'
import DeleteEventButton from './delete-button'
import PrizeEditor from './prize-editor'

export const dynamic = 'force-dynamic'

export default function AdminEventPage({ params }: { params: { id: string } }) {
  const c = getEvent(params.id)
  if (!c) return notFound()

  const allRegs = registrationsForComp(c.id)
  const pendingCount = allRegs.filter(r => r.status === 'pending').length
  const regs = approvedRegistrationsForComp(c.id)
  const totalAttempts = regs.reduce((s, r) => s + r.attempts, 0)
  const participants = regs.map(r => { const u = getUserById(r.userId); return { userId: r.userId, name: u?.name || '?', tag: u?.tag || '?' } })
  const alreadyFinalized = placementsForComp(c.id).length > 0

  // ── tournament state for the panel ──
  const all = matchesForComp(c.id)
  const drawn = all.length > 0
  const cfg = getEventConfig(c.id)
  const brackets: BracketInfo[] = []
  for (const gk of prelimGroupKeys(c.id)) {
    const label = gk.split(':')[1] || gk
    const bIdxs = Array.from(new Set(all.filter(m => m.stage === 'prelim' && m.groupKey === gk).map(m => m.bracket))).sort((a, b) => a - b)
    for (const b of bIdxs) {
      const ms = all.filter(m => m.stage === 'prelim' && m.groupKey === gk && m.bracket === b)
      const r1 = ms.filter(m => m.round === Math.min(...ms.map(x => x.round)))
      const players = r1.reduce((s, m) => s + (m.p1UserId ? 1 : 0) + (m.p2UserId ? 1 : 0), 0)
      const done = ms.filter(m => m.status === 'done').length
      brackets.push({ groupKey: gk, groupLabel: label, bracket: b, players, done, total: ms.length, qualify: cfg.qualify[qualifyKey(gk, b)] ?? 2, complete: ms.every(m => m.status === 'done') })
    }
  }
  const qualifierCount = computeQualifiers(c.id).length
  const finalExists = all.some(m => m.stage === 'final')
  const finalSeats = new Set(all.filter(m => m.stage === 'final' && m.round === 1).flatMap(m => [m.p1UserId, m.p2UserId].filter(Boolean))).size

  return (
    <div style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link href="/admin/events" style={{ fontSize: 12, color: C.tmut, textDecoration: 'none' }}>‹ مسابقات</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <GameBadge disc={c.disc} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: C.thi }}>{c.title}</div>
          <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 2 }}>{DISC[c.disc as keyof typeof DISC]?.name ?? c.disc}</div>
        </div>
        <StatusChip status={c.status} />
      </div>

      <Link href={`/admin/events/${c.id}/edit`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, background: C.sf2, border: `1px solid ${C.line2}`, borderRadius: 12, color: C.thi, fontWeight: 700, fontSize: 13.5 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        ویرایش عنوان، جایزه، ظرفیت، تاریخ، وضعیت…
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
        <Stat label="تاییدشده" value={regs.length} color={C.accent} />
        <Stat label="بلیط کل" value={totalAttempts} color={C.tbody} />
        <Stat label="کوالیفای" value={qualifierCount} color={C.gold} />
      </div>

      {pendingCount > 0 && (
        <Link href="/admin/requests" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: C.accentSoft, border: `1px solid ${C.accent}`, borderRadius: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent }} />
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: C.accent }}>{pendingCount} درخواست منتظر تایید</span>
          <span style={{ color: C.accent }}>›</span>
        </Link>
      )}

      <Card><StatusControl compId={c.id} status={c.status} /></Card>

      <Card><PrizeEditor compId={c.id} prize={c.prize} initialSplit={cfg.prizeSplit ?? []} /></Card>

      <TournamentPanel
        compId={c.id} drawn={drawn} regCount={regs.length}
        groupMode={cfg.groupMode} brackets={brackets}
        qualifierCount={qualifierCount} finalExists={finalExists} finalSeats={finalSeats}
      />

      <Card><FinalizeControls compId={c.id} participants={participants} done={alreadyFinalized} /></Card>

      <div style={{ marginTop: 6, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
        <DeleteEventButton compId={c.id} title={c.title} />
      </div>
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
