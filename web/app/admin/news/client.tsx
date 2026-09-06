'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'

type Placement = 'home' | 'today' | 'both'
interface Item { id: string; title: string; body: string; tags: string[]; active: boolean; cover: string; placement: Placement }

const PLACEMENT_LABEL: Record<Placement, string> = { home: 'خانه', today: 'امروز', both: 'هر دو' }

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

// One-box convention: FIRST line = title, #words anywhere = tags (stripped),
// everything else = body. The admin always pastes one blob; we structure it.
function parseNews(raw: string): { title: string; body: string; tags: string[] } {
  const tags = Array.from(raw.matchAll(/#([\u0600-\u06FF\w\u200c]+)/g)).map(m => m[1]).slice(0, 6)
  const cleaned = raw.replace(/#[\u0600-\u06FF\w\u200c]+/g, '').trim()
  const lines = cleaned.split('\n').map(l => l.trim())
  const title = (lines.find(l => l.length > 0) ?? '').slice(0, 120)
  const body = lines.slice(lines.findIndex(l => l.length > 0) + 1).join('\n').trim()
  return { title, body, tags }
}

export default function NewsAdminClient({ initial }: { initial: Item[] }) {
  const router = useRouter()
  const [raw, setRaw] = useState('')
  const [image, setImage] = useState('')
  const [placement, setPlacement] = useState<Placement>('home')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const parsed = parseNews(raw)

  async function api(payload: any) {
    const res = await fetch('/api/admin/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error || 'انجام نشد')
  }

  async function create() {
    setErr(null)
    if (!parsed.title) return setErr('متنِ خبر خالیه — خطِ اول تیتره')
    if (!image) return setErr('کاور رو آپلود کن')
    setBusy(true)
    try {
      await api({ action: 'create', title: parsed.title, body: parsed.body, tags: parsed.tags, imageData: image, placement })
      setRaw(''); setImage(''); setPlacement('home')
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

        <textarea value={raw} onChange={e => setRaw(e.target.value.slice(0, 4200))} rows={8}
          placeholder={'کلِ خبر رو همین‌جا پیست کن:\n\nخطِ اول → تیتر\nبقیه → متنِ خبر\nهرجا #تگ بزنی → تگ می‌شه\n\nمثال:\nقرعه‌کشی FC26 پنجشنبه انجام می‌شه\nهمهٔ ثبت‌نامی‌ها ساعت ۲۱ نتیجه رو تو اپ می‌بینن...\n#FC26 #قرعه‌کشی'}
          style={{ ...inp, resize: 'vertical', lineHeight: 2 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11.5, color: C.tmut }}>محلِ نمایش:</span>
          <PlacementPicker value={placement} onChange={setPlacement} />
        </div>

        {/* live parse preview — the admin sees exactly what will publish */}
        {raw.trim() && (
          <div style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10, color: C.tmut }}>این‌طوری منتشر می‌شه:</div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.thi }}>{parsed.title || '—'}</div>
            {parsed.tags.length > 0 && <div style={{ fontSize: 10.5, color: C.gold }}>{parsed.tags.map(t => `#${t}`).join('  ')}</div>}
            {parsed.body && <div style={{ fontSize: 11.5, color: C.tbody, lineHeight: 1.9, maxHeight: 72, overflow: 'hidden' }}>{parsed.body}</div>}
          </div>
        )}

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
              <div style={{ marginTop: 10 }}>
                <PlacementPicker value={n.placement} onChange={async p => { await api({ action: 'edit', id: n.id, placement: p }).catch(e => alert(e.message)); router.refresh() }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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

function PlacementPicker({ value, onChange }: { value: Placement; onChange: (p: Placement) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {(['home', 'today', 'both'] as Placement[]).map(p => (
        <button key={p} type="button" onClick={() => onChange(p)}
          style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, padding: '6px 12px', borderRadius: 8,
            background: value === p ? C.accent : C.sf2, color: value === p ? C.ink : C.tbody, border: `1px solid ${value === p ? C.accent : C.line}` }}>
          {PLACEMENT_LABEL[p]}
        </button>
      ))}
    </div>
  )
}

const inp: React.CSSProperties = { background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '12px 13px', color: C.thi, fontSize: 13.5, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }
const miniBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, padding: '8px 14px', borderRadius: 9, background: 'transparent', color: '#B8AC9C', border: '1px solid #3A332A' }
