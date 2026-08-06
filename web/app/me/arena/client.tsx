'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { C, BackHeader } from '@/components/ui'
import { arenaStatusLabel } from '@/lib/arena-ui'

interface UserBrief { id: string; name: string; tag: string }
interface MatchRow {
  id: string; status: string
  requester: UserBrief | null; acceptor: UserBrief | null
  request?: { city: string; bestOf: number; disc: string } | null
}
interface OpenRequest {
  id: string; city: string; bestOf: number; disc: string
}

interface ArenaInbox {
  arenaPoints?: number
  openRequest?: OpenRequest
  pendingMatches?: MatchRow[]
  scheduledMatches?: MatchRow[]
  history?: MatchRow[]
}

function actionHint(status: string): string {
  if (status === 'pending_confirm') return 'تأیید بازی لازمه'
  if (status === 'agreed') return 'بوک گیم‌نت و زمان'
  if (status === 'scheduled') return 'ثبت نتیجه بعد از بازی'
  return ''
}

export default function MyArenaClient() {
  const [data, setData] = useState<ArenaInbox | null>(null)

  useEffect(() => {
    fetch('/api/arena/my').then(r => r.json()).then(setData)
  }, [])

  const active = [...(data?.pendingMatches ?? []), ...(data?.scheduledMatches ?? [])]
  const hasAnything = data?.openRequest || active.length > 0 || (data?.history?.length ?? 0) > 0

  return (
    <div className="animate-fade-up">
      <BackHeader title="صندوق میدون" href="/arena" />
      <div style={{ padding: '0 16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data && (
          <div style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>امتیاز میدون: {data.arenaPoints ?? 0}</div>
        )}

        {data?.openRequest && (
          <Link href={`/arena/requests/${data.openRequest.id}`} style={card}>
            <div style={{ fontWeight: 800, color: C.thi }}>درخواست باز من</div>
            <div style={{ fontSize: 11, color: C.tmut }}>{data.openRequest.city} · Bo{data.openRequest.bestOf}</div>
            <div style={{ fontSize: 11, color: C.accent, marginTop: 4 }}>منتظر قبول حریف</div>
          </Link>
        )}

        {active.map(m => {
          const hint = actionHint(m.status)
          return (
            <Link key={m.id} href={`/arena/matches/${m.id}`} style={card}>
              <div style={{ fontWeight: 800, color: C.thi }}>@{m.requester?.tag} vs @{m.acceptor?.tag}</div>
              <div style={{ fontSize: 11, color: C.accent, marginTop: 2 }}>{arenaStatusLabel(m.status)}</div>
              {hint && <div style={{ fontSize: 10, color: C.tmut, marginTop: 4 }}>{hint}</div>}
            </Link>
          )
        })}

        {(data?.history ?? []).slice(0, 10).map(m => (
          <Link key={m.id} href={`/arena/matches/${m.id}`} style={{ ...card, opacity: .85 }}>
            <div style={{ fontWeight: 700, color: C.tbody, fontSize: 13 }}>@{m.requester?.tag} vs @{m.acceptor?.tag}</div>
            <div style={{ fontSize: 11, color: C.tmut }}>{arenaStatusLabel(m.status)}</div>
          </Link>
        ))}

        {!data && <div style={{ textAlign: 'center', color: C.tmut }}>…</div>}

        {data && !hasAnything && (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: C.tbody, lineHeight: 2, fontSize: 13 }}>
            هنوز بازی میدونی نداری.<br />
            <Link href="/arena/new" style={{ color: C.accent, fontWeight: 700, textDecoration: 'none' }}>اولین درخواست رو بذار ›</Link>
          </div>
        )}
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', display: 'block', background: C.sf1, border: `1px solid ${C.line}`,
  borderRadius: 12, padding: '12px 14px',
}
