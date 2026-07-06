'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'

export default function DrawButton({ compId, drawn, regCount }: { compId: string; drawn: boolean; regCount: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function draw() {
    if (drawn && !confirm('قرعه‌کشی قبلی پاک می‌شه و از نو انجام می‌شه. مطمئنی؟')) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/draw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compId }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'قرعه‌کشی انجام نشد، دوباره امتحان کن')
      setMsg({ ok: true, text: `قرعه‌کشی انجام شد · ${j.matchesCreated} بازی در ${j.bracketsFilled} براکت` })
      router.refresh()
    } catch (e: any) { setMsg({ ok: false, text: e.message }) } finally { setBusy(false) }
  }

  return (
    <div>
      <button onClick={draw} disabled={busy || regCount === 0} style={{ all: 'unset', cursor: regCount === 0 ? 'not-allowed' : 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center', background: drawn ? 'transparent' : C.accent, border: drawn ? `1px solid ${C.accent}` : 'none', color: drawn ? C.accent : C.ink, fontWeight: 700, fontSize: 14, padding: '13px 0', borderRadius: 11, opacity: busy || regCount === 0 ? 0.5 : 1 }}>
        {busy ? 'در حال قرعه‌کشی…' : drawn ? 'قرعه‌کشی مجدد' : 'انجام قرعه‌کشی'}
      </button>
      {msg && <div style={{ marginTop: 8, fontSize: 12, color: msg.ok ? C.win : C.live, background: (msg.ok ? C.winSoft : C.liveSoft), border: `1px solid ${(msg.ok ? C.win : C.live)}55`, padding: 10, borderRadius: 10 }}>{msg.text}</div>}
    </div>
  )
}
