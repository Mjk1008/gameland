'use client'
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { C, DISP } from '@/components/ui'
import { track } from '@/lib/track'
import { cancelledSlotKey, leftoverFillOpen, restColor } from '@/lib/bracket-slots'
import RadialBracket from './RadialBracket'
import MatchSheet, { roundLabel } from './MatchSheet'

// ── types coming from the server ──
export type Player = { uid: string; tag: string; name: string; attempts?: number; entry?: number; slotKind?: 'rest' | 'cancelled'; restIndex?: number } | null
export type MatchDTO = {
  id: string; stage: 'prelim' | 'final'; groupKey: string; bracket: number; round: number; slot: number
  n?: number
  p1: Player; p2: Player; winnerUid?: string; score?: string
  status: 'pending' | 'ready' | 'done'
  cancelled?: boolean
}

// Small ×N / #k badge — only for accounts holding more than one سهم.
function EntryBadge({ p }: { p: Player }) {
  if (!p || !p.attempts || p.attempts <= 1) return null
  return (
    <span dir="ltr" style={{ fontFamily: DISP, fontSize: 9.5, fontWeight: 800, color: C.gold, background: C.goldSoft, border: `1px solid ${C.gold}44`, borderRadius: 5, padding: '0 4px', marginInlineStart: 5, flexShrink: 0 }}>
      ×{p.attempts}{p.entry && p.entry > 1 ? ` #${p.entry}` : ''}
    </span>
  )
}
export type Leftover = { uid: string; name: string; tag: string; leftover: number; groupKey?: string }
type Props = { matches: MatchDTO[]; meUid?: string; isAdmin?: boolean; canRecord?: boolean; compId: string; venueLabels?: Record<string, string>; schedules?: Record<string, { date?: string; time?: string; note?: string }>; leftovers?: Leftover[] }
type Scope = { key: string; label: string; stage: 'prelim' | 'final'; groupKey: string }

// card + layout geometry (in canvas px, before zoom)
const CARD_W = 156, CARD_H = 52, COL_GAP = 54, ROW_H = 70, ROUND_LABEL_H = 28

const roundName = roundLabel

export default function BracketView({ matches, meUid, isAdmin, canRecord, compId, venueLabels, schedules, leftovers }: Props) {
  const scopes = useMemo<Scope[]>(() => {
    const out: Scope[] = []
    const prelimKeys = Array.from(new Set(matches.filter(m => m.stage === 'prelim').map(m => m.groupKey)))
    for (const gk of prelimKeys) out.push({ key: 'prelim:' + gk, label: gk.split(':')[1] || gk, stage: 'prelim', groupKey: gk })
    if (matches.some(m => m.stage === 'final')) out.push({ key: 'final', label: 'فینال', stage: 'final', groupKey: '' })
    return out
  }, [matches])

  const myScopeKey = useMemo(() => {
    if (meUid) {
      const mine = matches.find(m => m.p1?.uid === meUid || m.p2?.uid === meUid)
      if (mine) return mine.stage === 'final' ? 'final' : 'prelim:' + mine.groupKey
    }
    return scopes.find(s => s.stage === 'final')?.key ?? scopes[0]?.key ?? ''
  }, [matches, meUid, scopes])

  const [scopeKey, setScopeKey] = useState<string>(myScopeKey)
  useEffect(() => { track('bracket_view', { compId }) }, [compId])

  const scope = scopes.find(s => s.key === scopeKey) ?? scopes[0]
  const scopeMatches = useMemo(() => scope ? matches.filter(m => m.stage === scope.stage && m.groupKey === scope.groupKey) : [], [matches, scope])

  const bracketIds = useMemo(() => Array.from(new Set(scopeMatches.map(m => m.bracket))).sort((a, b) => a - b), [scopeMatches])
  const myBracket = useMemo(() => {
    if (!meUid) return null
    const mine = scopeMatches.find(m => m.p1?.uid === meUid || m.p2?.uid === meUid)
    return mine ? mine.bracket : null
  }, [scopeMatches, meUid])

  const [bracket, setBracket] = useState<number>(myBracket ?? bracketIds[0] ?? 0)
  const bracket_ = bracketIds.includes(bracket) ? bracket : (myBracket ?? bracketIds[0] ?? 0)

  // Default: list («مرحله‌ای») for everyone — it never breaks and answers "where am I".
  const [mode, setMode] = useState<'rounds' | 'tree' | 'radial'>('rounds')
  const [myPathOnly, setMyPathOnly] = useState(false)
  const [sel, setSel] = useState<MatchDTO | null>(null)
  const [restSide, setRestSide] = useState<1 | 2 | null>(null)
  // Round tab lives here, not inside RoundsView, so search can jump it to the
  // round holding a hit and so it can be restored after a remount (below).
  const [roundSel, setRoundSel] = useState<number | null>(null)
  // Admin-only: search players/tags or a match number within the currently
  // selected scope+bracket. It LOCATES inside whichever view is open (like
  // ctrl+F) — it must never swap the admin into a different view.
  const [query, setQuery] = useState('')

  function openMatch(m: MatchDTO, side?: 1 | 2) {
    setSel(m)
    setRestSide(side ?? null)
  }

  const bMatches = useMemo(() => scopeMatches.filter(m => m.bracket === bracket_), [scopeMatches, bracket_])
  const rounds = useMemo(() => Array.from(new Set(bMatches.map(m => m.round))).sort((a, b) => a - b), [bMatches])

  // The radial view has no per-match card to mark and its own pan/zoom model,
  // so the field isn't offered there rather than sitting dead.
  const canSearch = !!isAdmin && mode !== 'radial'
  const searching = canSearch && query.trim() !== ''
  // Hits are ids, not a replacement list: every view keeps rendering, and each
  // one marks/jumps to these itself.
  const hits = useMemo(() => {
    if (!searching) return null
    const q = query.trim().toLowerCase()
    const qDigits = q.replace(/[^\d]/g, '')
    const ids = new Set<string>()
    for (const m of bMatches) {
      const numHit = qDigits !== '' && m.n != null && String(m.n).includes(qDigits)
      const hay = [m.p1?.name, m.p1?.tag, m.p2?.name, m.p2?.tag].filter(Boolean).join(' ').toLowerCase()
      if (numHit || hay.includes(q)) ids.add(m.id)
    }
    return ids
  }, [searching, query, bMatches])
  const firstHit = useMemo(() => {
    if (!hits || hits.size === 0) return null
    return bMatches.filter(m => hits.has(m.id)).sort((a, b) => a.round - b.round || a.slot - b.slot)[0] ?? null
  }, [hits, bMatches])
  const maxRound = rounds[rounds.length - 1] ?? 1
  const r1count = bMatches.filter(m => m.round === (rounds[0] ?? 1)).length
  const totalPlayers = r1count * 2

  const myPath = useMemo(() => {
    if (!meUid) return new Set<string>()
    const ids = new Set<string>()
    for (const m of bMatches) if (m.p1?.uid === meUid || m.p2?.uid === meUid) ids.add(m.id)
    return ids
  }, [bMatches, meUid])

  // champion's winning path (match ids) — used to make the tree/connectors legible
  const winPath = useMemo(() => computeWinPath(bMatches, rounds), [bMatches, rounds])

  const seatsInRound = (r: number) => totalPlayers / Math.pow(2, rounds.indexOf(r))
  const round = roundSel != null && rounds.includes(roundSel) ? roundSel : (rounds[0] ?? 1)

  // Searching in the rounds view moves the round tab to the first round that
  // holds a hit — but only when the round already open has none, so stepping
  // through tabs by hand isn't fought.
  useEffect(() => {
    if (mode !== 'rounds' || !hits || !firstHit) return
    if (bMatches.some(m => m.round === round && hits.has(m.id))) return
    setRoundSel(firstHit.round)
  }, [mode, hits, firstHit, bMatches, round])

  // ── keep the admin's place across a router.refresh() ──
  // Next 14's App Router remounts the client subtree on the FIRST
  // router.refresh() after a page load (verified against a production build
  // with a bare useState counter), which is exactly what MatchSheet fires
  // after a result is recorded. Everything below — scope, bracket, view mode,
  // round tab, search — is useState, so that first record threw the admin back
  // to the default scope/round and cleared their search. Mirroring it into
  // sessionStorage survives the remount. Result-entry surfaces only; a player's
  // bracket keeps its "jump to my own match" defaults untouched.
  const stateKey = (isAdmin || canRecord) ? `gl:bracket:${compId}` : null
  const [restored, setRestored] = useState(!stateKey)
  useEffect(() => {
    if (!stateKey) return
    try {
      const raw = sessionStorage.getItem(stateKey)
      const v = raw ? JSON.parse(raw) : null
      if (v && typeof v === 'object') {
        if (typeof v.scopeKey === 'string') setScopeKey(v.scopeKey)
        if (typeof v.bracket === 'number') setBracket(v.bracket)
        if (v.mode === 'rounds' || v.mode === 'tree' || v.mode === 'radial') setMode(v.mode)
        if (typeof v.round === 'number') setRoundSel(v.round)
        if (typeof v.query === 'string') setQuery(v.query)
      }
    } catch {}
    setRestored(true)
  }, [stateKey])
  useEffect(() => {
    if (!stateKey || !restored) return
    try {
      sessionStorage.setItem(stateKey, JSON.stringify({ scopeKey, bracket: bracket_, mode, round: roundSel, query }))
    } catch {}
  }, [stateKey, restored, scopeKey, bracket_, mode, roundSel, query])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {meUid && myBracket === bracket_ && <MyStatusCard bMatches={bMatches} rounds={rounds} meUid={meUid} totalPlayers={totalPlayers} onOpen={openMatch} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {canSearch && (
          <div className="gl-bk-search" style={{ position: 'relative' }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="جستجوی بازیکن یا شماره بازی…"
              style={searchInput}
            />
            {query !== '' && (
              <>
                <span className="gl-num" style={{ ...searchCount, color: hits && hits.size ? C.info : C.live }}>{hits ? hits.size : 0}</span>
                <button type="button" onClick={() => setQuery('')} aria-label="پاک کردن جستجو" style={searchClear}>×</button>
              </>
            )}
          </div>
        )}
        <div className="gl-bk-modes" style={{ display: 'flex', gap: 6 }}>
          {(['rounds', 'tree', 'radial'] as const).map(v => (
            <button key={v} onClick={() => setMode(v)} style={segBtn(mode === v)}>
              {v === 'rounds' ? 'مرحله‌ای' : v === 'tree' ? 'درختی' : 'دایره‌ای'}
            </button>
          ))}
        </div>
        {scopes.length > 1 && (
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
            {scopes.map(s => (
              <button key={s.key} onClick={() => setScopeKey(s.key)} style={{ ...chip(s.key === scopeKey), whiteSpace: 'nowrap' }}>
                {s.stage === 'final' ? '🏆 فینال' : s.label}{s.key === (meUid ? myScopeKey : '') ? ' ★' : ''}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {bracketIds.length > 1 && (
            <div style={{ display: 'flex', gap: 5, overflowX: 'auto', flex: 1 }}>
              {bracketIds.map(b => (
                <button key={b} onClick={() => setBracket(b)} style={chip(b === bracket_)}>
                  براکت {b}{b === myBracket ? ' ★' : ''}
                </button>
              ))}
            </div>
          )}
          {meUid && myBracket === bracket_ && (
            <button onClick={() => setMyPathOnly(p => !p)} style={chip(myPathOnly)}>مسیر من</button>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.tmut }}>
          {scope?.stage === 'final' ? 'فینال' : scope?.label} · {totalPlayers} نفر · {rounds.length} مرحله
        </div>
        {scope?.stage === 'prelim' && venueLabels?.[scope.groupKey] && (
          <div style={{ fontSize: 11.5, color: C.tbody, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '8px 11px', lineHeight: 1.7 }}>
            📍 {venueLabels[scope.groupKey]}
          </div>
        )}
        {(() => {
          const s = schedules?.[`${scope?.groupKey ?? ''}#${bracket_}`]
          if (!s || (!s.date && !s.time && !s.note)) return null
          return (
            <div style={{ fontSize: 11.5, color: C.tbody, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '8px 11px', lineHeight: 1.7 }}>
              🗓 {[s.date, s.time].filter(Boolean).join(' · ')}{s.note ? ` — ${s.note}` : ''}
            </div>
          )
        })()}
      </div>

      {mode === 'rounds'
        ? <RoundsView bMatches={bMatches} rounds={rounds} totalPlayers={totalPlayers} meUid={meUid} myPathOnly={myPathOnly} myPath={myPath} onOpen={openMatch} restPick={isAdmin} round={round} onRound={setRoundSel} hits={hits} focusId={firstHit?.id} />
        : mode === 'tree'
        ? <TreeView bMatches={bMatches} rounds={rounds} meUid={meUid} winPath={winPath} onOpen={openMatch} restPick={isAdmin} hits={hits} focusId={firstHit?.id} />
        : <RadialBracket bMatches={bMatches} rounds={rounds} meUid={meUid} />}

      {mode !== 'radial' && (
        <MatchSheet
          match={sel}
          roundName={sel ? roundName(seatsInRound(sel.round)) : undefined}
          meUid={meUid}
          isAdmin={isAdmin}
          canRecord={canRecord}
          leftovers={(leftovers ?? []).filter(u => leftoverFillOpen(sel?.groupKey ?? '') || !u.groupKey || u.groupKey === (sel?.groupKey ?? ''))}
          restSide={restSide}
          restFillable={!!isAdmin}
          onClose={() => { setSel(null); setRestSide(null) }}
        />
      )}
    </div>
  )
}

// walk back from the final's winner: the set of match ids on the champion's road
function computeWinPath(bMatches: MatchDTO[], rounds: number[]): Set<string> {
  const ids = new Set<string>()
  if (!rounds.length) return ids
  const finalM = bMatches.find(m => m.round === rounds[rounds.length - 1])
  if (!finalM || finalM.status !== 'done' || !finalM.winnerUid) return ids
  let cur: MatchDTO | null = finalM
  for (let ri = rounds.length - 1; cur && ri >= 0; ri--) {
    ids.add(cur.id)
    if (ri === 0) break
    const w: string | undefined = cur.winnerUid
    const cs: number = cur.slot
    const kids: MatchDTO[] = bMatches.filter(k => k.round === rounds[ri - 1] && (k.slot === cs * 2 || k.slot === cs * 2 + 1))
    cur = kids.find(k => k.status === 'done' && k.winnerUid === w) ?? null
  }
  return ids
}

// ─────────────────────────── MY STATUS (always on top, any mode) ──────────────
function MyStatusCard({ bMatches, rounds, meUid, totalPlayers, onOpen }: {
  bMatches: MatchDTO[]; rounds: number[]; meUid: string; totalPlayers: number; onOpen: (m: MatchDTO) => void
}) {
  const mine = useMemo(
    () => bMatches.filter(m => m.p1?.uid === meUid || m.p2?.uid === meUid).sort((a, b) => a.round - b.round),
    [bMatches, meUid],
  )
  if (!mine.length) return null
  const seatsInRound = (r: number) => totalPlayers / Math.pow(2, rounds.indexOf(r))
  const opp = (m: MatchDTO) => (m.p1?.uid === meUid ? m.p2 : m.p1)

  const next = mine.find(m => m.status !== 'done')
  const last = mine[mine.length - 1]
  const wonLast = last.status === 'done' && last.winnerUid === meUid
  const isFinalRound = last.round === rounds[rounds.length - 1]

  let tone: 'live' | 'gold' | 'out' = 'live'
  let head = ''
  let body: React.ReactNode = null
  let jump: MatchDTO | null = null

  if (next) {
    tone = 'live'
    head = 'بازی بعدی تو'
    const o = opp(next)
    body = <>
      <span style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 800, color: C.thi }}>{o ? o.name : 'حریف نامشخص'}</span>
      <span style={{ color: C.tmut }}> · {roundLabel(seatsInRound(next.round))}</span>
    </>
    jump = next
  } else if (wonLast && isFinalRound) {
    tone = 'gold'; head = 'قهرمان براکت 🏆'
    body = null
  } else {
    tone = 'out'; head = `حذف در ${roundLabel(seatsInRound(last.round))}`
    const o = opp(last)
    body = <>باختی به <span style={{ fontWeight: 800, color: C.tbody }}>{o ? o.name : '—'}</span></>
    jump = last
  }

  const col = tone === 'gold' ? C.gold : tone === 'out' ? C.tmut : C.accent
  const bg = tone === 'gold' ? C.goldSoft : tone === 'out' ? C.sf2 : C.accentSoft

  return (
    <button
      onClick={() => jump && onOpen(jump)}
      style={{
        all: 'unset', cursor: jump ? 'pointer' : 'default', display: 'block',
        background: bg, border: `1px solid ${col}55`, borderRadius: 14, padding: '13px 15px',
        position: 'sticky', top: 'calc(env(safe-area-inset-top) + 8px)', zIndex: 5,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, color: col, marginBottom: body ? 5 : 0 }}>{head}</div>
      {body && <div style={{ fontSize: 13, color: C.tbody, lineHeight: 1.7 }}>{body}</div>}
    </button>
  )
}

// ─────────────────────────── ROUNDS VIEW (mobile-first, never breaks) ─────────
function RoundsView({ bMatches, rounds, totalPlayers, meUid, myPathOnly, myPath, onOpen, restPick, round, onRound, hits, focusId }: {
  bMatches: MatchDTO[]; rounds: number[]; totalPlayers: number
  meUid?: string; myPathOnly: boolean; myPath: Set<string>; onOpen: (m: MatchDTO, side?: 1 | 2) => void
  restPick?: boolean
  round: number; onRound: (r: number) => void
  hits?: Set<string> | null; focusId?: string
}) {
  const sel = round
  const playersInRound = (r: number) => totalPlayers / Math.pow(2, rounds.indexOf(r))
  // bring the first hit into view once the tab holding it is open
  const focusRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!focusId) return
    focusRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusId, sel])

  // "مسیر من" → a vertical timeline of only my matches, in order
  if (myPathOnly && meUid) {
    const mine = bMatches.filter(m => myPath.has(m.id)).sort((a, b) => a.round - b.round)
    if (!mine.length) return <Empty text="تو این براکت بازی‌ای نداری" />
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {mine.map((m, i) => {
          const opp = m.p1?.uid === meUid ? m.p2 : m.p1
          const iWon = m.status === 'done' && m.winnerUid === meUid
          const iLost = m.status === 'done' && !!m.winnerUid && m.winnerUid !== meUid
          const dotCol = iWon ? C.win : iLost ? C.live : C.tmut
          return (
            <div key={m.id} style={{ display: 'flex', gap: 12, minHeight: 60 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: dotCol, marginTop: 6 }} />
                {i < mine.length - 1 && <span style={{ flex: 1, width: 2, background: C.line }} />}
              </div>
              <button onClick={() => onOpen(m)} style={{ all: 'unset', cursor: 'pointer', flex: 1, paddingBottom: 12, minWidth: 0 }}>
                <div style={{ background: C.sf1, border: `1px solid ${iWon ? `${C.win}55` : iLost ? `${C.live}44` : C.line}`, borderRadius: 12, padding: '10px 13px' }}>
                  <div style={{ fontSize: 11, color: C.tmut, marginBottom: 4 }}>{roundLabel(playersInRound(m.round))}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span dir="ltr" style={{ flex: 1, minWidth: 0, fontFamily: DISP, fontWeight: 700, fontSize: 14, color: C.thi, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opp ? opp.name : '—'}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: dotCol }}>
                      {iWon ? 'بردی' : iLost ? 'باختی' : m.status === 'ready' ? 'آماده' : 'در انتظار'}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  let list = bMatches.filter(m => m.round === sel)
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
        {rounds.map(r => (
          <button key={r} onClick={() => onRound(r)} style={{ ...chip(r === sel), whiteSpace: 'nowrap' }}>
            {roundLabel(playersInRound(r))}
            {hits && bMatches.some(m => m.round === r && hits.has(m.id)) && <span style={hitDot} />}
          </button>
        ))}
      </div>
      {list.length === 0
        ? <Empty text="هنوز بازی‌ای اینجا نیست" />
        : (
          <div className="gl-bk-cards">
            {list.map(m => (
              <div key={m.id} ref={m.id === focusId ? focusRef : undefined}>
                <MatchCardRow m={m} meUid={meUid} onOpen={onOpen} restPick={restPick} hit={!!hits?.has(m.id)} />
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ fontSize: 12.5, color: C.tmut, textAlign: 'center', padding: '20px 0' }}>{text}</div>
}

function MatchCardRow({ m, meUid, onOpen, restPick, hit }: { m: MatchDTO; meUid?: string; onOpen: (m: MatchDTO, side?: 1 | 2) => void; restPick?: boolean; hit?: boolean }) {
  const mine = m.p1?.uid === meUid || m.p2?.uid === meUid
  const doneP1 = m.status === 'done' && !m.cancelled && m.winnerUid === m.p1?.uid
  const doneP2 = m.status === 'done' && !m.cancelled && m.winnerUid === m.p2?.uid

  return (
    <div style={{ background: C.sf1, border: `1px solid ${hit ? C.info : mine ? C.accent : C.line}`, borderRadius: 12, overflow: 'hidden', boxShadow: hit ? `0 0 0 2px ${C.info}55` : mine ? `0 0 0 1px ${C.accent}55` : 'none' }}>
      <div onClick={() => onOpen(m)} style={{ cursor: 'pointer' }}>
        <PlayerLine p={m.p1} win={doneP1} lose={m.status === 'done' && !m.cancelled && !doneP1} me={m.p1?.uid === meUid} score={m.score?.split('-')[0]} onRest={restPick && m.p1?.slotKind === 'rest' ? e => { e.stopPropagation(); onOpen(m, 1) } : undefined} />
        <div style={{ height: 1, background: C.line }} />
        <PlayerLine p={m.p2} win={doneP2} lose={m.status === 'done' && !m.cancelled && !doneP2} me={m.p2?.uid === meUid} score={m.score?.split('-')[1]} onRest={restPick && m.p2?.slotKind === 'rest' ? e => { e.stopPropagation(); onOpen(m, 2) } : undefined} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 11px', background: C.ink }}>
          {m.n != null && <span className="gl-num" style={{ fontSize: 10.5, fontWeight: 800, color: C.tmut }}>بازی {m.n}</span>}
          <StatusPill status={m.cancelled ? 'cancelled' : m.status} />
        </div>
      </div>
    </div>
  )
}

function PlayerLine({ p, win, lose, me, score, onRest }: { p: Player; win?: boolean; lose?: boolean; me?: boolean; score?: string; onRest?: (e: React.MouseEvent) => void }) {
  const slotStyle = slotLineStyle(p)
  return (
    <div onClick={onRest} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 11px', background: win ? C.goldSoft : slotStyle?.bg ?? 'transparent', opacity: lose ? 0.5 : 1, cursor: onRest ? 'pointer' : undefined }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: win ? C.gold : p?.slotKind ? slotStyle?.fg : p ? C.line2 : C.line, flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: win ? 800 : p?.slotKind ? 800 : 600, color: p ? (win ? C.gold : slotStyle?.fg ?? C.thi) : C.tmut, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {p ? p.name : '—'}{me ? ' (تو)' : ''}
      </span>
      <EntryBadge p={p} />
      {score != null && score !== '' && <span style={{ fontFamily: DISP, fontSize: 13, fontWeight: 800, color: win ? C.gold : C.tbody }}>{score}</span>}
    </div>
  )
}

function slotLineStyle(p: Player): { fg: string; bg: string } | null {
  if (!p?.slotKind) return null
  if (p.slotKind === 'cancelled') return { fg: C.live, bg: C.liveSoft }
  if (p.slotKind === 'rest' && p.restIndex) return restColor(p.restIndex)
  return null
}

function StatusPill({ status }: { status: MatchDTO['status'] | 'cancelled' }) {
  const map = { done: [C.win, C.winSoft, 'تمام'], ready: [C.accent, C.accentSoft, 'زنده'], pending: [C.tmut, C.sf2, 'انتظار'], cancelled: [C.live, C.liveSoft, 'لغو شده'] } as const
  const [c, s, label] = map[status]
  return <span style={{ fontSize: 10, fontWeight: 700, color: c, background: s, padding: '2px 8px', borderRadius: 6 }}>{label}</span>
}

// ─────────────────────────── TREE VIEW (native scroll, button zoom) ───────────
function TreeView({ bMatches, rounds, meUid, winPath, onOpen, restPick, hits, focusId }: {
  bMatches: MatchDTO[]; rounds: number[]; meUid?: string; winPath: Set<string>; onOpen: (m: MatchDTO, side?: 1 | 2) => void
  restPick?: boolean
  hits?: Set<string> | null; focusId?: string
}) {
  const firstRound = rounds[0] ?? 1
  const totalPlayers = bMatches.filter(m => m.round === firstRound).length * 2
  const playersInRound = (r: number) => totalPlayers / Math.pow(2, rounds.indexOf(r))
  const pos = useMemo(() => {
    const p: Record<string, { x: number; y: number }> = {}
    const yByRound: Record<number, Record<number, number>> = {}
    rounds.forEach((r, ri) => {
      yByRound[r] = {}
      const ms = bMatches.filter(m => m.round === r).sort((a, b) => a.slot - b.slot)
      ms.forEach(m => {
        let y: number
        if (ri === 0) y = m.slot * ROW_H + ROW_H / 2
        else {
          const c1 = yByRound[rounds[ri - 1]]?.[m.slot * 2]
          const c2 = yByRound[rounds[ri - 1]]?.[m.slot * 2 + 1]
          y = c1 != null && c2 != null ? (c1 + c2) / 2 : (c1 ?? c2 ?? m.slot * ROW_H + ROW_H / 2)
        }
        yByRound[r][m.slot] = y
        p[m.id] = { x: ri * (CARD_W + COL_GAP), y: y + ROUND_LABEL_H }
      })
    })
    return p
  }, [bMatches, rounds])

  const canvasW = rounds.length * (CARD_W + COL_GAP) + CARD_W
  const canvasH = (bMatches.filter(m => m.round === firstRound).length) * ROW_H + ROW_H + ROUND_LABEL_H

  const scrollRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const prevScale = useRef(1)
  const zoom = (f: number) => setScale(s => Math.min(1.6, Math.max(0.3, Math.round(s * f * 20) / 20)))

  // keep the viewport centre fixed across a zoom step (fixes the "jumps to a corner" feel)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ratio = scale / prevScale.current
    if (ratio !== 1) {
      const cx = el.scrollLeft + el.clientWidth / 2
      const cy = el.scrollTop + el.clientHeight / 2
      el.scrollLeft = cx * ratio - el.clientWidth / 2
      el.scrollTop = cy * ratio - el.clientHeight / 2
    }
    prevScale.current = scale
  }, [scale])

  const centerMine = () => {
    const el = scrollRef.current
    if (!el) return
    const mine = bMatches.find(m => (m.p1?.uid === meUid || m.p2?.uid === meUid))
    const p = mine && pos[mine.id]
    if (!p) return
    el.scrollTo({ left: p.x * scale - el.clientWidth / 2 + CARD_W / 2, top: p.y * scale - el.clientHeight / 2, behavior: 'smooth' })
  }

  // Search stays inside the tree: centre the first hit instead of swapping the
  // admin out to the flat list. scale is read through a ref so zooming later
  // doesn't yank the view back onto the hit.
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  useEffect(() => {
    const el = scrollRef.current
    const p = focusId ? pos[focusId] : null
    if (!el || !p) return
    const k = scaleRef.current
    el.scrollTo({
      left: Math.max(0, p.x * k - el.clientWidth / 2 + CARD_W / 2),
      top: Math.max(0, p.y * k - el.clientHeight / 2),
      behavior: 'smooth',
    })
  }, [focusId, pos])

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        <button onClick={() => zoom(1.25)} style={zoomBtn} aria-label="بزرگ‌نمایی">+</button>
        <button onClick={() => zoom(0.8)} style={zoomBtn} aria-label="کوچک‌نمایی">−</button>
        <button onClick={() => setScale(1)} style={{ ...zoomBtn, width: 'auto', padding: '0 12px', fontSize: 12 }}>۱۰۰٪</button>
        {meUid && <button onClick={centerMine} style={{ ...zoomBtn, width: 'auto', padding: '0 12px', fontSize: 12, color: C.accent, borderColor: `${C.accent}55`, background: C.accentSoft }}>بازی من</button>}
      </div>
      <div
        ref={scrollRef}
        className="gl-bk-canvas"
        style={{
          width: '100%', overflow: 'auto',
          background: C.ink, border: `1px solid ${C.line}`, borderRadius: 14,
          WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
          // the RTL page would otherwise open this scroller pinned to the far
          // side — force LTR so it starts on round 1 and scrollLeft math is sane
          direction: 'ltr',
        }}
      >
        <div style={{ width: canvasW * scale, height: canvasH * scale, direction: 'ltr', flexShrink: 0 }}>
          <div style={{ width: canvasW, height: canvasH, transform: `scale(${scale})`, transformOrigin: '0 0', position: 'relative' }}>
            <RoundHeaders rounds={rounds} playersInRound={playersInRound} />
            <Connectors bMatches={bMatches} rounds={rounds} pos={pos} canvasW={canvasW} canvasH={canvasH} meUid={meUid} winPath={winPath} />
            <Nodes bMatches={bMatches} pos={pos} meUid={meUid} onOpen={onOpen} restPick={restPick} hits={hits} />
          </div>
        </div>
      </div>
    </div>
  )
}

type Pos = Record<string, { x: number; y: number }>

const RoundHeaders = memo(function RoundHeaders({ rounds, playersInRound }: { rounds: number[]; playersInRound: (r: number) => number }) {
  return (
    <>
      {rounds.map((r, ri) => (
        <div
          key={r}
          style={{
            position: 'absolute', left: ri * (CARD_W + COL_GAP), top: 0,
            width: CARD_W, height: ROUND_LABEL_H,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: C.tmut,
            borderBottom: `1px solid ${C.line}`, boxSizing: 'border-box',
          }}
        >
          {roundLabel(playersInRound(r))}
        </div>
      ))}
    </>
  )
})

const Connectors = memo(function Connectors({ bMatches, rounds, pos, canvasW, canvasH, meUid, winPath }: {
  bMatches: MatchDTO[]; rounds: number[]; pos: Pos; canvasW: number; canvasH: number; meUid?: string; winPath: Set<string>
}) {
  return (
    <svg width={canvasW} height={canvasH} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      {bMatches.map(m => {
        const ri = rounds.indexOf(m.round)
        if (ri === 0) return null
        const me = pos[m.id]; if (!me) return null
        const kids = bMatches.filter(k => k.round === rounds[ri - 1] && (k.slot === m.slot * 2 || k.slot === m.slot * 2 + 1))
        return kids.map(k => {
          const kp = pos[k.id]; if (!kp) return null
          const x1 = kp.x + CARD_W, y1 = kp.y, x2 = me.x, y2 = me.y, midx = (x1 + x2) / 2
          // this child feeds the parent only once it's DECIDED and its winner sits in a parent slot
          const cancelledAdv = k.status === 'done' && !!k.cancelled && (
            m.p1?.uid === cancelledSlotKey(k.id) || m.p2?.uid === cancelledSlotKey(k.id)
          )
          const advanced = (k.status === 'done' && !!k.winnerUid && (k.winnerUid === m.p1?.uid || k.winnerUid === m.p2?.uid)) || cancelledAdv
          const onWin = winPath.has(k.id) && winPath.has(m.id)
          const onMine = meUid && k.winnerUid === meUid && advanced

          if (!advanced) {
            // undecided → a short faint stub that does NOT reach the next round,
            // so a not-yet-won player never looks like they've advanced
            return <path key={m.id + k.id} d={`M${x1},${y1} H${x1 + 16}`} fill="none" stroke={C.line} strokeWidth={1.4} strokeDasharray="2 5" opacity={0.6} />
          }
          const strokeCol = cancelledAdv ? C.live : onMine ? C.accent : onWin ? C.gold : C.line2
          const sw = onMine ? 2.4 : onWin ? 2.2 : 1.5
          return <path key={m.id + k.id} d={`M${x1},${y1} H${midx} V${y2} H${x2}`} fill="none" stroke={strokeCol} strokeWidth={sw} />
        })
      })}
    </svg>
  )
})

const Nodes = memo(function Nodes({ bMatches, pos, meUid, onOpen, restPick, hits }: { bMatches: MatchDTO[]; pos: Pos; meUid?: string; onOpen: (m: MatchDTO, side?: 1 | 2) => void; restPick?: boolean; hits?: Set<string> | null }) {
  return (
    <>
      {bMatches.map(m => {
        const p = pos[m.id]; if (!p) return null
        const mine = m.p1?.uid === meUid || m.p2?.uid === meUid
        return (
          <div key={m.id} style={{ position: 'absolute', left: p.x, top: p.y - CARD_H / 2, width: CARD_W }}>
            <TreeCard m={m} meUid={meUid} mine={mine} onOpen={onOpen} restPick={restPick} hit={!!hits?.has(m.id)} />
          </div>
        )
      })}
    </>
  )
})

const TreeCard = memo(function TreeCard({ m, meUid, mine, onOpen, restPick, hit }: { m: MatchDTO; meUid?: string; mine: boolean; onOpen: (m: MatchDTO, side?: 1 | 2) => void; restPick?: boolean; hit?: boolean }) {
  const doneP1 = m.status === 'done' && !m.cancelled && m.winnerUid === m.p1?.uid
  const doneP2 = m.status === 'done' && !m.cancelled && m.winnerUid === m.p2?.uid
  return (
    <div
      onClick={() => onOpen(m)}
      style={{ cursor: 'pointer', background: C.sf1, border: `1.5px solid ${hit ? C.info : m.cancelled ? C.live : mine ? C.accent : C.line}`, borderRadius: 9, overflow: 'hidden', fontSize: 11.5, boxShadow: hit ? `0 0 0 2px ${C.info}66, 0 0 12px ${C.info}55` : mine ? `0 0 10px ${C.accent}44` : 'none', position: 'relative' }}
    >
      {m.cancelled && <div style={{ fontSize: 9, fontWeight: 800, color: C.live, background: C.liveSoft, textAlign: 'center', padding: '2px 0' }}>لغو شده</div>}
      {m.n != null && !m.cancelled && <div style={{ fontSize: 9, fontWeight: 800, color: C.tmut, textAlign: 'center', padding: '2px 0' }}>بازی {m.n}</div>}
      <TreeSlot p={m.p1} win={doneP1} lose={m.status === 'done' && !m.cancelled && !doneP1} me={m.p1?.uid === meUid} score={m.score?.split('-')[0]} onRest={restPick && m.p1?.slotKind === 'rest' ? e => { e.stopPropagation(); onOpen(m, 1) } : undefined} />
      <div style={{ height: 1, background: C.line }} />
      <TreeSlot p={m.p2} win={doneP2} lose={m.status === 'done' && !m.cancelled && !doneP2} me={m.p2?.uid === meUid} score={m.score?.split('-')[1]} onRest={restPick && m.p2?.slotKind === 'rest' ? e => { e.stopPropagation(); onOpen(m, 2) } : undefined} />
    </div>
  )
})

function TreeSlot({ p, win, lose, me, score, onRest }: { p: Player; win?: boolean; lose?: boolean; me?: boolean; score?: string; onRest?: (e: React.MouseEvent) => void }) {
  const slotStyle = slotLineStyle(p)
  return (
    <div onClick={onRest} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: win ? C.goldSoft : me ? C.accentSoft : slotStyle?.bg ?? 'transparent', opacity: lose ? 0.45 : 1, cursor: onRest ? 'pointer' : undefined }}>
      <span style={{ flex: 1, minWidth: 0, fontWeight: win ? 800 : p?.slotKind ? 800 : 600, color: p ? (win ? C.gold : slotStyle?.fg ?? C.thi) : C.tmut, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p ? p.name : '—'}</span>
      <EntryBadge p={p} />
      {score != null && score !== '' && <span style={{ fontFamily: DISP, fontWeight: 800, color: win ? C.gold : C.tbody }}>{score}</span>}
    </div>
  )
}

// ── small styles ──
const segBtn = (on: boolean): React.CSSProperties => ({
  all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 10, fontSize: 12.5, fontWeight: 700,
  background: on ? C.accentSoft : C.sf1, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}`,
})
const chip = (on: boolean): React.CSSProperties => ({
  all: 'unset', cursor: 'pointer', padding: '7px 12px', borderRadius: 9, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
  background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}`,
})
const zoomBtn: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', width: 38, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 9, fontSize: 18, fontWeight: 700, background: C.sf2, color: C.thi, border: `1px solid ${C.line}`,
}
const searchInput: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', fontSize: 13, fontWeight: 600, color: C.thi,
  background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, outline: 'none',
  paddingBlock: 10, paddingInlineStart: 34, paddingInlineEnd: 34,
}
const searchClear: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', position: 'absolute', insetInlineStart: 8, top: '50%', transform: 'translateY(-50%)',
  width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
  color: C.tmut, fontSize: 16, lineHeight: 1,
}
const searchCount: React.CSSProperties = {
  position: 'absolute', insetInlineEnd: 11, top: '50%', transform: 'translateY(-50%)',
  fontSize: 11.5, fontWeight: 800, pointerEvents: 'none',
}
const hitDot: React.CSSProperties = {
  display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: C.info, marginInlineStart: 5, verticalAlign: 'middle',
}
