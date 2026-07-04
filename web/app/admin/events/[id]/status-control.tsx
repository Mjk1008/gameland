'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STEPS: { key: string; label: string; color: string }[] = [
  { key: 'soon', label: 'به‌زودی',        color: '#94a3b8' },
  { key: 'open', label: 'ثبت‌نام باز',     color: '#34d399' },
  { key: 'live', label: 'در حال برگزاری',  color: '#fb7185' },
  { key: 'done', label: 'پایان‌یافته',     color: '#a78bfa' },
]

export default function StatusControl({ compId, status }: { compId: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function setStatus(next: string) {
    if (next === status) return
    setBusy(next)
    try {
      const res = await fetch('/api/admin/event-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compId, status: next }),
      })
      if (!res.ok) { const j = await res.json(); alert(j.error || 'خطا') }
      router.refresh()
    } finally { setBusy(null) }
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>وضعیت مسابقه</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {STEPS.map(s => {
          const on = status === s.key
          return (
            <button key={s.key} type="button" disabled={busy !== null} onClick={() => setStatus(s.key)}
              style={{ all: 'unset', cursor: on ? 'default' : 'pointer', textAlign: 'center', padding: '10px 0',
                border: `1px solid ${on ? s.color : '#1e293b'}`, borderRadius: 10,
                background: on ? s.color + '22' : '#121821', color: on ? s.color : '#94a3b8',
                fontWeight: 700, fontSize: 12, opacity: busy === s.key ? 0.5 : 1 }}>
              {busy === s.key ? '...' : s.label}
            </button>
          )
        })}
      </div>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 6 }}>ثبت‌نام فقط در حالت «ثبت‌نام باز» ممکن است. تغییر وضعیت به بازیکنان اعلان می‌فرستد.</div>
    </div>
  )
}
