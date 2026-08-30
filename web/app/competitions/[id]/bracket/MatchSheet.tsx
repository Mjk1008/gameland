'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { C, DISP } from '@/components/ui'
import type { MatchDTO, Player } from './BracketView'

// Persian round name from player count in that round.
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

// Tap-to-inspect sheet, portaled to <body> so page transforms can't re-anchor it
// (CLAUDE.md §6 — fixed-position containing-block trap). Shared by tree + radial.
export default function MatchSheet({
  match, roundName, meUid, onClose, onFollow,
}: {
  match: MatchDTO | null
  roundName?: string
  meUid?: string
  onClose: () => void
  onFollow?: (uid: string) => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!match) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [match, onClose])

  if (!mounted || !match) return null
  const { p1, p2, winnerUid, status, score } = match
  const s1 = score?.split('-')[0]
  const s2 = score?.split('-')[1]

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end',
        background: 'rgba(8,6,4,.62)', backdropFilter: 'blur(2px)', animation: 'glbs-fade .16s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: C.sf1, borderTop: `1px solid ${C.line2}`,
          borderRadius: '18px 18px 0 0', padding: '10px 16px calc(20px + env(safe-area-inset-bottom))',
          animation: 'glbs-up .2s cubic-bezier(.16,1,.3,1)', maxHeight: '82vh', overflowY: 'auto',
        }}
      >
        <div style={{ width: 38, height: 4, borderRadius: 3, background: C.line2, margin: '0 auto 14px' }} />
        {roundName && (
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.tmut, textAlign: 'center', marginBottom: 12 }}>{roundName}</div>
        )}

        <SheetRow p={p1} win={status === 'done' && winnerUid === p1?.uid} lose={status === 'done' && !!p1 && winnerUid !== p1?.uid} me={p1?.uid === meUid} score={s1} onFollow={onFollow} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '9px 2px' }}>
          <div style={{ flex: 1, height: 1, background: C.line }} />
          <span style={{ fontFamily: DISP, fontSize: 11, fontWeight: 800, color: C.tmut }}>vs</span>
          <div style={{ flex: 1, height: 1, background: C.line }} />
        </div>
        <SheetRow p={p2} win={status === 'done' && winnerUid === p2?.uid} lose={status === 'done' && !!p2 && winnerUid !== p2?.uid} me={p2?.uid === meUid} score={s2} onFollow={onFollow} />

        <div style={{ marginTop: 14, fontSize: 11.5, color: C.tmut, textAlign: 'center' }}>
          {status === 'done' ? 'این بازی تمام شده' : status === 'ready' ? 'آمادهٔ برگزاری' : 'منتظر مشخص‌شدن حریف'}
        </div>
      </div>
      <style>{`
        @keyframes glbs-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes glbs-up { from { transform: translateY(14px); opacity: .4 } to { transform: translateY(0); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { [style*="glbs-"] { animation: none !important } }
      `}</style>
    </div>,
    document.body,
  )
}

function SheetRow({ p, win, lose, me, score, onFollow }: {
  p: Player; win: boolean; lose: boolean; me: boolean; score?: string; onFollow?: (uid: string) => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', borderRadius: 12,
      background: win ? C.goldSoft : me ? C.accentSoft : C.sf2,
      border: `1px solid ${win ? `${C.gold}55` : me ? `${C.accent}55` : C.line}`,
      opacity: lose ? 0.62 : 1,
    }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: win ? C.gold : p ? C.line2 : C.line }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div dir="ltr" style={{ fontFamily: DISP, fontSize: 16, fontWeight: win ? 800 : 700, color: p ? (win ? C.gold : C.thi) : C.tmut, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p ? p.tag : '—'}{me ? ' (تو)' : ''}
        </div>
        {p?.name && p.name !== p.tag && (
          <div style={{ fontSize: 11, color: C.tmut, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
        )}
      </div>
      {win && <span style={{ fontSize: 10.5, fontWeight: 800, color: C.gold, background: C.goldSoft, borderRadius: 6, padding: '2px 7px' }}>برنده</span>}
      {score != null && score !== '' && (
        <span style={{ fontFamily: DISP, fontSize: 16, fontWeight: 800, color: win ? C.gold : C.tbody }}>{score}</span>
      )}
      {p && onFollow && (
        <button onClick={() => onFollow(p.uid)} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.accent, background: C.accentSoft, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: '6px 9px', flexShrink: 0 }}>
          مسیرش
        </button>
      )}
    </div>
  )
}
