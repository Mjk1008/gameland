'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'

export type ReentryRow = { regId: string; tag: string; name: string; unpaid: number; hasReceipt?: boolean }

export default function ReentryPanel({ rows }: { rows: ReentryRow[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  if (rows.length === 0) return null

  async function approve(regId: string) {
    setBusy(regId); setMsg(null)
    try {
      const res = await fetch('/api/admin/reentry-approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regId }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      setMsg(j.placed > 0 ? `جای‌گذاری شد در براکت‌های ${j.brackets.join('، ')}` : 'تایید شد — جای خالی نبود، دستی اضافه کن')
      router.refresh()
    } catch (e: any) { setMsg(e.message) }
    finally { setBusy(null) }
  }

  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.gold}44`, borderRadius: 14, padding: 15 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.gold, marginBottom: 10 }}>شانس مجدد — در انتظار تأیید فیش</div>
      {msg && <div style={{ fontSize: 12, color: C.tbody, background: C.sf2, borderRadius: 8, padding: 8, marginBottom: 8 }}>{msg}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map(r => (
          <div key={r.regId} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.ink, border: `1px solid ${C.line}`, borderRadius: 10, padding: '9px 11px' }}>
            <span style={{ flex: 1, fontSize: 12.5, color: C.thi }} dir="ltr">@{r.tag}</span>
            <span style={{ fontSize: 11, color: C.tmut }}>{r.name} · {r.unpaid} سهم</span>
            {r.hasReceipt && (
              <a href={`/api/admin/receipt/${r.regId}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, fontWeight: 700, color: C.accent, textDecoration: 'none' }}>فیش ›</a>
            )}
            <button type="button" disabled={busy === r.regId} onClick={() => approve(r.regId)} style={{ all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#08110B', background: C.win, borderRadius: 8, padding: '7px 13px' }}>
              {busy === r.regId ? '…' : 'تأیید'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
