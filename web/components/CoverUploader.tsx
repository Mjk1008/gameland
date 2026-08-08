'use client'
import { useRef, useState } from 'react'
import { C } from '@/components/ui'
import { compressCoverImage } from '@/lib/cover-image'

type Props = {
  label?: string
  hint?: string
  previewSrc?: string
  onUpload: (dataUrl: string) => Promise<void>
  onRemove?: () => Promise<void>
}

// Reusable 16:9 cover picker for admin competition/event forms.
export default function CoverUploader({ label = 'کاور', hint = 'نسبت ۱۶:۹ — روی کارت مسابقه نشون داده می‌شه', previewSrc, onUpload, onRemove }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const src = localPreview ?? previewSrc

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setErr(null)
    setBusy(true)
    try {
      const dataUrl = await compressCoverImage(f)
      setLocalPreview(dataUrl)
      await onUpload(dataUrl)
    } catch (ex: any) {
      setErr(ex.message || 'آپلود نشد')
      setLocalPreview(null)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function remove() {
    if (!onRemove) return
    setErr(null)
    setBusy(true)
    try {
      await onRemove()
      setLocalPreview(null)
    } catch (ex: any) {
      setErr(ex.message || 'حذف نشد')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {label && <div style={{ fontSize: 11, color: C.tmut, marginBottom: 5 }}>{label}</div>}
      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
      {src ? (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.line}`, opacity: busy ? 0.65 : 1 }}>
          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: 8, insetInlineEnd: 8, display: 'flex', gap: 6 }}>
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
              style={{ all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.thi, background: 'rgba(20,17,13,.82)', border: `1px solid ${C.line2}`, borderRadius: 9, padding: '8px 12px' }}>
              تغییر عکس
            </button>
            {onRemove && (
              <button type="button" disabled={busy} onClick={remove}
                style={{ all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.live, background: 'rgba(20,17,13,.82)', border: `1px solid ${C.live}55`, borderRadius: 9, padding: '8px 12px' }}>
                حذف
              </button>
            )}
          </div>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
          style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', aspectRatio: '16 / 9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.sf2, border: `1.5px dashed ${C.line2}`, borderRadius: 12, color: C.tbody, opacity: busy ? 0.65 : 1 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{busy ? 'در حال آپلود…' : 'انتخاب کاور'}</span>
          <span style={{ fontSize: 11, color: C.tmut }}>{hint}</span>
        </button>
      )}
      {err && <div style={{ fontSize: 11.5, color: C.live, marginTop: 6 }}>{err}</div>}
    </div>
  )
}
