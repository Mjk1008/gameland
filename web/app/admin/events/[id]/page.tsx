import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getEvent, registrationsForComp, approvedRegistrationsForComp, getUserById, matchesForComp, placementsForComp, prelimGroupKeys, getEventConfig, qualifyKey, getCompetition, incompleteTeamsForComp, seatableTeamsForComp, currentTeamMembers, allGamenets, hasEventCover, isTeamPartnerReg } from '@/lib/store'
import { computeQualifiers, bracketModeOf, bracketState } from '@/lib/bracket'
import { computeTeamQualifiers } from '@/lib/bracket-team'
import { attemptsForComp, entryIndexForComp } from '@/lib/bracket-dto'
import { DISC } from '@/lib/mock-data'
import { C, Num, StatusChip, GameBadge } from '@/components/ui'
import StatusControl from './status-control'
import FinalizeControls from './finalize-controls'
import RunPanel, { type RunMatch } from './run-panel'
import AddPlayerPanel, { type EmptySlot } from './add-player-panel'
import TournamentPanel, { type BracketInfo } from './tournament-panel'
import DeleteEventButton from './delete-button'
import PrizeEditor from './prize-editor'
import EventCoverPanel from './event-cover-panel'

export const dynamic = 'force-dynamic'

export default function AdminEventPage({ params }: { params: { id: string } }) {
  const c = getEvent(params.id)
  if (!c) return notFound()
  const parent = c.competitionId ? getCompetition(c.competitionId) : undefined

  const allRegs = registrationsForComp(c.id)
  const pendingCount = allRegs.filter(r => r.status === 'pending').length
  // Drop a 2v2 partner's mirrored row from the counts — a team's سهم total
  // is the captain's row; the mirror would double it.
  const regs = approvedRegistrationsForComp(c.id).filter(r => !isTeamPartnerReg(r))
  const totalAttempts = regs.reduce((s, r) => s + r.attempts, 0)
  const cfg = getEventConfig(c.id)
  const isTeamEvent = cfg.teamSize === 2
  const soloParticipants = regs.map(r => { const u = getUserById(r.userId); return { id: r.userId, name: u?.name || '?', tag: u?.tag || '?' } })
  const teamParticipants = seatableTeamsForComp(c.id).map(t => {
    const tags = currentTeamMembers(t.id).map(m => getUserById(m.userId)?.tag).filter(Boolean)
    return { id: t.id, name: t.name, subtitle: tags.length ? `@${tags.join(' + @')}` : '۲ عضو' }
  })
  const alreadyFinalized = placementsForComp(c.id).length > 0

  // ── tournament state for the panel ──
  const all = matchesForComp(c.id)
  const drawn = all.length > 0
  // Seat counts must read the team columns on a team event — the user
  // columns (p1UserId/p2UserId) are never set on a team match, so reading
  // them unconditionally would silently show 0 players/seats to the admin
  // deciding whether to draw/assemble (docs/27 §1.4).
  const seatOf = (m: (typeof all)[number], side: 1 | 2) => isTeamEvent ? (side === 1 ? m.p1TeamId : m.p2TeamId) : (side === 1 ? m.p1UserId : m.p2UserId)
  const brackets: BracketInfo[] = []
  for (const gk of prelimGroupKeys(c.id)) {
    const label = gk.split(':')[1] || gk
    const bIdxs = Array.from(new Set(all.filter(m => m.stage === 'prelim' && m.groupKey === gk).map(m => m.bracket))).sort((a, b) => a - b)
    for (const b of bIdxs) {
      const ms = all.filter(m => m.stage === 'prelim' && m.groupKey === gk && m.bracket === b)
      const r1 = ms.filter(m => m.round === Math.min(...ms.map(x => x.round)))
      const players = r1.reduce((s, m) => s + (seatOf(m, 1) ? 1 : 0) + (seatOf(m, 2) ? 1 : 0), 0)
      const done = ms.filter(m => m.status === 'done').length
      brackets.push({ groupKey: gk, groupLabel: label, bracket: b, players, done, total: ms.length, qualify: cfg.qualify[qualifyKey(gk, b)] ?? 2, complete: ms.every(m => m.status === 'done') })
    }
  }
  // ── run-panel: playable + recorded matches (solo events only) ──
  let runMatches: RunMatch[] = []
  if (!isTeamEvent && drawn) {
    const attemptsMap = attemptsForComp(c.id)
    const entryMap = entryIndexForComp(c.id)
    const roundSizes = new Map<string, number>()   // stage|gk|bracket → round-1 match count
    for (const m of all) {
      const k = `${m.stage}|${m.groupKey}|${m.bracket}`
      const first = Math.min(...all.filter(x => x.stage === m.stage && x.groupKey === m.groupKey && x.bracket === m.bracket).map(x => x.round))
      if (m.round === first) roundSizes.set(k, (roundSizes.get(k) ?? 0) + 1)
    }
    const label = (m: (typeof all)[number]) => {
      const k = `${m.stage}|${m.groupKey}|${m.bracket}`
      const rounds = all.filter(x => x.stage === m.stage && x.groupKey === m.groupKey && x.bracket === m.bracket).map(x => x.round)
      const first = Math.min(...rounds)
      const inRound = (roundSizes.get(k) ?? 1) * 2 / Math.pow(2, m.round - first)
      return inRound === 2 ? 'فینال' : inRound === 4 ? 'نیمه‌نهایی' : inRound === 8 ? 'یک‌چهارم' : inRound === 16 ? 'یک‌هشتم' : `مرحلهٔ ${inRound}`
    }
    const player = (uid: string | undefined, mId: string, side: 1 | 2): RunMatch['p1'] => {
      if (!uid) return null
      const u = getUserById(uid)
      return { uid, tag: u?.tag || uid, attempts: attemptsMap.get(uid) ?? 1, entry: entryMap.get(`${mId}:${side}`) }
    }
    runMatches = all
      .filter(m => m.status === 'ready' || m.status === 'done')
      .map(m => ({
        id: m.id, groupKey: m.groupKey, groupLabel: m.groupKey.split(':')[1] || (m.stage === 'final' ? 'فینال' : 'جدول'),
        bracket: m.bracket, round: m.round, slot: m.slot, roundLabel: label(m),
        p1: player(m.p1UserId, m.id, 1), p2: player(m.p2UserId, m.id, 2),
        winnerUid: m.winnerUserId, status: m.status,
        selfMatch: !!m.p1UserId && m.p1UserId === m.p2UserId,
      }))
  }

  // ── empty round-1 slots for manual add (solo events) ──
  let emptySlots: EmptySlot[] = []
  if (!isTeamEvent && drawn) {
    const firstRoundOf = new Map<string, number>()
    for (const m of all) {
      const k = `${m.stage}|${m.groupKey}|${m.bracket}`
      const cur = firstRoundOf.get(k)
      if (cur == null || m.round < cur) firstRoundOf.set(k, m.round)
    }
    emptySlots = all
      .filter(m => m.round === firstRoundOf.get(`${m.stage}|${m.groupKey}|${m.bracket}`))
      .filter(m => !m.p1UserId || !m.p2UserId)
      .map(m => ({
        matchId: m.id, groupKey: m.groupKey,
        groupLabel: m.groupKey.split(':')[1] || (m.stage === 'final' ? 'فینال' : 'جدول'),
        bracket: m.bracket, slot: m.slot,
        filledWith: m.p1UserId ? (getUserById(m.p1UserId)?.tag ? '@' + getUserById(m.p1UserId)!.tag : undefined)
          : m.p2UserId ? (getUserById(m.p2UserId)?.tag ? '@' + getUserById(m.p2UserId)!.tag : undefined) : undefined,
        state: bracketState(c.id, m.groupKey, m.bracket),
      }))
  }

  const qualifierCount = isTeamEvent ? computeTeamQualifiers(c.id).length : computeQualifiers(c.id).length
  const finalExists = all.some(m => m.stage === 'final')
  const finalSeats = new Set(all.filter(m => m.stage === 'final' && m.round === 1).flatMap(m => [seatOf(m, 1), seatOf(m, 2)].filter(Boolean))).size
  const incompleteTeams = isTeamEvent ? incompleteTeamsForComp(c.id) : []
  const gamenetOptions = allGamenets().filter(g => g.status === 'verified').map(g => ({ id: g.id, name: g.name, city: g.city, province: g.province }))

  return (
    <div style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Link href="/admin/events" style={{ fontSize: 12, color: C.tmut, textDecoration: 'none' }}>‹ مسابقات</Link>

      {/* parent event → jump back to add / manage the other disciplines */}
      {parent && (
        <Link href={`/admin/competitions/${parent.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', background: C.accentSoft, border: `1px solid ${C.accent}`, borderRadius: 12 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: C.accent, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>رویداد: {parent.title} — افزودن/مدیریت رشته‌ها</span>
        </Link>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <GameBadge disc={c.disc} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: C.thi }}>{c.title}</div>
          <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 2 }}>{DISC[c.disc as keyof typeof DISC]?.name ?? c.disc}</div>
        </div>
        <StatusChip status={c.status} />
      </div>

      <EventCoverPanel id={c.id} hasCover={hasEventCover(c.id)} />

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

      {/* «تیم‌های ناقص» — non-negotiable (docs/27 §3.3): without this, an admin
          rejecting one person silently kills a paying team with no signal
          anywhere else in the UI. Shown above the draw controls on purpose. */}
      {incompleteTeams.length > 0 && (
        <Card>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, marginBottom: 10 }}>⚠ تیم‌های ناقص ({incompleteTeams.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {incompleteTeams.map(({ team, members }) => (
              <div key={team.id} style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '10px 12px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.thi, marginBottom: 6 }}>{team.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {members.length === 0 && <span style={{ fontSize: 11.5, color: C.tmut }}>عضوی ثبت نشده</span>}
                  {members.map(m => (
                    <div key={m.member.userId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                      <span style={{ color: C.tbody }}>{m.member.slot === 0 ? '(کاپیتان) ' : ''}{m.user ? `@${m.user.tag}` : m.member.userId}</span>
                      <span style={{ color: C.tmut }}>{m.member.status === 'accepted' ? (m.registration?.status ?? 'بدون ثبت‌نام') : m.member.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <TournamentPanel
        compId={c.id} drawn={drawn} regCount={regs.length}
        bracketMode={bracketModeOf(c.id)}
        groupMode={cfg.groupMode} brackets={brackets}
        qualifierCount={qualifierCount} finalExists={finalExists} finalSeats={finalSeats}
        prelimVenues={cfg.prelimVenues} gamenetOptions={gamenetOptions}
      />

      {!isTeamEvent && drawn && <RunPanel compId={c.id} matches={runMatches} />}
      {!isTeamEvent && drawn && <AddPlayerPanel compId={c.id} slots={emptySlots} />}

      <Card><FinalizeControls compId={c.id} mode={isTeamEvent ? 'team' : 'solo'} participants={isTeamEvent ? teamParticipants : soloParticipants} done={alreadyFinalized} /></Card>

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
