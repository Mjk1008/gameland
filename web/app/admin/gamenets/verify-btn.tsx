'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'

export default function VerifyBtn({ id, verified }: { id: string; verified: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    try {
      await fetch('/api/admin/gamenet-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, verified: !verified }) })
      router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <button onClick={toggle} disabled={busy} style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, fontSize: 13, fontWeight: 700, padding: '0 14px', borderRadius: 11, border: `1px solid ${verified ? C.win : C.line2}`, background: verified ? C.winSoft : C.sf2, color: verified ? C.win : C.tbody, opacity: busy ? 0.6 : 1, flexShrink: 0 }}>
      {verified ? '✓ تأییدشده' : 'تأیید'}
    </button>
  )
}
