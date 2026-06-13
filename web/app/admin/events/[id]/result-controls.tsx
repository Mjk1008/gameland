'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface RegRow { id: string; userId: string; attempts: number; seedsEarned: number; prelimsCompleted: number; userName: string; userTag: string }

export default function ResultControls({ compId, regs }: { compId: string; regs: RegRow[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function record(regId: string, outcome: 'advance' | 'eliminate') {
    setBusyId(regId)
    try {
      const res = await fetch('/api/admin/result', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compId, regId, outcome }),
      })
      if (!res.ok) { const j = await res.json(); alert(j.error || 'خطا') }
      router.refresh()
    } finally { setBusyId(null) }
  }

  if (regs.length === 0) {
    return <div style={{ padding: '20px 14px', background: '#121821', border: '1px solid #1e293b', borderRadius: 13, fontSize: 12, color: '#64748b', textAlign: 'center' }}>هنوز کسی ثبت‌نام نکرده</div>
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>ورود نتیجه</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {regs.map(r => {
          const remaining = r.attempts - r.prelimsCompleted
          const done = remaining === 0
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', background: '#121821', border: '1px solid #1e293b', borderRadius: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{r.userName}</div>
                <div dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>@{r.userTag} · {r.prelimsCompleted}/{r.attempts} done · {r.seedsEarned} seed</div>
              </div>
              {!done && (
                <>
                  <button disabled={busyId === r.id} onClick={() => record(r.id, 'eliminate')} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '6px 10px', background: '#fb71851a', color: '#fb7185', border: '1px solid #fb718533', borderRadius: 8 }}>حذف</button>
                  <button disabled={busyId === r.id || r.seedsEarned >= 3} onClick={() => record(r.id, 'advance')} style={{ all: 'unset', cursor: r.seedsEarned >= 3 ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, padding: '6px 10px', background: '#f5c84b1a', color: '#f5c84b', border: '1px solid #f5c84b33', borderRadius: 8, opacity: r.seedsEarned >= 3 ? 0.4 : 1 }}>seed</button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
