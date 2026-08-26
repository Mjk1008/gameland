'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { C, BackHeader, GameBadge } from '@/components/ui'
import { DISC } from '@/lib/mock-data'
import { arenaStatusLabel, timeAgoFa } from '@/lib/arena-ui'
import { track } from '@/lib/track'

interface Props {
  requestId: string
  requesterId: string
  myId: string
  disc: string
  bestOf: number
  city: string
  province: string
  note: string
  requesterTag: string
  requesterName: string
  status: string
  createdAt: number
  matchId?: string
}

export default function RequestDetailClient(props: Props) {
  const router = useRouter()
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(props.status)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const isOwner = props.myId === props.requesterId

  async function accept() {
    setBusy(true)
    setErr('')
    try {
      const r = await fetch(`/api/arena/requests/${props.requestId}/accept`, { method: 'POST' })
      const j = await r.json()
      if (!r.ok) { setErr(j.error); return }
      track('arena_request_accept', { requestId: props.requestId })
      router.push(`/arena/matches/${j.match.id}`)
    } finally { setBusy(false) }
  }

  async function cancelRequest() {
    setBusy(true)
    setErr('')
    try {
      const r = await fetch(`/api/arena/requests/${props.requestId}/cancel`, { method: 'POST' })
      const j = await r.json()
      if (!r.ok) { setErr(j.error); return }
      setStatus('cancelled')
      router.push('/arena')
    } finally { setBusy(false); setConfirmingCancel(false) }
  }

  return (
    <div className="animate-fade-up">
      <BackHeader title="جزئیات درخواست" href="/arena" />
      <div style={{ padding: '0 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <GameBadge disc={props.disc as any} size={32} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: C.thi }}>@{props.requesterTag}</div>
              <div style={{ fontSize: 12, color: C.tmut }}>{props.requesterName}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: C.tbody, lineHeight: 2 }}>
            <div>{DISC[props.disc as keyof typeof DISC]?.name ?? props.disc} · بهترین از {props.bestOf}</div>
            <div>{props.city} · {props.province}</div>
            <div style={{ fontSize: 11, color: C.tmut }}>{timeAgoFa(props.createdAt)} · {arenaStatusLabel(status)}</div>
            {props.note && <div style={{ marginTop: 6, color: C.thi }}>{props.note}</div>}
          </div>
        </div>

        {props.matchId && (
          <Link href={`/arena/matches/${props.matchId}`} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', padding: 12, background: C.accentSoft, border: `1px solid ${C.accent}`, borderRadius: 12, color: C.accent, fontWeight: 800 }}>
            ادامهٔ بازی ›
          </Link>
        )}

        {!isOwner && status === 'open' && (
          <button type="button" onClick={accept} disabled={busy} style={{
            minHeight: 48, borderRadius: 12, border: 'none', background: C.gold, color: C.ink, fontWeight: 800, fontSize: 14, cursor: 'pointer',
          }}>{busy ? '…' : 'قبول می‌کنم'}</button>
        )}

        {isOwner && status === 'open' && !confirmingCancel && (
          <>
            <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', lineHeight: 2 }}>منتظر قبول حریف…</div>
            <button type="button" onClick={() => setConfirmingCancel(true)} disabled={busy} style={{
              minHeight: 44, borderRadius: 12, border: `1px solid ${C.live}44`, background: 'transparent', color: C.live, fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>لغو درخواست</button>
          </>
        )}

        {isOwner && status === 'open' && confirmingCancel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: `${C.live}11`, border: `1px solid ${C.live}44`, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12.5, color: C.thi, textAlign: 'center' }}>درخواست لغو بشه؟</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setConfirmingCancel(false)} disabled={busy} style={{
                flex: 1, minHeight: 40, borderRadius: 10, border: `1px solid ${C.line2}`, background: 'transparent', color: C.tbody, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
              }}>منصرف شدم</button>
              <button type="button" onClick={cancelRequest} disabled={busy} style={{
                flex: 1, minHeight: 40, borderRadius: 10, border: 'none', background: C.live, color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
              }}>{busy ? '…' : 'آره، لغو کن'}</button>
            </div>
          </div>
        )}

        {err && <div style={{ color: C.live, fontSize: 12 }}>{err}</div>}
      </div>
    </div>
  )
}
