'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, DISP } from '@/components/ui'

interface RegRow { id: string; userId: string; attempts: number; seedsEarned: number; prelimsCompleted: number; userName: string; userTag: string }

export default function ResultControls({ compId, regs }: { compId: string; regs: RegRow[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function record(regId: string, outcome: 'advance' | 'eliminate') {
    setBusyId(regId)
    try {
      const res = await fetch('/api/admin/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compId, regId, outcome }) })
      if (!res.ok) { const j = await res.json(); alert(j.error || 'خطا') }
      router.refresh()
    } finally { setBusyId(null) }
  }

  if (regs.length === 0) {
    return <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: '4px 0' }}>هنوز کسی ثبت‌نام نکرده.</div>
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.thi, marginBottom: 8 }}>ورود نتیجهٔ مقدماتی</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {regs.map(r => {
          const done = r.attempts - r.prelimsCompleted === 0
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{r.userName}</div>
                <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 2 }}>@{r.userTag} · {r.prelimsCompleted}/{r.attempts} · {r.seedsEarned} seed</div>
              </div>
              {!done && (
                <>
                  <button disabled={busyId === r.id} onClick={() => record(r.id, 'eliminate')} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '6px 10px', background: C.liveSoft, color: C.live, border: `1px solid ${C.live}55`, borderRadius: 8 }}>حذف</button>
                  <button disabled={busyId === r.id || r.seedsEarned >= 3} onClick={() => record(r.id, 'advance')} style={{ all: 'unset', cursor: r.seedsEarned >= 3 ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, padding: '6px 10px', background: C.winSoft, color: C.win, border: `1px solid ${C.win}55`, borderRadius: 8, opacity: r.seedsEarned >= 3 ? 0.4 : 1 }}>seed</button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
