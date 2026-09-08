'use client'
import { useEffect, useState } from 'react'
import { C, Button } from '@/components/ui'

interface AnnouncementRow { id: string; text: string; createdAt: number }

// The board stores one `text` field; the composer here writes it as
// "عنوان\nمتن" (a bare title with no second line if متن is left empty), and
// splits it back the same way for the list below and for the read side
// (lib/today-snapshot.ts's announcementsFor). No schema change needed for
// title/body — see CLAUDE.md §2 before adding a real column.
function splitAnnouncement(text: string): { title: string; body?: string } {
  const i = text.indexOf('\n')
  return i === -1 ? { title: text } : { title: text.slice(0, i), body: text.slice(i + 1).trim() || undefined }
}

// `bare` — see StoryPanel: the board wraps this in a CollapsibleCard that
// already supplies the surface and title.
export default function AnnouncementPanel({ bare }: { bare?: boolean }) {
  const [rows, setRows] = useState<AnnouncementRow[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
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
    if (!title.trim()) { setErr('عنوانِ اعلان رو بنویس'); return }
    setErr(null); setBusy(true)
    try {
      const text = body.trim() ? `${title.trim()}\n${body.trim()}` : title.trim()
      const res = await fetch('/api/admin/today-announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'ارسال نشد')
      setTitle(''); setBody('')
      await load()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  async function onDelete(id: string) {
    // Same guard StoryPanel already puts on its own list-row delete.
    if (!confirm('این اعلان حذف بشه؟')) return
    setBusy(true)
    try {
      await fetch(`/api/admin/today-announcements/${id}`, { method: 'DELETE' })
      await load()
    } finally { setBusy(false) }
  }

  return (
    <div style={bare ? { display: 'flex', flexDirection: 'column', gap: 10 } : { display: 'flex', flexDirection: 'column', gap: 10, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 13 }}>
      {!bare && <span style={{ fontSize: 13.5, fontWeight: 700, color: C.thi }}>تابلوِ اعلان</span>}
      <input value={title} onChange={e => setTitle(e.target.value.slice(0, 80))}
        placeholder="عنوان…" style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 12px', color: C.thi, fontSize: 12.5, outline: 'none', fontFamily: 'inherit' }} />
      <textarea value={body} onChange={e => setBody(e.target.value.slice(0, 500))} rows={2}
        placeholder="متن (اختیاری)…" style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 12px', minHeight: 48, color: C.thi, fontSize: 12.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
      {err && <div style={{ fontSize: 11.5, color: C.live }}>{err}</div>}
      <Button disabled={busy} onClick={send}>{busy ? 'در حالِ ارسال…' : 'افزودن به تابلو'}</Button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(r => {
          const { title, body } = splitAnnouncement(r.text)
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '9px 11px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: C.thi }}>{title}</span>
                {body && <span style={{ fontSize: 12, color: C.tbody, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{body}</span>}
              </div>
              <button disabled={busy} onClick={() => onDelete(r.id)} style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: C.live, padding: '4px 8px', flexShrink: 0 }}>حذف</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
