'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'

const STEPS: { key: string; label: string; color: string }[] = [
  { key: 'soon', label: 'به‌زودی', color: C.tmut },
  { key: 'open', label: 'ثبت‌نام باز', color: C.win },
  { key: 'live', label: 'در حال برگزاری', color: C.live },
  { key: 'done', label: 'پایان‌یافته', color: C.info },
]

export default function StatusControl({ compId, status }: { compId: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function setStatus(next: string) {
    if (next === status) return
    setBusy(next)
    try {
      const res = await fetch('/api/admin/event-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compId, status: next }) })
      if (!res.ok) { const j = await res.json(); alert(j.error || 'تغییر وضعیت انجام نشد، دوباره امتحان کن') }
      router.refresh()
    } finally { setBusy(null) }
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.thi, marginBottom: 10 }}>وضعیت مسابقه</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {STEPS.map(s => {
          const on = status === s.key
          return (
            <button key={s.key} type="button" disabled={busy !== null} onClick={() => setStatus(s.key)}
              style={{ all: 'unset', cursor: on ? 'default' : 'pointer', textAlign: 'center', padding: '10px 0', border: `1px solid ${on ? s.color : C.line}`, borderRadius: 10, background: on ? s.color + '22' : C.sf2, color: on ? s.color : C.tbody, fontWeight: 700, fontSize: 12, opacity: busy === s.key ? 0.5 : 1 }}>
              {busy === s.key ? '…' : s.label}
            </button>
          )
        })}
      </div>
      <div style={{ fontSize: 10, color: C.tmut, marginTop: 6 }}>ثبت‌نام فقط توی حالت «ثبت‌نام باز» ممکنه. با تغییر وضعیت، به بازیکن‌ها اعلان می‌ره.</div>
    </div>
  )
}
