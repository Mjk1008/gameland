'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'

// Shown to an invited (not-yet-accepted) partner on the competition page —
// the counterpart to the captain's team-creation flow in register/form.tsx.
export default function TeamInviteBanner({ teamId, teamName, captainTag }: { teamId: string; teamName: string; captainTag?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function respond(action: 'accept' | 'decline') {
    setErr(null); setBusy(action)
    try {
      const res = await fetch(`/api/team/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'انجام نشد، دوباره امتحان کن')
      if (action === 'accept') router.push(`/competitions/${j.registration.compId}/pay`)
      router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(null) }
  }

  return (
    <div style={{ background: C.goldSoft, border: `1px solid ${C.gold}66`, borderRadius: 14, padding: 15, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.thi, lineHeight: 1.9 }}>
        {captainTag ? `@${captainTag} ` : ''}تو رو برای تیمِ «{teamName}» دعوت کرده — قبول کنی، نوبتِ پرداختِ سهمِ خودته.
      </div>
      {err && <div style={{ fontSize: 12, color: C.live }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => respond('decline')} disabled={!!busy} style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 11, color: C.tbody, border: `1px solid ${C.line2}`, fontSize: 13, fontWeight: 700 }}>
          {busy === 'decline' ? '…' : 'ردِ دعوت'}
        </button>
        <button onClick={() => respond('accept')} disabled={!!busy} style={{ all: 'unset', cursor: 'pointer', flex: 2, textAlign: 'center', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 11, background: C.gold, color: '#0B0A08', fontSize: 13.5, fontWeight: 800 }}>
          {busy === 'accept' ? '…' : 'قبولِ دعوت'}
        </button>
      </div>
    </div>
  )
}
