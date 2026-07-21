'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'

export default function ResetCompetitionsButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function reset() {
    if (!confirm('همهٔ مسابقات، ثبت‌نام‌ها، براکت‌ها و نتایج پاک می‌شن تا از صفر شروع کنی. گیمرها و عکس‌هاشون می‌مونن. مطمئنی؟')) return
    if (!confirm('این کار برگشت‌ناپذیره. یک‌بار دیگه تأیید کن.')) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/reset-competitions', { method: 'POST' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      setMsg(`پاک شد · ${j.events} مسابقه · ${j.placements} نتیجه — حالا از صفر بساز`)
      router.refresh()
    } catch (e: any) { setMsg(e.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={reset} disabled={busy} style={{ all: 'unset', cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', boxSizing: 'border-box', minHeight: 44, background: C.liveSoft, border: `1px solid ${C.live}`, borderRadius: 11, color: C.live, fontWeight: 700, fontSize: 12.5, opacity: busy ? 0.5 : 1 }}>
        {busy ? 'در حال پاک‌سازی…' : 'پاک‌کردن همهٔ مسابقات (شروع از صفر)'}
      </button>
      {msg && <div style={{ fontSize: 11.5, color: C.tbody, marginTop: 7, textAlign: 'center' }}>{msg}</div>}
    </div>
  )
}
