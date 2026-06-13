'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DrawButton({ compId, drawn, regCount }: { compId: string; drawn: boolean; regCount: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState<{ ok: boolean; text: string } | null>(null)

  async function draw() {
    if (drawn && !confirm('قرعه‌کشی قبلی پاک می‌شه. مطمئنی؟')) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/draw', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compId }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'خطا')
      setMsg({ ok: true, text: `قرعه‌کشی انجام شد · ${j.matchesCreated} مسابقه در ${j.bracketsFilled} براکت` })
      router.refresh()
    } catch (e: any) { setMsg({ ok: false, text: e.message }) }
    finally { setBusy(false) }
  }

  return (
    <div>
      <button onClick={draw} disabled={busy || regCount === 0} style={{ all: 'unset', cursor: regCount === 0 ? 'not-allowed' : 'pointer', display: 'block', width: '100%', textAlign: 'center', background: drawn ? '#121821' : '#f5c84b', border: drawn ? '1px solid #f5c84b' : 'none', color: drawn ? '#f5c84b' : '#0b0f14', fontWeight: 700, fontSize: 14, padding: '12px 0', borderRadius: 12, opacity: busy || regCount === 0 ? 0.5 : 1 }}>
        {busy ? '...' : drawn ? 'قرعه‌کشی مجدد' : 'انجام قرعه‌کشی'}
      </button>
      {msg && <div style={{ marginTop: 8, fontSize: 12, color: msg.ok ? '#34d399' : '#fb7185', background: (msg.ok ? '#34d399' : '#fb7185') + '1a', border: `1px solid ${msg.ok ? '#34d399' : '#fb7185'}33`, padding: 10, borderRadius: 10 }}>{msg.text}</div>}
    </div>
  )
}
