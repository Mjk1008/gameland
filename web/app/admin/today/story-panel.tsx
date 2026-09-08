'use client'
import { useEffect, useRef, useState } from 'react'
import { C, DISP, Button } from '@/components/ui'
import { fileToStoryImages } from '@/lib/story-image'

interface StoryRow { id: string; createdAt: number; expiresAt: number; viewCount: number }

function hoursLeft(expiresAt: number): string {
  const ms = expiresAt - Date.now()
  if (ms <= 0) return 'منقضی شده'
  const h = Math.floor(ms / 3600_000)
  const m = Math.floor((ms % 3600_000) / 60_000)
  return h > 0 ? `${h} ساعت و ${m} دقیقه مونده` : `${m} دقیقه مونده`
}

// `bare` — rendered inside a CollapsibleCard on the board, which already draws
// the surface and the title.
export default function StoryPanel({ bare }: { bare?: boolean }) {
  const [rows, setRows] = useState<StoryRow[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    try {
      const res = await fetch('/api/admin/stories')
      const j = await res.json()
      if (res.ok) setRows(j.stories ?? [])
    } catch {}
  }
  useEffect(() => { load() }, [])

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setErr(null); setBusy(true)
    try {
      const { full, thumb } = await fileToStoryImages(f)
      const res = await fetch('/api/admin/stories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageData: full, thumbData: thumb }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'آپلود نشد')
      await load()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function onDelete(id: string) {
    if (!confirm('این استوری حذف بشه؟')) return
    setBusy(true)
    try {
      await fetch(`/api/admin/stories/${id}`, { method: 'DELETE' })
      await load()
    } finally { setBusy(false) }
  }

  return (
    <div style={bare ? { display: 'flex', flexDirection: 'column', gap: 10 } : { display: 'flex', flexDirection: 'column', gap: 10, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {!bare && <span style={{ fontSize: 13.5, fontWeight: 700, color: C.thi }}>استوری</span>}
        <span className="gl-num" style={{ fontSize: 11, color: C.tmut, marginInlineStart: 'auto' }}>{rows.length} / ۱۵ در ۲۴ ساعت</span>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
      <Button disabled={busy || rows.length >= 15} onClick={() => fileRef.current?.click()}>{busy ? 'در حالِ پردازش…' : '+ استوریِ جدید'}</Button>
      {err && <div style={{ fontSize: 11.5, color: C.live }}>{err}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.length === 0 && <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: '10px 0' }}>هنوز استوری‌ای نیست</div>}
        {rows.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '8px 10px' }}>
            <img src={`/api/story-media/${r.id}/thumb`} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11.5, color: C.tbody }}>{hoursLeft(r.expiresAt)}</span>
              <span style={{ fontSize: 10.5, color: C.tmut, fontFamily: DISP }} className="gl-num">{r.viewCount} بازدید</span>
            </div>
            <button disabled={busy} onClick={() => onDelete(r.id)} style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: C.live, padding: '6px 10px' }}>حذف</button>
          </div>
        ))}
      </div>
    </div>
  )
}
