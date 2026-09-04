'use client'
import { useState } from 'react'
import { C } from '@/components/ui'

export default function CenterToggle({ on }: { on: boolean }) {
  const [value, setValue] = useState(on)
  const [busy, setBusy] = useState(false)
  async function flip() {
    setBusy(true)
    try {
      const next = !value
      const r = await fetch('/api/admin/center', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'toggle', enabled: next }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'ثبت نشد')
      setValue(next)
    } catch (e: any) { alert(e.message) }
    finally { setBusy(false) }
  }
  return (
    <button type="button" disabled={busy} onClick={flip} style={{
      all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 14px', background: C.sf1, border: `1px solid ${value ? C.accent : C.line}`, borderRadius: 12,
    }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>مرکز مسابقات</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: value ? C.accent : C.tmut }}>{value ? 'روشن' : 'خاموش'}</span>
    </button>
  )
}
