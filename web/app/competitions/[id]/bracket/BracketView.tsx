'use client'
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { C, DISP } from '@/components/ui'
import { track } from '@/lib/track'
import { cancelledSlotKey, leftoverFillOpen, restColor } from '@/lib/bracket-slots'
import RadialBracket from './RadialBracket'
import MatchSheet, { roundLabel } from './MatchSheet'

// ── types coming from the server ──
// restFill: true only for a seat fillRestSlot() itself placed (a leftover/
// بازماندگان account seated into a rest slot) — drives the admin "حذف"
// button in MatchSheet. Never true for a normally-drawn seed.
export type Player = { uid: string; tag: string; name: string; attempts?: number; entry?: number; slotKind?: 'rest' | 'cancelled'; restIndex?: number; restFill?: boolean } | null
export type MatchDTO = {
  id: string; stage: 'prelim' | 'final'; groupKey: string; bracket: number; round: number; slot: number
  n?: number
  p1: Player; p2: Player; winnerUid?: string; score?: string
  status: 'pending' | 'ready' | 'done'
  cancelled?: boolean
  // Admin "شروع" toggle — set while this match is being played live. Always
  // undefined once status is 'done' (store.ts clears it the moment a result
  // lands). Rendered as a pulse + LIVE badge, admin viewport only.
  liveStartedAt?: number
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
type Props = { matches: MatchDTO[]; meUid?: string; isAdmin?: boolean; canRecord?: boolean; compId: string; venueLabels?: Record<string, string>; schedules?: Record<string, { date?: string; time?: string; note?: string }>; leftovers?: Leftover[]; todayHubEnabled?: boolean }
type Scope = { key: string; label: string; stage: 'prelim' | 'final'; groupKey: string }

// card + layout geometry (in canvas px, before zoom)
const CARD_W = 156, CARD_H = 52, COL_GAP = 54, ROW_H = 70, ROUND_LABEL_H = 28

const roundName = roundLabel

export default function BracketView({ matches, meUid, isAdmin, canRecord, compId, venueLabels, schedules, leftovers, todayHubEnabled }: Props) {
  const [followBusy, setFollowBusy] = useState<string | null>(null)
  async function follow(uid: string) {
    if (followBusy) return
    setFollowBusy(uid)
    try {
      await fetch('/api/today/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'follow', targetUid: uid }) })
    } catch {} finally { setFollowBusy(null) }
  }
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
  // The open sheet is held by ID, not by a copied MatchDTO: the object a card
  // hands over is a snapshot, so a sheet left open across a router.refresh()
  // (or another admin's result landing in the poll) used to keep rendering the
  // pre-result state. Looking it up in `matches` every render means the sheet
  // always shows what the server last said.
  const [selId, setSelId] = useState<string | null>(null)
  const [restSide, setRestSide] = useState<1 | 2 | null>(null)
  // Round tab lives here, not inside RoundsView, so search can jump it to the
  // round holding a hit and so it can be restored after a remount (below).
  const [roundSel, setRoundSel] = useState<number | null>(null)
  // Admin-only: search players/tags or a match number within the currently
  // selected scope+bracket. It LOCATES inside whichever view is open (like
  // ctrl+F) — it must never swap the admin into a different view.
  const [query, setQuery] = useState('')

  const sel = useMemo(() => (selId ? matches.find(m => m.id === selId) ?? null : null), [matches, selId])

  function openMatch(m: MatchDTO, side?: 1 | 2) {
    setSelId(m.id)
    setRestSide(side ?? null)
  }

  const bMatches = useMemo(() => scopeMatches.filter(m => m.bracket === bracket_), [scopeMatches, bracket_])
  const rounds = useMemo(() => Array.from(new Set(bMatches.map(m => m.round))).sort((a, b) => a - b), [bMatches])

  // The radial view has no per-match card to mark and its own pan/zoom model,
  // so the field isn't offered there rather than sitting dead. A scoped
  // 'result_entry' grant searches too — it works the same bracket an admin does.
  const canSearch = (!!isAdmin || !!canRecord) && mode !== 'radial'
  const searching = canSearch && query.trim() !== ''

  const matchQ = (m: MatchDTO, q: string, qDigits: string) => {
    if (qDigits !== '' && m.n != null && String(m.n).includes(qDigits)) return true
    const hay = [m.p1?.name, m.p1?.tag, m.p2?.name, m.p2?.tag].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q)
  }

  // Ordered, not just a set: the field is a find-in-page with ‹ › stepping, so
  // "hit 3 of 7" has to mean a stable position in bracket order.
  const hitList = useMemo(() => {
    if (!searching) return [] as MatchDTO[]
    const q = query.trim().toLowerCase()
    const qDigits = q.replace(/[^\d]/g, '')
    return bMatches.filter(m => matchQ(m, q, qDigits)).sort((a, b) => a.round - b.round || a.slot - b.slot)
  }, [searching, query, bMatches])
  // Views still mark hits by id — cheap membership test while rendering.
  const hits = useMemo(() => (searching ? new Set(hitList.map(m => m.id)) : null), [searching, hitList])

  // Which hit ‹ › is parked on. Reset whenever the query or the bracket under
  // it changes, so the counter never points past the end of a shorter list.
  const [hitIdx, setHitIdx] = useState(0)
  // Bumped only by an explicit ‹ › press — the round tab follows a deliberate
  // step, but is not yanked around while the admin browses tabs by hand.
  const [hitNav, setHitNav] = useState(0)
  useEffect(() => { setHitIdx(0) }, [query, scopeKey, bracket_])
  const hitAt = hitList.length ? hitList[Math.min(hitIdx, hitList.length - 1)] : null
  const stepHit = (d: 1 | -1) => {
    if (hitList.length === 0) return
    setHitIdx(i => (Math.min(i, hitList.length - 1) + d + hitList.length) % hitList.length)
    setHitNav(n => n + 1)
  }

  // ── the same name in OTHER events ──────────────────────────────────────────
  // A player holds سهم in more than one رشته, so the bracket in front of the
  // admin is rarely the only place the name they typed is seated. The list is
  // server-side (this client only ever holds one event's matches) and each chip
  // deep-links onto that event's own seat.
  const [elsewhere, setElsewhere] = useState<{ compId: string; title: string; count: number; matchId: string }[]>([])
  useEffect(() => {
    const q = query.trim()
    if (!canSearch || q.length < 2) { setElsewhere([]); return }
    let cancelled = false
    const t = setTimeout(() => {
      fetch(`/api/admin/bracket-search?q=${encodeURIComponent(q)}&exclude=${encodeURIComponent(compId)}`)
        .then(r => (r.ok ? r.json() : null))
        .then(j => { if (!cancelled && j) setElsewhere(j.events ?? []) })
        .catch(() => {})
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, canSearch, compId])

  // …and in other brackets of THIS event — a player's own سهم are deliberately
  // spread across separate brackets (lib/bracket.ts distributeSeats), so their
  // other seats are never in the one being looked at.
  const hereElsewhere = useMemo(() => {
    if (!searching) return [] as { key: string; label: string; scopeKey: string; bracket: number; matchId: string; round: number; count: number }[]
    const q = query.trim().toLowerCase()
    const qDigits = q.replace(/[^\d]/g, '')
    const by = new Map<string, { key: string; label: string; scopeKey: string; bracket: number; matchId: string; round: number; count: number }>()
    for (const m of matches) {
      const sk = m.stage === 'final' ? 'final' : 'prelim:' + m.groupKey
      if (sk === scopeKey && m.bracket === bracket_) continue
      if (!matchQ(m, q, qDigits)) continue
      const key = sk + '#' + m.bracket
      const row = by.get(key)
      if (row) { row.count++; if (m.round < row.round) { row.round = m.round; row.matchId = m.id } }
      else by.set(key, {
        key,
        label: (m.stage === 'final' ? 'فینال' : m.groupKey.split(':')[1] || m.groupKey) + ` · براکت ${m.bracket}`,
        scopeKey: sk, bracket: m.bracket, matchId: m.id, round: m.round, count: 1,
      })
    }
    return [...by.values()]
  }, [searching, query, matches, scopeKey, bracket_])

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

  // Searching in the rounds view moves the round tab to the round holding the
  // current hit — but only when the round already open has none, so stepping
  // through tabs by hand isn't fought.
  useEffect(() => {
    if (mode !== 'rounds' || !hits || !hitAt) return
    if (bMatches.some(m => m.round === round && hits.has(m.id))) return
    setRoundSel(hitAt.round)
  }, [mode, hits, hitAt, bMatches, round])

  // A ‹ › press IS deliberate, so it overrides the rule above and takes the
  // round tab with it — otherwise "next" would silently land on a hit sitting
  // in a round that isn't on screen.
  useEffect(() => {
    if (hitNav === 0 || mode !== 'rounds' || !hitAt) return
    setRoundSel(hitAt.round)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hitNav])

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
  // Which of the three views someone reads a bracket in is a preference about
  // them, not about this رویداد — an admin who works in «درختی» wants it in
  // every discipline, not to re-pick it once per event. So the view mode is
  // remembered under one shared key while place (scope/bracket/round/search)
  // stays per-compId.
  const MODE_KEY = 'gl:bracket:mode'
  const [restored, setRestored] = useState(!stateKey)
  useEffect(() => {
    if (!stateKey) return
    try {
      const raw = sessionStorage.getItem(stateKey)
      const v = raw ? JSON.parse(raw) : null
      if (v && typeof v === 'object') {
        if (typeof v.scopeKey === 'string') setScopeKey(v.scopeKey)
        if (typeof v.bracket === 'number') setBracket(v.bracket)
        if (typeof v.round === 'number') setRoundSel(v.round)
        if (typeof v.query === 'string') setQuery(v.query)
      }
      const savedMode = sessionStorage.getItem(MODE_KEY) ?? (v && typeof v === 'object' ? v.mode : null)
      if (savedMode === 'rounds' || savedMode === 'tree' || savedMode === 'radial') setMode(savedMode)
    } catch {}
    setRestored(true)
  }, [stateKey])
  useEffect(() => {
    if (!stateKey || !restored) return
    try {
      sessionStorage.setItem(stateKey, JSON.stringify({ scopeKey, bracket: bracket_, round: roundSel, query }))
      sessionStorage.setItem(MODE_KEY, mode)
    } catch {}
  }, [stateKey, restored, scopeKey, bracket_, mode, roundSel, query])

  // ── ?match=<id> — one tap from the روزِ زنده board into this exact match ──
  // The board knows which game is on which station; the bracket knows how to
  // record it. Landing here with a match id moves scope/bracket/round onto it
  // and opens its sheet, so an admin never has to re-find a game they were
  // already looking at. Runs once: after the result is recorded the sheet
  // closes and re-opening it would fight the admin.
  // Read straight off location rather than useSearchParams(), which forces a
  // Suspense boundary on this subtree at build time.
  const deepLinkDone = useRef(false)
  useEffect(() => {
    if (!restored || deepLinkDone.current) return
    let deepLinkId: string | null = null
    let deepLinkQ: string | null = null
    try {
      const sp = new URLSearchParams(window.location.search)
      deepLinkId = sp.get('match')
      deepLinkQ = sp.get('q')
    } catch {}
    if (!deepLinkId) return
    const m = matches.find(x => x.id === deepLinkId)
    if (!m) return
    deepLinkDone.current = true
    // Arriving from a «همچنین تو» chip: keep the name in the field so the
    // admin lands mid-search on the new bracket, not with an empty box.
    if (deepLinkQ) setQuery(deepLinkQ)
    setScopeKey(m.stage === 'final' ? 'final' : 'prelim:' + m.groupKey)
    setBracket(m.bracket)
    setRoundSel(m.round)
    // «دایره‌ای» has no per-match card and so no sheet — landing there from the
    // board would look like the link did nothing.
    setMode(v => (v === 'radial' ? 'rounds' : v))
    setSelId(m.id)
    // Drop ?match= once consumed: recording a result triggers router.refresh(),
    // and Next remounts this subtree on the first one — a param still sitting
    // in the URL would re-open the sheet on the match just decided.
    try { window.history.replaceState(null, '', window.location.pathname) } catch {}
  }, [restored, matches])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {meUid && myBracket === bracket_ && <MyStatusCard bMatches={bMatches} rounds={rounds} meUid={meUid} totalPlayers={totalPlayers} onOpen={openMatch} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {canSearch && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div className="gl-bk-search" style={{ position: 'relative' }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                // Enter / Shift+Enter step the hits, the way find-in-page does
                // on the laptops this view is actually driven from.
                onKeyDown={e => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  stepHit(e.shiftKey ? -1 : 1)
                }}
                placeholder="جستجوی بازیکن یا شماره بازی…"
                style={searchInput}
              />
              {query !== '' && (
                <>
                  <div style={searchNav}>
                    <span className="gl-num" style={{ fontSize: 11.5, fontWeight: 800, color: hitList.length ? C.info : C.live }}>
                      {hitList.length ? `${Math.min(hitIdx, hitList.length - 1) + 1}/${hitList.length}` : 0}
                    </span>
                    <button type="button" disabled={hitList.length < 2} onClick={() => stepHit(-1)} aria-label="قبلی" style={navBtn(hitList.length > 1)}>‹</button>
                    <button type="button" disabled={hitList.length < 2} onClick={() => stepHit(1)} aria-label="بعدی" style={navBtn(hitList.length > 1)}>›</button>
                  </div>
                  <button type="button" onClick={() => setQuery('')} aria-label="پاک کردن جستجو" style={searchClear}>×</button>
                </>
              )}
            </div>
            {/* "همچنین تو…" — the same name seated somewhere else right now,
                in another bracket of this رشته or in another رشته entirely. */}
            {(hereElsewhere.length > 0 || elsewhere.length > 0) && (
              <div className="gl-scroll" style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                <span style={{ flexShrink: 0, fontSize: 11, color: C.tmut }}>همچنین تو:</span>
                {hereElsewhere.map(h => (
                  <button
                    key={h.key}
                    type="button"
                    onClick={() => { setScopeKey(h.scopeKey); setBracket(h.bracket); setRoundSel(h.round); setHitIdx(0); setHitNav(n => n + 1) }}
                    style={alsoChip}
                  >
                    {h.label} <span className="gl-num">{h.count}</span>
                  </button>
                ))}
                {elsewhere.map(e => (
                  <Link key={e.compId} href={`/competitions/${e.compId}/bracket?match=${e.matchId}&q=${encodeURIComponent(query.trim())}`} style={alsoChip}>
                    {e.title} <span className="gl-num">{e.count}</span>
                  </Link>
                ))}
              </div>
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
        ? <RoundsView bMatches={bMatches} rounds={rounds} totalPlayers={totalPlayers} meUid={meUid} myPathOnly={myPathOnly} myPath={myPath} onOpen={openMatch} restPick={isAdmin} round={round} onRound={setRoundSel} hits={hits} focusId={hitAt?.id} focusSeq={hitNav} showLive={isAdmin} />
        : mode === 'tree'
        ? <TreeView bMatches={bMatches} rounds={rounds} meUid={meUid} winPath={winPath} onOpen={openMatch} restPick={isAdmin} hits={hits} focusId={hitAt?.id} focusSeq={hitNav} showLive={isAdmin} />
        : <RadialBracket bMatches={bMatches} rounds={rounds} meUid={meUid} showLive={isAdmin} />}

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
          onClose={() => { setSelId(null); setRestSide(null) }}
          onFollow={todayHubEnabled && meUid ? follow : undefined}
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
function RoundsView({ bMatches, rounds, totalPlayers, meUid, myPathOnly, myPath, onOpen, restPick, round, onRound, hits, focusId, focusSeq, showLive }: {
  bMatches: MatchDTO[]; rounds: number[]; totalPlayers: number
  meUid?: string; myPathOnly: boolean; myPath: Set<string>; onOpen: (m: MatchDTO, side?: 1 | 2) => void
  restPick?: boolean
  round: number; onRound: (r: number) => void
  // focusSeq bumps on every ‹ › press so re-pressing next when the hit list
  // has looped back to the same card still re-scrolls to it.
  hits?: Set<string> | null; focusId?: string; focusSeq?: number
  showLive?: boolean
}) {
  const sel = round
  const playersInRound = (r: number) => totalPlayers / Math.pow(2, rounds.indexOf(r))
  // bring the current hit into view once the tab holding it is open
  const focusRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!focusId) return
    focusRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusId, focusSeq, sel])

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
                <MatchCardRow m={m} meUid={meUid} onOpen={onOpen} restPick={restPick} hit={!!hits?.has(m.id)} focus={m.id === focusId} live={!!showLive && !!m.liveStartedAt} />
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

// `focus` = the hit ‹ › is currently parked on, marked harder than the rest
// of the matches — find-in-page's "this one of the seven", not just "a hit".
function MatchCardRow({ m, meUid, onOpen, restPick, hit, focus, live }: { m: MatchDTO; meUid?: string; onOpen: (m: MatchDTO, side?: 1 | 2) => void; restPick?: boolean; hit?: boolean; focus?: boolean; live?: boolean }) {
  const mine = m.p1?.uid === meUid || m.p2?.uid === meUid
  const doneP1 = m.status === 'done' && !m.cancelled && m.winnerUid === m.p1?.uid
  const doneP2 = m.status === 'done' && !m.cancelled && m.winnerUid === m.p2?.uid

  return (
    <div
      className={live ? 'gl-live-pulse' : undefined}
      style={{ background: C.sf1, border: `1px solid ${hit ? C.info : live ? C.win : mine ? C.accent : C.line}`, borderRadius: 12, overflow: 'hidden', boxShadow: live ? undefined : focus ? `0 0 0 3px ${C.info}` : hit ? `0 0 0 2px ${C.info}55` : mine ? `0 0 0 1px ${C.accent}55` : 'none' }}
    >
      <div onClick={() => onOpen(m)} style={{ cursor: 'pointer' }}>
        <PlayerLine p={m.p1} win={doneP1} lose={m.status === 'done' && !m.cancelled && !doneP1} me={m.p1?.uid === meUid} score={m.score?.split('-')[0]} onRest={restPick && m.p1?.slotKind === 'rest' ? e => { e.stopPropagation(); onOpen(m, 1) } : undefined} />
        <div style={{ height: 1, background: C.line }} />
        <PlayerLine p={m.p2} win={doneP2} lose={m.status === 'done' && !m.cancelled && !doneP2} me={m.p2?.uid === meUid} score={m.score?.split('-')[1]} onRest={restPick && m.p2?.slotKind === 'rest' ? e => { e.stopPropagation(); onOpen(m, 2) } : undefined} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 11px', background: C.ink }}>
          {m.n != null && <span className="gl-num" style={{ fontSize: 10.5, fontWeight: 800, color: C.tmut }}>بازی {m.n}</span>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginInlineStart: 'auto' }}>
            {live && <LiveBadge />}
            <StatusPill status={m.cancelled ? 'cancelled' : m.status} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Small pulsing green "LIVE" badge — admin bracket viewport only, shown while
// an admin has this specific match marked in-progress (Match.liveStartedAt).
function LiveBadge() {
  return (
    <span className="gl-num" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 800, color: C.win, background: C.winSoft, border: `1px solid ${C.win}66`, borderRadius: 5, padding: '2px 6px', letterSpacing: '.03em' }}>
      <span className="gl-live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: C.win }} />
      LIVE
    </span>
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
function TreeView({ bMatches, rounds, meUid, winPath, onOpen, restPick, hits, focusId, focusSeq, showLive }: {
  bMatches: MatchDTO[]; rounds: number[]; meUid?: string; winPath: Set<string>; onOpen: (m: MatchDTO, side?: 1 | 2) => void
  restPick?: boolean
  hits?: Set<string> | null; focusId?: string; focusSeq?: number
  showLive?: boolean
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
  // The canvas already reserves ROUND_LABEL_H for the stage names, but that
  // reserve shrinks with zoom while the sticky strip keeps a readable fixed
  // height — headPad makes up the difference so the first row of cards is
  // never parked underneath it at small zoom.
  const headH = Math.max(ROUND_LABEL_H, ROUND_LABEL_H * scale)
  const headPad = headH - ROUND_LABEL_H * scale

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
    el.scrollTo({ left: p.x * scale - el.clientWidth / 2 + CARD_W / 2, top: p.y * scale + headPad - el.clientHeight / 2, behavior: 'smooth' })
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
      top: Math.max(0, p.y * k + headPad - el.clientHeight / 2),
      behavior: 'smooth',
    })
  }, [focusId, focusSeq, pos])

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
        <div style={{ position: 'relative', width: canvasW * scale, height: canvasH * scale + headPad, direction: 'ltr', flexShrink: 0 }}>
          {/* The drawing is taken OUT of flow so the header strip below can be
              position:sticky against the scroll container. It cannot live inside
              this transformed box: a transform makes the element the containing
              block for sticky/fixed descendants (CLAUDE.md §6), which would pin
              the labels to the canvas — i.e. exactly the scrolling-away they do
              today — instead of to the viewport of the frame. */}
          <div style={{ position: 'absolute', top: headPad, left: 0, width: canvasW, height: canvasH, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
            <Connectors bMatches={bMatches} rounds={rounds} pos={pos} canvasW={canvasW} canvasH={canvasH} meUid={meUid} winPath={winPath} />
            <Nodes bMatches={bMatches} pos={pos} meUid={meUid} onOpen={onOpen} restPick={restPick} hits={hits} focusId={focusId} showLive={showLive} />
          </div>
          <RoundHeaders rounds={rounds} playersInRound={playersInRound} scale={scale} height={headH} />
        </div>
      </div>
    </div>
  )
}

type Pos = Record<string, { x: number; y: number }>

// Stage names stay pinned to the top of the bracket frame while the tree is
// scrolled — scrolling down used to carry «یک‌چهارم نهایی» off screen and leave
// the admin guessing which round they were reading. Sticky (not fixed), so the
// strip still travels sideways with its columns.
//
// Rendered in the scroller's own coordinate space rather than inside the scaled
// canvas: column positions are multiplied by `scale` by hand, and the label
// text keeps a fixed size so it stays readable at 0.3× zoom.
const RoundHeaders = memo(function RoundHeaders({ rounds, playersInRound, scale, height }: { rounds: number[]; playersInRound: (r: number) => number; scale: number; height: number }) {
  return (
    <div
      style={{
        position: 'sticky', top: 0, zIndex: 2,
        height, width: '100%',
        background: C.ink, borderBottom: `1px solid ${C.line}`, boxSizing: 'border-box',
      }}
    >
      {rounds.map((r, ri) => (
        <div
          key={r}
          style={{
            position: 'absolute', left: ri * (CARD_W + COL_GAP) * scale, top: 0, bottom: 0,
            width: CARD_W * scale,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: C.tmut,
            overflow: 'hidden', padding: '0 2px', boxSizing: 'border-box',
          }}
        >
          {/* ellipsis needs a real box — a bare text node in a flex container
              is an anonymous item and would just clip at narrow zoom levels */}
          <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {roundLabel(playersInRound(r))}
          </span>
        </div>
      ))}
    </div>
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

const Nodes = memo(function Nodes({ bMatches, pos, meUid, onOpen, restPick, hits, focusId, showLive }: { bMatches: MatchDTO[]; pos: Pos; meUid?: string; onOpen: (m: MatchDTO, side?: 1 | 2) => void; restPick?: boolean; hits?: Set<string> | null; focusId?: string; showLive?: boolean }) {
  return (
    <>
      {bMatches.map(m => {
        const p = pos[m.id]; if (!p) return null
        const mine = m.p1?.uid === meUid || m.p2?.uid === meUid
        return (
          <div key={m.id} style={{ position: 'absolute', left: p.x, top: p.y - CARD_H / 2, width: CARD_W }}>
            <TreeCard m={m} meUid={meUid} mine={mine} onOpen={onOpen} restPick={restPick} hit={!!hits?.has(m.id)} focus={m.id === focusId} live={!!showLive && !!m.liveStartedAt} />
          </div>
        )
      })}
    </>
  )
})

const TreeCard = memo(function TreeCard({ m, meUid, mine, onOpen, restPick, hit, focus, live }: { m: MatchDTO; meUid?: string; mine: boolean; onOpen: (m: MatchDTO, side?: 1 | 2) => void; restPick?: boolean; hit?: boolean; focus?: boolean; live?: boolean }) {
  const doneP1 = m.status === 'done' && !m.cancelled && m.winnerUid === m.p1?.uid
  const doneP2 = m.status === 'done' && !m.cancelled && m.winnerUid === m.p2?.uid
  return (
    <div
      onClick={() => onOpen(m)}
      className={live ? 'gl-live-pulse' : undefined}
      style={{ cursor: 'pointer', background: C.sf1, border: `1.5px solid ${hit ? C.info : live ? C.win : m.cancelled ? C.live : mine ? C.accent : C.line}`, borderRadius: 9, overflow: 'hidden', fontSize: 11.5, boxShadow: live ? undefined : focus ? `0 0 0 3px ${C.info}, 0 0 16px ${C.info}88` : hit ? `0 0 0 2px ${C.info}66, 0 0 12px ${C.info}55` : mine ? `0 0 10px ${C.accent}44` : 'none', position: 'relative' }}
    >
      {m.cancelled && <div style={{ fontSize: 9, fontWeight: 800, color: C.live, background: C.liveSoft, textAlign: 'center', padding: '2px 0' }}>لغو شده</div>}
      {!m.cancelled && live && (
        <div className="gl-num" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 9, fontWeight: 800, color: C.win, background: C.winSoft, padding: '2px 0' }}>
          <span className="gl-live-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: C.win }} />
          LIVE{m.n != null ? ` · ${m.n}` : ''}
        </div>
      )}
      {m.n != null && !m.cancelled && !live && <div style={{ fontSize: 9, fontWeight: 800, color: C.tmut, textAlign: 'center', padding: '2px 0' }}>بازی {m.n}</div>}
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
  paddingBlock: 10, paddingInlineStart: 34, paddingInlineEnd: 96,
}
// Stays RTL like the rest of the page, so «›» (forward, the app's own "into"
// glyph) sits on the left the way it does on every other row. The n/total
// counter carries .gl-num, which isolates its own LTR direction.
const searchNav: React.CSSProperties = {
  position: 'absolute', insetInlineEnd: 8, top: '50%', transform: 'translateY(-50%)',
  display: 'flex', alignItems: 'center', gap: 2,
}
const navBtn = (on: boolean): React.CSSProperties => ({
  all: 'unset', cursor: on ? 'pointer' : 'default', width: 24, height: 24,
  display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6,
  fontSize: 16, lineHeight: 1, color: on ? C.thi : C.line2, background: on ? C.sf1 : 'transparent',
})
const alsoChip: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
  fontSize: 11, fontWeight: 700, color: C.info, background: C.infoSoft,
  border: `1px solid ${C.info}44`, borderRadius: 999, padding: '5px 10px',
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
