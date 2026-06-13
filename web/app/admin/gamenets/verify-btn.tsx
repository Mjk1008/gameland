'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
    <button onClick={toggle} disabled={busy} style={{ all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 6, background: verified ? '#34d39922' : '#475569', color: verified ? '#34d399' : '#cbd5e1', opacity: busy ? 0.6 : 1 }}>
      {verified ? '✓ تأییدشده' : 'تأیید'}
    </button>
  )
}
