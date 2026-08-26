'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'
import { GAMENET_PHOTO_MAX, compressGamenetPhoto } from '@/lib/gamenet-photos'

export default function GamenetPhotoManager({ gamenetId, initialPhotoIds }: { gamenetId: string; initialPhotoIds: string[] }) {
  const router = useRouter()
  const [photoIds, setPhotoIds] = useState(initialPhotoIds)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    e.target.value = ''
    setErr(null); setBusy(true)
    try {
      const photoData = await compressGamenetPhoto(f)
      const res = await fetch('/api/gamenet-photos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gamenetId, photoData }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'اضافه نشد')
      setPhotoIds(ids => [...ids, j.photoId])
      router.refresh()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  async function removePhoto(photoId: string) {
    if (confirmDeleteId !== photoId) { setConfirmDeleteId(photoId); return }
    setErr(null); setBusy(true)
    try {
      const res = await fetch(`/api/gamenet-photos/${photoId}`, { method: 'DELETE' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'حذف نشد')
      setPhotoIds(ids => ids.filter(id => id !== photoId))
      router.refresh()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false); setConfirmDeleteId(null) }
  }

  const canAdd = photoIds.length < GAMENET_PHOTO_MAX

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>عکس‌های محل</span>
        <span style={{ fontSize: 11.5, color: C.tmut }}>{photoIds.length} از {GAMENET_PHOTO_MAX}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {photoIds.map(id => (
          <div key={id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.line}` }}>
            <img src={`/api/gamenet-photo/${id}`} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
            {photoIds.length > 1 && confirmDeleteId !== id && (
              <button type="button" disabled={busy} onClick={() => removePhoto(id)}
                style={{ all: 'unset', cursor: busy ? 'default' : 'pointer', position: 'absolute', top: 6, insetInlineStart: 6, width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ×
              </button>
            )}
            {photoIds.length > 1 && confirmDeleteId === id && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 }}>
                <span style={{ fontSize: 10.5, color: '#fff', textAlign: 'center' }}>حذف بشه؟</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" disabled={busy} onClick={() => setConfirmDeleteId(null)}
                    style={{ all: 'unset', cursor: 'pointer', padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 10.5 }}>نه</button>
                  <button type="button" disabled={busy} onClick={() => removePhoto(id)}
                    style={{ all: 'unset', cursor: 'pointer', padding: '4px 10px', borderRadius: 6, background: C.live, color: '#fff', fontSize: 10.5, fontWeight: 700 }}>{busy ? '…' : 'حذف'}</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {canAdd && (
        <>
          <input type="file" accept="image/*" onChange={addPhoto} disabled={busy} style={{ display: 'none' }} id="gn-add-photo" />
          <label htmlFor="gn-add-photo" style={{ cursor: busy ? 'default' : 'pointer', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, background: C.sf2, border: `1.5px dashed ${C.accent}88`, borderRadius: 12, color: C.accent, fontSize: 12.5, fontWeight: 700, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'در حال آپلود…' : '+ افزودن عکس'}
          </label>
        </>
      )}

      {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}
    </div>
  )
}
