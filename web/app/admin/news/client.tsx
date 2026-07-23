'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'

interface Item { id: string; title: string; body: string; tags: string[]; active: boolean; cover: string }

// Compress the picked cover to a light 16:9-ish JPEG before upload.
function compress(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => {
      const img = new Image()
      img.onload = () => {
        const W = Math.min(1280, img.width)
        const H = Math.round((img.height / img.width) * W)
        const cv = document.createElement('canvas')
        cv.width = W; cv.height = H
        cv.getContext('2d')!.drawImage(img, 0, 0, W, H)
        resolve(cv.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = fr.result as string
    }
    fr.onerror = reject
    fr.readAsDataURL(file)
  })
}

export default function NewsAdminClient({ initial }: { initial: Item[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState('')
  const [image, setImage] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function api(payload: any) {
    const res = await fetch('/api/admin/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error || 'انجام نشد')
  }

  async function create() {
    setErr(null)
    if (!title.trim()) return setErr('تیتر رو بنویس')
    if (!image) return setErr('کاور رو آپلود کن')
    setBusy(true)
    try {
      await api({ action: 'create', title, body, tags, imageData: image })
      setTitle(''); setBody(''); setTags(''); setImage('')
      router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* create */}
      <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 15, padding: 15, display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.thi }}>خبر جدید</div>

        <label style={{ display: 'block', cursor: 'pointer', borderRadius: 12, overflow: 'hidden', border: `1.5px dashed ${image ? C.win : C.line2}`, background: C.sf2, minHeight: 110, position: 'relative' }}>
          <input type="file" accept="image/*" style={{ display: 'none' }}
            onChange={async e => { const f = e.target.files?.[0]; if (f) { try { setImage(await compress(f)) } catch { setErr('خوندنِ عکس نشد') } } }} />
          {image
            ? <img src={image} alt="" style={{ display: 'block', width: '100%', maxHeight: 190, objectFit: 'cover' }} />
            : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, color: C.tmut }}>+ کاور خبر (لمس کن)</span>}
        </label>

        <input value={title} onChange={e => setTitle(e.target.value.slice(0, 120))} placeholder="تیتر خبر" style={inp} />
        <textarea value={body} onChange={e => setBody(e.target.value.slice(0, 4000))} placeholder="متن کامل خبر…" rows={5} style={{ ...inp, resize: 'vertical', lineHeight: 1.9 }} />
        <input value={tags} onChange={e => setTags(e.target.value)} placeholder="تگ‌ها با ویرگول: FC26، قرعه‌کشی، جایزه" style={inp} />

        {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 9, borderRadius: 9 }}>{err}</div>}
        <button onClick={create} disabled={busy} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 11, background: C.accent, color: C.ink, fontWeight: 800, fontSize: 14, opacity: busy ? 0.6 : 1 }}>
          {busy ? 'در حال انتشار…' : 'انتشار خبر'}
        </button>
      </div>

      {/* list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {initial.length === 0 && <div style={{ fontSize: 12.5, color: C.tmut, textAlign: 'center', padding: '10px 0' }}>هنوز خبری منتشر نکردی.</div>}
        {initial.map(n => (
          <div key={n.id} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, overflow: 'hidden', opacity: n.active ? 1 : 0.55 }}>
            <img src={n.cover} alt="" style={{ display: 'block', width: '100%', height: 110, objectFit: 'cover' }} />
            <div style={{ padding: '11px 13px' }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: C.thi }}>{n.title}</div>
              {n.tags.length > 0 && <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 4 }}>{n.tags.join(' · ')}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={async () => { await api({ action: 'edit', id: n.id, active: !n.active }).catch(e => alert(e.message)); router.refresh() }}
                  style={miniBtn}>{n.active ? 'مخفی کن' : 'نمایش بده'}</button>
                <button onClick={async () => { if (confirm('این خبر حذف شه؟')) { await api({ action: 'delete', id: n.id }).catch(e => alert(e.message)); router.refresh() } }}
                  style={{ ...miniBtn, color: C.live, borderColor: C.live + '55' }}>حذف</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '12px 13px', color: C.thi, fontSize: 13.5, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }
const miniBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, padding: '8px 14px', borderRadius: 9, background: 'transparent', color: '#B8AC9C', border: '1px solid #3A332A' }
