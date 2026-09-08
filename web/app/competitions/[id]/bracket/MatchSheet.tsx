'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'
import { leftoverFillOpen } from '@/lib/bracket-slots'
import type { MatchDTO, Player, Leftover } from './BracketView'
import { MatchOps, PlayerPeek, ANNOUNCE } from '@/app/admin/events/[id]/match-ops'

export function roundLabel(playersInRound: number): string {
  switch (playersInRound) {
    case 2:  return 'فینال'
    case 4:  return 'نیمه‌نهایی'
    case 8:  return 'یک‌چهارم نهایی'
    case 16: return 'یک‌هشتم نهایی'
    case 32: return 'مرحلهٔ ۳۲'
    case 64: return 'مرحلهٔ ۶۴'
    case 128: return 'مرحلهٔ ۱۲۸'
    default: return `${playersInRound} نفره`
  }
}

export default function MatchSheet({
  match, roundName, meUid, isAdmin, canRecord, leftovers, restSide, restFillable, onClose, onFollow,
}: {
  match: MatchDTO | null
  roundName?: string
  meUid?: string
  isAdmin?: boolean
  // Scoped 'result_entry' grant — sees only the win/correct buttons below,
  // never peek (phone numbers), rest-fill, cancel or announce.
  canRecord?: boolean
  leftovers?: Leftover[]
  restSide?: 1 | 2 | null
  restFillable?: boolean
  onClose: () => void
  onFollow?: (uid: string) => void
}) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [peek, setPeek] = useState<string | null>(null)
  const [q, setQ] = useState('')
  // Winner uid this sheet just posted, from the API's own response. Until the
  // refreshed bracket confirms it, the sheet stays open and renders the result
  // from here — previously it closed the instant the fetch resolved, so on a
  // slow phone the admin watched the sheet vanish over an unchanged bracket
  // with no way to tell whether the result had actually landed, and re-tapped.
  const [saved, setSaved] = useState<{ winnerUid?: string; cancelled?: boolean } | null>(null)
  // '' = idle, otherwise the announce button that just went through.
  const [sent, setSent] = useState('')
  useEffect(() => setMounted(true), [])
  useEffect(() => { setQ(''); setSaved(null); setSent('') }, [match?.id])
  useEffect(() => {
    if (!match) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [match, onClose])

  // Close only once the server-rendered bracket agrees with what we posted —
  // or, as a backstop, after the refresh has had long enough (a router.refresh
  // that remounts this subtree unmounts the sheet on its own anyway). onClose
  // is an inline arrow in the parent, so it goes through a ref: as a dependency
  // it would restart the timer on every parent render.
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const settled = !!saved && match?.status === 'done' &&
    (saved.cancelled ? !!match?.cancelled : match?.winnerUid === saved.winnerUid)
  useEffect(() => {
    if (!saved) return
    if (settled) { closeRef.current(); return }
    const t = setTimeout(() => closeRef.current(), 4000)
    return () => clearTimeout(t)
  }, [saved, settled])

  // keepOpen: «شروع/پایان لایو» and «بازگردانی» change the match without
  // finishing with it — closing the sheet only to make the admin find the same
  // match again to record it was pure friction. A result closes as before,
  // once the refreshed bracket confirms it.
  async function post(body: object, keepOpen = false) {
    // Belt to the disabled-button brace: two taps landing in the same frame
    // would both pass the `busy` check before React re-rendered.
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ثبت نشد')
      const m = j.match
      if (keepOpen) setSaved(null)
      // winnerTeamId on a 2v2 event — MatchDTO.winnerUid carries either one.
      else if (m && (m.status === 'done' || m.cancelled)) setSaved({ winnerUid: m.winnerUserId ?? m.winnerTeamId, cancelled: !!m.cancelled })
      else onClose()
      router.refresh()
    } catch (e: any) {
      // "نتیجه قبلاً ثبت شده" / "راند بعدی … بازی شده" mean this sheet is looking
      // at stale state — pull the truth in rather than leaving the admin arguing
      // with a bracket that still shows the match as unplayed.
      alert(e.message)
      router.refresh()
    }
    finally { setBusy(false) }
  }
  async function fillRest(userId: string, side: 1 | 2) {
    if (!match || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/bracket-add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId: match.id, side, userId }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'اضافه نشد')
      onClose()
      router.refresh()
    } catch (e: any) { alert(e.message) }
    finally { setBusy(false) }
  }
  async function removeRest(side: 1 | 2) {
    if (!match || busy) return
    if (!confirm('این بازیکن از این جایگاه حذف می‌شه و سهمش برمی‌گرده به بازماندگان. مطمئنی؟')) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/bracket-add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId: match.id, side, remove: true }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'حذف نشد')
      onClose()
      router.refresh()
    } catch (e: any) { alert(e.message) }
    finally { setBusy(false) }
  }
  async function announce(kind: typeof ANNOUNCE[number]['id'], who: 'p1' | 'p2' | 'both') {
    if (!match || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/match-announce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId: match.id, kind, who }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ارسال نشد')
      // This call had no success signal at all — the admin tapped and nothing
      // on screen changed, so the only way to feel sure was to tap again and
      // notify the player twice. A tick on the button that fired is enough.
      setSent(kind)
      setTimeout(() => setSent(s => (s === kind ? '' : s)), 2500)
    } catch (e: any) { alert(e.message) }
    finally { setBusy(false) }
  }

  if (!mounted || !match) return null
  const { p1, p2, score, liveStartedAt } = match
  // While a just-posted result is waiting for the refresh to come back, the
  // sheet shows what the API returned — the winner row turns gold immediately,
  // so "did that save?" is answered before the bracket behind it catches up.
  const winnerUid = saved ? saved.winnerUid : match.winnerUid
  const status = saved ? 'done' : match.status
  const cancelled = saved ? !!saved.cancelled : match.cancelled
  const s1 = score?.split('-')[0]
  const s2 = score?.split('-')[1]
  // Admin "شروع" toggle — both real players seated, not decided/cancelled yet.
  const canGoLive = isAdmin && !cancelled && status !== 'done' && !!p1 && !p1.slotKind && !!p2 && !p2.slotKind
  const isLive = canGoLive && !!liveStartedAt
  const fillSide: 1 | 2 | null = restFillable && isAdmin
    ? (restSide === 1 && p1?.slotKind === 'rest' ? 1 : restSide === 2 && p2?.slotKind === 'rest' ? 2 : p1?.slotKind === 'rest' ? 1 : p2?.slotKind === 'rest' ? 2 : null)
    : null
  const fillLabel = fillSide === 1 ? p1?.name : fillSide === 2 ? p2?.name : null
  const otherUid = fillSide === 1 ? p2?.uid : fillSide === 2 ? p1?.uid : undefined
  const openFill = leftoverFillOpen(match.groupKey)
  const needle = q.trim()
  const fillable = (leftovers ?? []).filter(u => {
    if (u.uid === otherUid) return false
    if (!openFill && u.groupKey && u.groupKey !== match.groupKey) return false
    if (!openFill || !needle) return true
    const prov = (u.groupKey || '').split(':')[1] || ''
    return [u.name, u.tag, '@' + u.tag, prov].some(x => String(x).includes(needle))
  })

  return createPortal(
    <>
    <div
      onClick={onClose}
      // Admin only: on a ≥900px screen this becomes a centred dialog instead of
      // a full-width sheet glued to the bottom of a 1920px monitor. Mobile (any
      // role) and every non-admin keep the bottom sheet exactly as-is.
      className={isAdmin ? 'gl-bk-sheet gl-bk-sheet-wide' : 'gl-bk-sheet'}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
        background: 'rgba(8,6,4,.62)', backdropFilter: 'blur(2px)', animation: 'glbs-fade .16s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="gl-bk-panel"
        style={{
          width: '100%', background: C.sf1,
          padding: '10px 16px calc(20px + env(safe-area-inset-bottom))',
          animation: 'glbs-up .2s cubic-bezier(.16,1,.3,1)', maxHeight: '82vh', overflowY: 'auto',
        }}
      >
        <div style={{ width: 38, height: 4, borderRadius: 3, background: C.line2, margin: '0 auto 14px' }} />
        {canGoLive && (
          <button
            type="button"
            disabled={busy}
            onClick={() => post({ matchId: match.id, live: !isLive }, true)}
            className={isLive ? 'gl-live-pulse' : undefined}
            style={{
              all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              width: '100%', minHeight: 42, borderRadius: 10, marginBottom: 12,
              fontSize: 13, fontWeight: 800, color: isLive ? C.win : '#0B0A08',
              background: isLive ? C.winSoft : C.win, border: `1px solid ${C.win}${isLive ? '66' : ''}`,
            }}
          >
            {isLive && <span className="gl-live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: C.win }} />}
            {isLive ? 'پایان لایو' : 'شروع لایو'}
          </button>
        )}
        {(roundName || match.n != null) && (
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.tmut, textAlign: 'center', marginBottom: 12 }}>
            {match.n != null ? `بازی ${match.n}` : ''}{match.n != null && roundName ? ' · ' : ''}{roundName ?? ''}
          </div>
        )}
        {cancelled && <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: C.live, background: C.liveSoft, borderRadius: 8, padding: '6px 0', marginBottom: 10 }}>لغو شده</div>}
        {isAdmin && !cancelled && !!p1 && p1.uid === p2?.uid && (
          <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: C.tmut, background: C.sf2, borderRadius: 8, padding: '6px 0', marginBottom: 10 }}>خودی</div>
        )}

        <SheetRow p={p1} win={!cancelled && status === 'done' && winnerUid === p1?.uid} lose={!cancelled && status === 'done' && !!p1 && winnerUid !== p1?.uid} me={p1?.uid === meUid} score={s1} onFollow={onFollow} onPeek={isAdmin && p1 && p1.slotKind !== 'rest' && p1.slotKind !== 'cancelled' ? () => setPeek(p1.uid) : undefined} onRemove={isAdmin && p1?.restFill ? () => removeRest(1) : undefined} busy={busy} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '9px 2px' }}>
          <div style={{ flex: 1, height: 1, background: C.line }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: C.tmut }}>vs</span>
          <div style={{ flex: 1, height: 1, background: C.line }} />
        </div>
        <SheetRow p={p2} win={!cancelled && status === 'done' && winnerUid === p2?.uid} lose={!cancelled && status === 'done' && !!p2 && winnerUid !== p2?.uid} me={p2?.uid === meUid} score={s2} onFollow={onFollow} onPeek={isAdmin && p2 && p2.slotKind !== 'rest' && p2.slotKind !== 'cancelled' ? () => setPeek(p2.uid) : undefined} onRemove={isAdmin && p2?.restFill ? () => removeRest(2) : undefined} busy={busy} />

        {fillSide && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.thi }}>بازماندگان{fillLabel ? ` · ${fillLabel}` : ''}</div>
            {openFill && (
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="جستجو"
                style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, fontWeight: 600, color: C.thi, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px', outline: 'none' }}
              />
            )}
            {fillable.length === 0
              ? <div style={{ fontSize: 12, color: C.tmut }}>کسی نیست</div>
              : fillable.map(u => (
                <button
                  key={u.uid}
                  type="button"
                  disabled={busy}
                  onClick={() => fillRest(u.uid, fillSide)}
                  style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px' }}
                >
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.thi, textAlign: 'right' }}>{u.name}</span>
                  {openFill && u.groupKey && <span style={{ fontSize: 11, color: C.tmut }}>{u.groupKey.split(':')[1]}</span>}
                  <span dir="ltr" style={{ fontSize: 11.5, color: C.tmut }}>@{u.tag}</span>
                  <span className="gl-num" style={{ fontSize: 12, fontWeight: 800, color: C.accent }}>×{u.leftover}</span>
                </button>
              ))}
          </div>
        )}

        {(isAdmin || canRecord) && (
          <MatchOps
            p1={p1 ? { uid: p1.uid, name: p1.name, placeholder: !!p1.slotKind } : null}
            p2={p2 ? { uid: p2.uid, name: p2.name, placeholder: !!p2.slotKind } : null}
            cancelled={cancelled} status={status} busy={busy || !!saved}
            restricted={!isAdmin}
            canReopen={isAdmin}
            sent={sent}
            onWin={uid => {
              if (status === 'done' && !confirm('نتیجهٔ ثبت‌شده تغییر می‌کنه. مطمئنی؟')) return
              post({ matchId: match.id, winnerUserId: uid, correct: status === 'done' })
            }}
            onCancelMatch={() => {
              if (!confirm('این مسابقه لغو می‌شه. مطمئنی؟')) return
              post({ matchId: match.id, cancel: true })
            }}
            onReopen={() => {
              if (!confirm('این مسابقه به حالت انجام‌نشده برمی‌گرده و نتیجه/لغوش پاک می‌شه. مطمئنی؟')) return
              post({ matchId: match.id, reopen: true }, true)
            }}
            onAnnounce={announce}
            winnerUid={winnerUid}
          />
        )}
      </div>
      <style>{`
        @keyframes glbs-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes glbs-up { from { transform: translateY(14px); opacity: .4 } to { transform: translateY(0); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { [style*="glbs-"] { animation: none !important } }
      `}</style>
    </div>
    {peek && <PlayerPeek uid={peek} onClose={() => setPeek(null)} />}
    </>,
    document.body,
  )
}

function SheetRow({ p, win, lose, me, score, onFollow, onPeek, onRemove, busy }: {
  p: Player; win: boolean; lose: boolean; me: boolean; score?: string; onFollow?: (uid: string) => void; onPeek?: () => void
  // Admin "حذف" — undo a mistaken بازماندگان fill (Player.restFill only).
  onRemove?: () => void; busy?: boolean
}) {
  return (
    <div onClick={onPeek} style={{
      display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', borderRadius: 12,
      background: win ? C.goldSoft : me ? C.accentSoft : C.sf2,
      border: `1px solid ${win ? `${C.gold}55` : me ? `${C.accent}55` : C.line}`,
      opacity: lose ? 0.62 : 1, cursor: onPeek ? 'pointer' : 'default',
    }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: win ? C.gold : p ? C.line2 : C.line }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: win ? 800 : 700, color: p ? (win ? C.gold : C.thi) : C.tmut, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p ? p.name : '—'}{me ? ' (تو)' : ''}
        </div>
      </div>
      {score != null && score !== '' && (
        <span style={{ fontSize: 16, fontWeight: 800, color: win ? C.gold : C.tbody }}>{score}</span>
      )}
      {p && onFollow && (
        <button onClick={e => { e.stopPropagation(); onFollow(p.uid) }} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.accent, background: C.accentSoft, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: '6px 9px', flexShrink: 0 }}>
          مسیرش
        </button>
      )}
      {p && onRemove && (
        <button disabled={busy} onClick={e => { e.stopPropagation(); onRemove() }} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}44`, borderRadius: 8, padding: '6px 9px', flexShrink: 0 }}>
          حذف
        </button>
      )}
    </div>
  )
}
