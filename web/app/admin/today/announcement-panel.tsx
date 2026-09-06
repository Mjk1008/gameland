'use client'
import { useEffect, useState } from 'react'
import { C, Button } from '@/components/ui'

interface AnnouncementRow { id: string; text: string; createdAt: number }

export default function AnnouncementPanel() {
  const [rows, setRows] = useState<AnnouncementRow[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    try {
      const res = await fetch('/api/admin/today-announcements')
      const j = await res.json()
      if (res.ok) setRows(j.announcements ?? [])
    } catch {}
  }
  useEffect(() => { load() }, [])

  async function send() {
    if (!text.trim()) { setErr('متنِ اعلان رو بنویس'); return }
    setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/admin/today-announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.trim() }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'ارسال نشد')
      setText('')
      await load()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  async function onDelete(id: string) {
    setBusy(true)
    try {
      await fetch(`/api/admin/today-announcements/${id}`, { method: 'DELETE' })
      await load()
    } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 13 }}>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: C.thi }}>تابلوِ اعلان</span>
      <textarea value={text} onChange={e => setText(e.target.value.slice(0, 500))} rows={2}
        placeholder="متنِ اعلان…" style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 12px', minHeight: 48, color: C.thi, fontSize: 12.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
      {err && <div style={{ fontSize: 11.5, color: C.live }}>{err}</div>}
      <Button disabled={busy} onClick={send}>{busy ? 'در حالِ ارسال…' : 'افزودن به تابلو'}</Button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '9px 11px' }}>
            <span style={{ flex: 1, fontSize: 12.5, color: C.thi, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{r.text}</span>
            <button disabled={busy} onClick={() => onDelete(r.id)} style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: C.live, padding: '4px 8px', flexShrink: 0 }}>حذف</button>
          </div>
        ))}
      </div>
    </div>
  )
}
