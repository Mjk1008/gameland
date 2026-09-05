'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { C, DISP, Button, GamerAvatar } from '@/components/ui'
import RulesAccordion from './rules-accordion'
import type { MatchDetail } from '@/lib/today-snapshot'

// Structural clone of competitions/[id]/bracket/MatchSheet.tsx's portal /
// backdrop / slide-up pattern, extended with avatars, a station cell, a
// stepped check-in CTA, and the rules accordion — per docs/36 Frame 3.
export default function MatchDetailSheet({ matchId, onClose, onAction, busy }: {
  matchId: string
  onClose: () => void
  onAction: (matchId: string, action: 'here' | 'ready' | 'ref') => void
  busy: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const [detail, setDetail] = useState<MatchDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/today/match/${matchId}`).then(r => r.json()).then(j => { if (!cancelled) setDetail(j.matchId ? j : null) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [matchId])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!mounted) return null

  const meHere = detail?.mySide === 'p1' ? detail.desk.p1Here : detail?.mySide === 'p2' ? detail.desk.p2Here : false
  const meReady = detail?.mySide === 'p1' ? detail.desk.p1Ready : detail?.mySide === 'p2' ? detail.desk.p2Ready : false
  const refPending = !!detail && !!detail.desk.refRequestedAt && !detail.desk.refHandledAt

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', background: 'rgba(8,6,4,.62)', backdropFilter: 'blur(2px)', animation: 'tdbs-fade .16s ease-out' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: C.sf1, borderTop: `1px solid ${C.line2}`, borderRadius: '18px 18px 0 0',
        padding: '10px 16px calc(20px + env(safe-area-inset-bottom))', animation: 'tdbs-up .2s cubic-bezier(.16,1,.3,1)',
        maxHeight: '86vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        <span style={{ width: 38, height: 4, borderRadius: 3, background: C.line2, margin: '0 auto' }} />

        {loading && <div style={{ textAlign: 'center', fontSize: 12.5, color: C.tmut, padding: '20px 0' }}>در حالِ بارگذاری…</div>}

        {!loading && !detail && <div style={{ textAlign: 'center', fontSize: 12.5, color: C.tmut, padding: '20px 0' }}>بازی پیدا نشد</div>}

        {detail && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.thi }}>جزئیاتِ بازی</span>
              <span style={{ fontSize: 11.5, color: C.tmut }}>{detail.roundLabel}</span>
            </div>

            <div style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <PlayerCol p={detail.p1} me={detail.mySide === 'p1'} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 15, color: C.tmut, letterSpacing: '.1em' }}>VS</span>
                <span style={{ width: 1, height: 42, background: C.line2 }} />
              </div>
              <PlayerCol p={detail.p2} me={detail.mySide === 'p2'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <InfoCell label="ایستگاه" value={detail.station ?? '—'} />
              <InfoCell label="دور" value={detail.roundLabel} />
            </div>

            {detail.venueAddress && (
              <div style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, fontSize: 11.5, color: C.tbody, lineHeight: '18px' }}>{detail.venueAddress}</div>
            )}

            {detail.mySide && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {meReady ? (
                  <div style={{ textAlign: 'center', fontSize: 12.5, color: C.tmut, padding: '10px 0' }}>آماده‌ای — منتظرِ شروع</div>
                ) : (
                  <Button kind="primary" disabled={busy} onClick={() => onAction(matchId, meHere ? 'ready' : 'here')}>
                    {meHere ? 'آماده‌ام — پله‌ی ۲' : 'حاضرم — پله‌ی ۱'}
                  </Button>
                )}
                <button disabled={busy || refPending} onClick={() => onAction(matchId, 'ref')} style={{ all: 'unset', boxSizing: 'border-box', textAlign: 'center', padding: 8, fontSize: 12.5, fontWeight: 600, color: refPending ? C.gold : C.tmut, cursor: refPending ? 'default' : 'pointer', alignSelf: 'center' }}>
                  {refPending ? 'درخواستِ داور ارسال شد' : 'درخواستِ داور'}
                </button>
              </div>
            )}

            <RulesAccordion disc={detail.disc} />
          </>
        )}
      </div>
      <style>{`
        @keyframes tdbs-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes tdbs-up { from { transform: translateY(14px); opacity: .4 } to { transform: translateY(0); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { [style*="tdbs-"] { animation: none !important } }
      `}</style>
    </div>,
    document.body,
  )
}

function PlayerCol({ p, me }: { p?: import('@/lib/today-snapshot').MatchDetailPlayer; me: boolean }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {p
        ? <GamerAvatar uid={p.uid} tag={p.tag} hasPhoto={p.hasPhoto} size={54} ring={me ? C.accent : undefined} />
        : <span style={{ width: 54, height: 54, borderRadius: 15, background: C.line, display: 'inline-block' }} />}
      <span style={{ fontSize: 13.5, fontWeight: 700, color: C.thi }}>{p?.name ?? '—'}{me ? ' (تو)' : ''}</span>
      {p && <span dir="ltr" style={{ fontSize: 10.5, color: C.tmut, fontFamily: DISP, letterSpacing: '.08em' }}>@{p.tag}</span>}
      {p?.rank != null && <span style={{ fontSize: 11, color: C.gold, background: C.goldSoft, borderRadius: 999, padding: '3px 9px' }}>رتبه {p.rank}</span>}
    </div>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 12, padding: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: C.tmut }}>{label}</span>
      <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 18, color: C.thi, lineHeight: 1 }}>{value}</span>
    </div>
  )
}
