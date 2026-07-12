'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'

export default function DeleteEventButton({ compId, title }: { compId: string; title: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function del() {
    if (!confirm(`مسابقهٔ «${title}» و همهٔ داده‌هاش (ثبت‌نام‌ها، براکت‌ها، نتایج) برای همیشه حذف می‌شه. مطمئنی؟`)) return
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/admin/event-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compId }) })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'حذف نشد') }
      router.push('/admin/events'); router.refresh()
    } catch (e: any) { setErr(e.message); setBusy(false) }
  }

  return (
    <div>
      <button onClick={del} disabled={busy} style={{ all: 'unset', cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', boxSizing: 'border-box', minHeight: 46, background: C.liveSoft, border: `1px solid ${C.live}55`, borderRadius: 12, color: C.live, fontWeight: 700, fontSize: 13, opacity: busy ? 0.5 : 1 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
        {busy ? 'در حال حذف…' : 'حذف مسابقه'}
      </button>
      {err && <div style={{ fontSize: 12, color: C.live, marginTop: 8 }}>{err}</div>}
    </div>
  )
}
