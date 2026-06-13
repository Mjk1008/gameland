'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const AMOUNTS = [100, 500, 1000, 5000]

export default function TopupButtons() {
  const router = useRouter()
  const [busy, setBusy] = useState<number | null>(null)
  const [err,  setErr]  = useState<string | null>(null)

  async function topup(amount: number) {
    setBusy(amount); setErr(null)
    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'خطا')
      router.refresh()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(null) }
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {AMOUNTS.map(a => (
          <button key={a} disabled={busy !== null} onClick={() => topup(a)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '12px 0', background: '#121821', border: '1px solid #f5c84b44', borderRadius: 11, color: '#f5c84b', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 17, opacity: busy === a ? 0.5 : 1 }} dir="ltr">
            {busy === a ? '...' : `+${a}`}
          </button>
        ))}
      </div>
      {err && <div style={{ marginTop: 9, fontSize: 12, color: '#fb7185', background: '#fb71851a', border: '1px solid #fb718533', padding: 10, borderRadius: 10 }}>{err}</div>}
    </>
  )
}
