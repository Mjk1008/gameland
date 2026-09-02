'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'

// Low-key on purpose. A collapsed <details> — reducing سهم or withdrawing is
// possible and honest, but not something we put a big button on.
export default function RegManage({ compId, attempts, isTeam, isCaptain }: { compId: string; attempts: number; isTeam: boolean; isCaptain: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  if (isTeam && !isCaptain) return null

  async function call(body: Record<string, unknown>) {
    setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/register/manage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compId, ...body }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      if (j.cancelled) { router.push(`/competitions/${compId}`); router.refresh(); return }
      router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <details style={{ marginTop: 4 }}>
      <summary style={{ cursor: 'pointer', fontSize: 11.5, color: C.tmut, listStyle: 'none', textAlign: 'center', padding: '6px 0' }}>
        مدیریت ثبت‌نام
      </summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10, padding: 13, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12 }}>
        {attempts > 1 && (
          <div>
            <div style={{ fontSize: 11.5, color: C.tbody, marginBottom: 7 }}>کاهشِ سهم به:</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: attempts - 1 }, (_, i) => i + 1).map(n => (
                <button key={n} type="button" disabled={busy}
                  onClick={() => { if (confirm(`سهمت به ${n} کم بشه؟`)) call({ action: 'reduce', attempts: n }) }}
                  style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', height: 38, lineHeight: '38px', borderRadius: 9, fontSize: 14, fontWeight: 700, background: C.sf2, color: C.tbody, border: `1px solid ${C.line}` }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
        <button type="button" disabled={busy}
          onClick={() => { if (confirm('از این مسابقه انصراف بدی؟')) call({ action: 'cancel' }) }}
          style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', fontSize: 11.5, color: C.live, padding: '6px 0', opacity: busy ? 0.5 : 1 }}>
          انصراف از این مسابقه
        </button>
        {err && <div style={{ fontSize: 11, color: C.live }}>{err}</div>}
      </div>
    </details>
  )
}
