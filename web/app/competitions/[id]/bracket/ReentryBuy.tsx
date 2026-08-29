'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'

// Shown on the bracket page when the viewer still has سهم budget left and at
// least one bracket hasn't started (MD-5b). Buying adds unpaid سهم; the user
// then uploads a فیش and the admin approves + seats them.
export default function ReentryBuy({ compId, max }: { compId: string; max: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(1)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  if (max <= 0) return null

  async function buy() {
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/reentry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compId, count }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      setMsg(`${j.added} سهم اضافه شد — حالا از صفحهٔ مسابقه فیش پرداخت رو بارگذاری کن.`)
      router.refresh()
    } catch (e: any) { setMsg(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '11px 13px', marginBottom: 12 }}>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: C.accent }}>
          باختی؟ شانس مجدد بخر →
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ fontSize: 12, color: C.tbody, lineHeight: 1.7 }}>
            سهمِ جدید توی براکت‌های شروع‌نشده جای‌گذاری می‌شه. بعد از خرید، فیش پرداخت رو بارگذاری کن تا ادمین تایید کنه.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: C.tmut }}>تعداد:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button type="button" onClick={() => setCount(c => Math.max(1, c - 1))} style={stepBtn}>−</button>
              <span className="gl-num" style={{ minWidth: 22, textAlign: 'center', fontWeight: 800, color: C.thi }}>{count}</span>
              <button type="button" onClick={() => setCount(c => Math.min(max, c + 1))} style={stepBtn}>+</button>
            </div>
            <span style={{ fontSize: 11, color: C.tmut }}>حداکثر {max}</span>
            <button type="button" disabled={busy} onClick={buy} style={{ all: 'unset', cursor: 'pointer', marginInlineStart: 'auto', fontSize: 12.5, fontWeight: 800, color: '#0B0A08', background: C.accent, borderRadius: 9, padding: '8px 16px' }}>
              {busy ? '…' : 'خرید'}
            </button>
          </div>
          {msg && <div style={{ fontSize: 11.5, color: C.tbody, background: C.sf2, borderRadius: 8, padding: 8 }}>{msg}</div>}
        </div>
      )}
    </div>
  )
}
const stepBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontSize: 17, fontWeight: 700, background: C.sf2, color: C.thi, border: `1px solid ${C.line2}` }
