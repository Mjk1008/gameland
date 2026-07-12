'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'

export default function PurgeTestsButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function purge() {
    if (!confirm('همهٔ حساب‌های تستی (@gameland.test) و کل براکت‌های تست پاک می‌شن. حساب‌های واقعی و مسابقه‌ها می‌مونن. ادامه؟')) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/purge-tests', { method: 'POST' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      setMsg(`پاک شد · ${j.users} حساب تستی · ${j.matches} بازی`)
      router.refresh()
    } catch (e: any) { setMsg(e.message) } finally { setBusy(false) }
  }

  return (
    <div>
      <button onClick={purge} disabled={busy} style={{ all: 'unset', cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', boxSizing: 'border-box', minHeight: 44, background: C.liveSoft, border: `1px solid ${C.live}55`, borderRadius: 11, color: C.live, fontWeight: 700, fontSize: 12.5, opacity: busy ? 0.5 : 1 }}>
        {busy ? 'در حال پاک‌سازی…' : 'پاک‌سازی داده‌های تستی'}
      </button>
      {msg && <div style={{ fontSize: 11.5, color: C.tbody, marginTop: 7, textAlign: 'center' }}>{msg}</div>}
    </div>
  )
}
