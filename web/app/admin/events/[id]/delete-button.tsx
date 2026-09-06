'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'

const REACTIVATE_STEPS: { key: string; label: string }[] = [
  { key: 'soon', label: 'به‌زودی' },
  { key: 'open', label: 'ثبت‌نام باز' },
  { key: 'live', label: 'در حال برگزاری' },
  { key: 'done', label: 'پایان‌یافته' },
]

// Only rendered for the super admin (see isSuperAdmin in lib/store.ts) — a
// regular admin/organizer never sees this block at all, on purpose, after an
// admin misclick hard-deleted a live discipline's 357 registrations with no
// way back (2026-09). Three states:
//   - no data yet   → real hard delete (event-delete), same as before.
//   - has data       → "cancel" only (event-cancel): hides the event, keeps
//                       every row, reversible.
//   - already cancelled → reactivate back to a normal status.
export default function DeleteEventButton({ compId, title, status, hasData }: { compId: string; title: string; status: string; hasData: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function post(url: string, body: object, busyKey: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return
    setBusy(busyKey); setErr(null)
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'انجام نشد') }
      if (url.includes('event-delete')) { router.push('/admin/events'); return }
      router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(null) }
  }

  if (status === 'cancelled') {
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.thi, marginBottom: 10 }}>این مسابقه لغو شده — بازفعال‌سازی</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {REACTIVATE_STEPS.map(s => (
            <button key={s.key} type="button" disabled={busy !== null}
              onClick={() => post('/api/admin/event-reactivate', { compId, status: s.key }, s.key)}
              style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'center', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 6px', border: `1px solid ${C.line2}`, borderRadius: 10, background: C.sf2, color: C.tbody, fontWeight: 700, fontSize: 12.5, opacity: busy === s.key ? 0.5 : 1 }}>
              {busy === s.key ? '…' : s.label}
            </button>
          ))}
        </div>
        {err && <div style={{ fontSize: 12, color: C.live, marginTop: 8 }}>{err}</div>}
      </div>
    )
  }

  if (hasData) {
    return (
      <div>
        <button onClick={() => post('/api/admin/event-cancel', { compId }, 'cancel', `مسابقهٔ «${title}» لغو می‌شه — ثبت‌نام‌ها و براکت دست نمی‌خوره، بعداً می‌تونی برش گردونی. مطمئنی؟`)}
          disabled={busy !== null}
          style={{ all: 'unset', cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', boxSizing: 'border-box', minHeight: 46, background: C.goldSoft, border: `1px solid ${C.gold}55`, borderRadius: 12, color: C.gold, fontWeight: 700, fontSize: 13, opacity: busy ? 0.5 : 1 }}>
          {busy === 'cancel' ? 'در حال لغو…' : 'کنسل کردن مسابقه'}
        </button>
        {err && <div style={{ fontSize: 12, color: C.live, marginTop: 8 }}>{err}</div>}
      </div>
    )
  }

  return (
    <div>
      <button onClick={() => post('/api/admin/event-delete', { compId }, 'delete', `مسابقهٔ «${title}» برای همیشه حذف می‌شه (هنوز ثبت‌نامی نداره). مطمئنی؟`)}
        disabled={busy !== null}
        style={{ all: 'unset', cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', boxSizing: 'border-box', minHeight: 46, background: C.liveSoft, border: `1px solid ${C.live}55`, borderRadius: 12, color: C.live, fontWeight: 700, fontSize: 13, opacity: busy ? 0.5 : 1 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
        {busy === 'delete' ? 'در حال حذف…' : 'حذف مسابقه'}
      </button>
      {err && <div style={{ fontSize: 12, color: C.live, marginTop: 8 }}>{err}</div>}
    </div>
  )
}
