'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'

interface MemberView { name: string; tag: string; isMe: boolean; status: 'invited' | 'accepted' | 'declined'; regStatus?: string }
interface Props { compId: string; compTitle: string; teamId: string; teamName: string; isCaptain: boolean; needsAttention: boolean; members: MemberView[] }

const STATUS_LABEL: Record<string, string> = {
  invited: 'دعوت‌شده', accepted: 'قبول کرده', declined: 'ردکرده',
  pending: 'در انتظارِ تاییدِ ادمین', approved: 'تاییدشده', rejected: 'ثبت‌نامش رد شده',
}

export default function TeamCard({ compId, compTitle, teamId, teamName, isCaptain, needsAttention, members }: Props) {
  const router = useRouter()
  const [replacing, setReplacing] = useState(false)
  const [tag, setTag] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submitReplace() {
    if (!tag.trim()) return
    setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/team/replace-partner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, partnerTag: tag.trim() }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      setReplacing(false); setTag(''); router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ background: C.sf1, border: `1px solid ${needsAttention ? C.gold + '66' : C.line}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Link href={`/competitions/${compId}`} style={{ color: C.thi, fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>{teamName}</Link>
        <span style={{ fontSize: 10.5, color: C.tmut }}>{compTitle}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {members.map(m => (
          <div key={m.tag} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: C.tbody }}>{m.isMe ? 'تو' : `@${m.tag}`}</span>
            <span style={{ color: m.status === 'declined' || m.regStatus === 'rejected' ? C.live : C.tmut }}>
              {m.status === 'accepted' && m.regStatus ? STATUS_LABEL[m.regStatus] ?? m.regStatus : STATUS_LABEL[m.status]}
            </span>
          </div>
        ))}
      </div>
      {isCaptain && needsAttention && !replacing && (
        <button onClick={() => setReplacing(true)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: C.goldSoft, border: `1px solid ${C.gold}55`, color: C.gold, fontSize: 12, fontWeight: 700 }}>
          دعوتِ هم‌تیمیِ جدید
        </button>
      )}
      {replacing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input dir="ltr" value={tag} onChange={e => setTag(e.target.value.replace(/^@/, ''))} placeholder="gamertag"
            style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px', color: C.thi, fontSize: 13, outline: 'none', fontFamily: 'inherit', textAlign: 'left' }} />
          {err && <div style={{ fontSize: 11, color: C.live }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setReplacing(false); setErr(null) }} disabled={busy} style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, color: C.tbody, border: `1px solid ${C.line2}`, fontSize: 12 }}>انصراف</button>
            <button onClick={submitReplace} disabled={busy || !tag.trim()} style={{ all: 'unset', cursor: 'pointer', flex: 2, textAlign: 'center', minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: C.gold, color: '#0B0A08', fontSize: 12, fontWeight: 700, opacity: busy ? .6 : 1 }}>{busy ? '…' : 'دعوت'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
