'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, Button } from '@/components/ui'

export default function LeftoverToggle({ compId, enabled }: { compId: string; enabled: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function toggle(next: boolean) {
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/admin/leftover-toggle', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compId, enabled: next }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      router.refresh()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ flex: 1, fontSize: 12.5, color: C.tbody }}>
          ثبت‌نام بازماندگان: <span style={{ fontWeight: 800, color: enabled ? C.win : C.tmut }}>{enabled ? 'روشن' : 'خاموش'}</span>
        </span>
        <Button type="button" disabled={busy} onClick={() => toggle(!enabled)} style={{ minHeight: 38, padding: '0 16px', fontSize: 12.5, background: enabled ? C.sf2 : C.accent, color: enabled ? C.thi : '#0B0A08' }}>
          {busy ? '…' : enabled ? 'خاموش کن' : 'روشن کن'}
        </Button>
      </div>
      {err && <div style={{ fontSize: 11.5, color: C.live }}>{err}</div>}
    </div>
  )
}
