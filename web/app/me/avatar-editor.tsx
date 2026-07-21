'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, DISP } from '@/components/ui'

// Square-crop + downscale to a small JPEG (avatars are tiny — 512px, q.85).
function toAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('عکس خوانده نشد'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('فایل عکس معتبر نیست'))
      img.onload = () => {
        const SIZE = 512
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2, sy = (img.height - side) / 2
        const canvas = document.createElement('canvas')
        canvas.width = SIZE; canvas.height = SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('پردازش عکس ناموفق بود'))
        ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function AvatarEditor({ uid, initial, hasPhoto }: { uid: string; initial: string; hasPhoto: boolean }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  // cache-bust so a freshly uploaded photo shows immediately
  const [v, setV] = useState(0)
  const showPhoto = (hasPhoto || preview) && true

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setErr(null); setBusy(true)
    try {
      const dataUrl = await toAvatarDataUrl(f)
      setPreview(dataUrl)
      const res = await fetch('/api/me/avatar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageData: dataUrl }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'آپلود نشد')
      setV(x => x + 1)
      router.refresh()
    } catch (e: any) { setErr(e.message); setPreview(null) }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function remove() {
    if (!confirm('عکس پروفایلت حذف شه؟')) return
    setBusy(true); setErr(null)
    try {
      await fetch('/api/me/avatar', { method: 'DELETE' })
      setPreview(null); setV(x => x + 1); router.refresh()
    } finally { setBusy(false) }
  }

  const src = preview ?? `/api/avatar/${uid}?v=${v}`

  return (
    <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
        style={{ all: 'unset', cursor: busy ? 'default' : 'pointer', width: 54, height: 54, borderRadius: 14, overflow: 'hidden', background: C.line, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.line2}` }}
        aria-label="تغییر عکس پروفایل">
        {showPhoto
          ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: busy ? 0.6 : 1 }} />
          : <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: C.accent }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l1.5-2h7L17 8h3v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /></svg>
              <span style={{ fontSize: 9.5, fontWeight: 700 }}>عکس</span>
            </span>}
      </button>
      {/* camera badge */}
      <span aria-hidden style={{ position: 'absolute', bottom: -3, insetInlineEnd: -3, width: 22, height: 22, borderRadius: 999, background: C.accent, border: `2px solid ${C.sf1}`, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l1.5-2h7L17 8h3v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /></svg>
      </span>
      {(hasPhoto || preview) && (
        <button type="button" onClick={remove} disabled={busy} style={{ all: 'unset', cursor: 'pointer', position: 'absolute', top: -6, insetInlineStart: -6, width: 20, height: 20, borderRadius: 999, background: C.live, color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.sf1}` }} aria-label="حذف عکس">×</button>
      )}
      {err && <div style={{ position: 'absolute', top: 58, insetInlineStart: 0, whiteSpace: 'nowrap', fontSize: 10.5, color: C.live }}>{err}</div>}
    </div>
  )
}
