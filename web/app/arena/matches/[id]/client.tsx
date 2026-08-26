'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, BackHeader } from '@/components/ui'
import {
  arenaStatusLabel, canSubmitArenaResult, matchPhaseIndex, MATCH_PHASES,
} from '@/lib/arena-ui'
import type { PlayMatchStatus } from '@/lib/arena'
import { track } from '@/lib/track'

interface UserBrief { id: string; name: string; tag: string }
interface GamenetRow {
  id: string; name: string; city: string; address: string; stations: number
  coverPhotoId: string | null
}
interface MatchDto {
  id: string; status: PlayMatchStatus; requestId: string
  requesterId: string; acceptorId: string
  requester: UserBrief | null; acceptor: UserBrief | null
  bookInitiatorId?: string; gamenetId?: string; scheduledAt?: number
  requesterConfirmedAt?: number; acceptorConfirmedAt?: number
  winnerUserId?: string; request?: { disc: string; bestOf: number; city: string }
  proposedGamenet?: GamenetRow | null
}

interface Props { matchId: string; myId: string }

export default function MatchFlowClient({ matchId, myId }: Props) {
  const router = useRouter()
  const [m, setM] = useState<MatchDto | null>(null)
  const [slots, setSlots] = useState<{ scheduledAt: number; label: string }[]>([])
  const [gamenets, setGamenets] = useState<GamenetRow[]>([])
  const [pickSlot, setPickSlot] = useState<number | null>(null)
  const [pickGn, setPickGn] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [pointsMsg, setPointsMsg] = useState('')
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  async function reload() {
    const r = await fetch(`/api/arena/matches/${matchId}`)
    if (!r.ok) { setM(null); return }
    const j = await r.json()
    setM(j.match)
    setSlots(j.slots ?? [])
    setGamenets(j.gamenets ?? [])
  }

  useEffect(() => { reload() }, [matchId])

  useEffect(() => {
    if (!m || m.status !== 'agreed') return
    if (m.bookInitiatorId && m.bookInitiatorId !== myId && m.gamenetId && m.scheduledAt) {
      setPickGn(m.gamenetId)
      setPickSlot(m.scheduledAt)
    }
  }, [m, myId])

  async function confirmPair() {
    setBusy(true); setErr('')
    try {
      const r = await fetch(`/api/arena/matches/${matchId}/confirm-pair`, { method: 'POST' })
      const j = await r.json()
      if (!r.ok) { setErr(j.error); return }
      track('arena_pair_confirm', { matchId })
      await reload()
    } finally { setBusy(false) }
  }

  async function book() {
    if (!pickGn || pickSlot == null) return
    setBusy(true); setErr('')
    try {
      const r = await fetch(`/api/arena/matches/${matchId}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gamenetId: pickGn, scheduledAt: pickSlot }),
      })
      const j = await r.json()
      if (!r.ok) { setErr(j.error); return }
      if (j.scheduled) track('arena_book_complete', { matchId })
      await reload()
    } finally { setBusy(false) }
  }

  async function result(winnerId: string) {
    setBusy(true); setErr('')
    try {
      const r = await fetch(`/api/arena/matches/${matchId}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerId }),
      })
      const j = await r.json()
      if (!r.ok) { setErr(j.error); return }
      track('arena_result_confirm', { matchId })
      if (j.pointsAwarded) setPointsMsg(`+${j.pointsAwarded} امتیاز میدون`)
      await reload()
    } finally { setBusy(false) }
  }

  async function cancel() {
    setBusy(true); setErr('')
    try {
      const r = await fetch(`/api/arena/matches/${matchId}/cancel`, { method: 'POST' })
      const j = await r.json()
      if (!r.ok) { setErr(j.error); return }
      router.push('/me/arena')
    } finally { setBusy(false); setConfirmingCancel(false) }
  }

  if (!m) return <div style={{ padding: 24, textAlign: 'center', color: C.tmut }}>…</div>

  const opponent = m.requesterId === myId ? m.acceptor : m.requester
  const meConfirmed = m.requesterId === myId ? m.requesterConfirmedAt : m.acceptorConfirmedAt
  const phase = matchPhaseIndex(m.status)
  const canCancel = m.status === 'pending_confirm' || m.status === 'agreed'
  const partnerProposed = m.bookInitiatorId && m.bookInitiatorId !== myId && m.gamenetId && m.scheduledAt
  const proposedGn = gamenets.find(g => g.id === m.gamenetId) ?? m.proposedGamenet
  const showResult = m.status === 'scheduled' && canSubmitArenaResult(m.scheduledAt)

  return (
    <div className="animate-fade-up">
      <BackHeader title="بازی میدون" href="/me/arena" />
      <div style={{ padding: '0 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {phase >= 0 && m.status !== 'cancelled' && (
          <div style={{ display: 'flex', gap: 4 }}>
            {MATCH_PHASES.map((label, i) => (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 3, borderRadius: 2, background: i <= phase ? C.accent : C.line, marginBottom: 4 }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: i <= phase ? C.accent : C.tmut }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14 }}>
          <div style={{ fontWeight: 800, color: C.thi }}>@{m.requester?.tag} vs @{m.acceptor?.tag}</div>
          {m.request && (
            <div style={{ fontSize: 11, color: C.tmut, marginTop: 4 }}>{m.request.city} · Bo{m.request.bestOf}</div>
          )}
          <div style={{ fontSize: 12, color: C.tbody, marginTop: 6 }}>وضعیت: {arenaStatusLabel(m.status)}</div>
        </div>

        {m.status === 'pending_confirm' && !meConfirmed && (
          <button type="button" onClick={confirmPair} disabled={busy} style={btnPrimary}>تأیید بازی</button>
        )}

        {m.status === 'pending_confirm' && meConfirmed && (
          <div style={{ fontSize: 12, color: C.tbody, textAlign: 'center' }}>منتظر تأیید @{opponent?.tag}…</div>
        )}

        {m.status === 'agreed' && (
          <>
            {partnerProposed && proposedGn && (
              <div style={{ background: C.goldSoft, border: `1px solid ${C.gold}44`, borderRadius: 12, padding: '12px 14px', fontSize: 12, color: C.thi, lineHeight: 2 }}>
                @{opponent?.tag} پیشنهاد داده:<br />
                <strong>{proposedGn.name}</strong> · {proposedGn.city}<br />
                {new Date(m.scheduledAt!).toLocaleString('fa-IR')}
              </div>
            )}

            <div style={{ fontSize: 12, fontWeight: 700, color: C.thi }}>گیم‌نت</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {gamenets.map(g => (
                <button key={g.id} type="button" onClick={() => setPickGn(g.id)} style={{
                  textAlign: 'start', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${pickGn === g.id ? C.accent : C.line}`, background: pickGn === g.id ? C.accentSoft : C.sf1,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  {g.coverPhotoId ? (
                    <img src={`/api/gamenet-photo/${g.coverPhotoId}`} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: C.sf2, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: C.thi, fontSize: 13 }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: C.tmut }}>{g.city} · {g.stations} ایستگاه</div>
                    {g.address && <div style={{ fontSize: 10, color: C.tbody, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.address}</div>}
                  </div>
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: C.thi }}>زمان</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {slots.map(s => (
                <button key={s.scheduledAt} type="button" onClick={() => setPickSlot(s.scheduledAt)} style={{
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  border: `1px solid ${pickSlot === s.scheduledAt ? C.gold : C.line}`, background: pickSlot === s.scheduledAt ? C.goldSoft : C.sf1, color: C.thi,
                }}>{s.label}</button>
              ))}
            </div>

            <button type="button" onClick={book} disabled={busy || !pickGn || pickSlot == null} style={btnPrimary}>
              {partnerProposed ? 'تأیید بوک' : 'ثبت بوک'}
            </button>
          </>
        )}

        {showResult && (
          <>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>کی برد؟</div>
            <button type="button" onClick={() => result(myId)} disabled={busy} style={btnGold}>من بردم</button>
            {opponent && (
              <button type="button" onClick={() => result(opponent.id)} disabled={busy} style={btnSecondary}>@{opponent.tag} برد</button>
            )}
          </>
        )}

        {m.status === 'scheduled' && !showResult && m.scheduledAt && (
          <div style={{ fontSize: 12, color: C.tbody, textAlign: 'center', lineHeight: 2 }}>
            بازی {new Date(m.scheduledAt).toLocaleString('fa-IR')} — بعدش نتیجه رو ثبت کنید.
          </div>
        )}

        {m.status === 'confirmed' && (
          <div style={{ textAlign: 'center', padding: 16, color: C.win, lineHeight: 2 }}>
            برنده: {m.winnerUserId === myId ? 'تو 🎉' : `@${opponent?.tag}`}
            {pointsMsg && <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, marginTop: 6 }}>{pointsMsg}</div>}
          </div>
        )}

        {m.status === 'lapsed' && (
          <div style={{ textAlign: 'center', padding: 16, color: C.tmut, lineHeight: 2 }}>
            این بازی بدون نتیجه بسته شد.
          </div>
        )}

        {canCancel && !confirmingCancel && (
          <button type="button" onClick={() => setConfirmingCancel(true)} disabled={busy} style={btnDanger}>انصراف از بازی</button>
        )}
        {canCancel && confirmingCancel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: `${C.live}11`, border: `1px solid ${C.live}44`, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12.5, color: C.thi, textAlign: 'center' }}>مطمئنی؟ این بازی برای هر دو نفر لغو می‌شه.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setConfirmingCancel(false)} disabled={busy} style={btnSecondary}>منصرف شدم</button>
              <button type="button" onClick={cancel} disabled={busy} style={btnDanger}>{busy ? '…' : 'آره، لغو کن'}</button>
            </div>
          </div>
        )}

        {err && <div style={{ color: C.live, fontSize: 12 }}>{err}</div>}
      </div>
    </div>
  )
}

const btnPrimary: React.CSSProperties = { minHeight: 46, borderRadius: 12, border: 'none', background: C.accent, color: C.ink, fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }
const btnGold: React.CSSProperties = { ...btnPrimary, background: C.gold }
const btnSecondary: React.CSSProperties = { ...btnPrimary, background: C.sf1, color: C.thi, border: `1px solid ${C.line2}` }
const btnDanger: React.CSSProperties = { ...btnPrimary, background: 'transparent', color: C.live, border: `1px solid ${C.live}44` }
