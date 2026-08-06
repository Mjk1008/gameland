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
    if (!confirm('درخواست لغو بشه؟')) return
    setBusy(true)
    setErr('')
    try {
      const r = await fetch(`/api/arena/requests/${props.requestId}/cancel`, { method: 'POST' })
      const j = await r.json()
      if (!r.ok) { setErr(j.error); return }
      setStatus('cancelled')
      router.push('/arena')
    } finally { setBusy(false) }
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
            <div>{DISC[props.disc as keyof typeof DISC]?.name ?? props.disc} · Best of {props.bestOf}</div>
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

        {isOwner && status === 'open' && (
          <>
            <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', lineHeight: 2 }}>منتظر قبول حریف…</div>
            <button type="button" onClick={cancelRequest} disabled={busy} style={{
              minHeight: 44, borderRadius: 12, border: `1px solid #f8717144`, background: 'transparent', color: '#f87171', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>لغو درخواست</button>
          </>
        )}

        {err && <div style={{ color: '#f87171', fontSize: 12 }}>{err}</div>}
      </div>
    </div>
  )
}
