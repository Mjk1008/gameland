'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, DISP, inp, Field, Button } from '@/components/ui'

type Promo = {
  id: string; imageData: string; linkType: 'event' | 'url' | 'none'
  eventId?: string; url?: string; sort: number; active: boolean; createdAt: number
}
type Ev = { id: string; title: string; disc: string }
type LinkType = 'none' | 'event' | 'url'

// Downscale + re-encode an image file to a compact JPEG data URL so slides stay
// small (base64 goes straight into Postgres). Max edge 1600px, quality .82.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('عکس خوانده نشد'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('فایل عکس معتبر نیست'))
      img.onload = () => {
        const MAX = 1600
        let { width: w, height: h } = img
        if (w > MAX || h > MAX) { const r = Math.min(MAX / w, MAX / h); w = Math.round(w * r); h = Math.round(h * r) }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('پردازش عکس ناموفق بود'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function PromosClient({ initial, events }: { initial: Promo[]; events: Ev[] }) {
  const router = useRouter()
  const [list, setList] = useState<Promo[]>([...initial].sort((a, b) => a.sort - b.sort))
  const [image, setImage] = useState<string>('')
  const [linkType, setLinkType] = useState<LinkType>('none')
  const [eventId, setEventId] = useState<string>(events[0]?.id ?? '')
  const [url, setUrl] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)

  // per-slide edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [eLinkType, setELinkType] = useState<LinkType>('none')
  const [eEventId, setEEventId] = useState<string>('')
  const [eUrl, setEUrl] = useState<string>('')

  const eventLabel = (id?: string) => { const e = events.find(x => x.id === id); return e ? e.title : id }

  function startEdit(p: Promo) {
    setEditId(p.id); setErr(null)
    setELinkType(p.linkType); setEEventId(p.eventId ?? events[0]?.id ?? ''); setEUrl(p.url ?? '')
  }
  async function saveEdit(id: string) {
    if (eLinkType === 'url' && !/^(https?:\/\/|\/)/.test(eUrl.trim())) { setErr('لینک باید با http(s):// یا / شروع شه'); return }
    const body: any = { id, action: 'edit', linkType: eLinkType, eventId: eLinkType === 'event' ? eEventId : undefined, url: eLinkType === 'url' ? eUrl.trim() : undefined }
    setList(l => l.map(x => x.id === id ? { ...x, linkType: eLinkType, eventId: body.eventId, url: body.url } : x))
    setEditId(null)
    await patch(id, body)
  }
  async function replaceImage(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setErr(null)
    try {
      const dataUrl = await fileToDataUrl(f)
      setList(l => l.map(x => x.id === id ? { ...x, imageData: dataUrl } : x))
      await patch(id, { id, action: 'edit', imageData: dataUrl })
    } catch (e: any) { setErr(e.message) }
    finally { if (editFileRef.current) editFileRef.current.value = '' }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setErr(null)
    try { setImage(await fileToDataUrl(f)) }
    catch (e: any) { setErr(e.message) }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (!image) { setErr('اول یه عکس انتخاب کن'); return }
    if (linkType === 'event' && !eventId) { setErr('یه مسابقه انتخاب کن'); return }
    if (linkType === 'url' && !/^(https?:\/\/|\/)/.test(url.trim())) { setErr('لینک باید با http(s):// یا / شروع شه'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/promos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: image, linkType, eventId: linkType === 'event' ? eventId : undefined, url: linkType === 'url' ? url.trim() : undefined }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ذخیره نشد')
      setList(l => [...l, j.promo])
      setImage(''); setLinkType('none'); setUrl('')
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  async function patch(id: string, body: any) {
    const res = await fetch('/api/admin/promos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) })
    if (res.ok) router.refresh()
  }
  async function reorder(id: string, dir: 'up' | 'down') {
    setList(l => {
      const i = l.findIndex(p => p.id === id); const j = dir === 'up' ? i - 1 : i + 1
      if (i < 0 || j < 0 || j >= l.length) return l
      const copy = [...l];[copy[i], copy[j]] = [copy[j], copy[i]]; return copy
    })
    await patch(id, { action: 'reorder', dir })
  }
  async function toggle(p: Promo) {
    setList(l => l.map(x => x.id === p.id ? { ...x, active: !x.active } : x))
    await patch(p.id, { action: 'toggle', active: !p.active })
  }
  async function del(id: string) {
    if (!confirm('این اسلاید حذف شه؟')) return
    setList(l => l.filter(p => p.id !== id))
    const res = await fetch(`/api/admin/promos?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (res.ok) router.refresh()
  }

  const seg = (on: boolean): React.CSSProperties => ({
    all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, fontSize: 12.5, fontWeight: 700, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}`,
  })
  const iconBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: C.sf2, color: C.tbody, border: `1px solid ${C.line}` }

  return (
    <div style={{ padding: '14px 16px 28px' }}>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: C.thi }}>اسلایدر صفحهٔ اول</span>
        <div style={{ fontSize: 12, color: C.tmut, marginTop: 3 }}>پوستر آپلود کن، و انتخاب کن با کلیک روی هر پوستر کاربر کجا بره.</div>
      </div>

      {/* new slide */}
      <form onSubmit={submit} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 13 }}>
        {/* image picker + preview */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
          {image ? (
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.line}` }}>
              <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button type="button" onClick={() => fileRef.current?.click()} style={{ all: 'unset', cursor: 'pointer', position: 'absolute', bottom: 8, insetInlineEnd: 8, fontSize: 12, fontWeight: 700, color: C.thi, background: 'rgba(20,17,13,.82)', border: `1px solid ${C.line2}`, borderRadius: 9, padding: '8px 12px' }}>تغییر عکس</button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', aspectRatio: '16 / 9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.sf2, border: `1.5px dashed ${C.line2}`, borderRadius: 12, color: C.tbody }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              <span style={{ fontSize: 13, fontWeight: 700 }}>انتخاب عکسِ پوستر</span>
              <span style={{ fontSize: 11, color: C.tmut }}>نسبت ۱۶:۹ بهترین نتیجه رو می‌ده</span>
            </button>
          )}
        </div>

        {/* link target */}
        <Field label="با کلیک روی پوستر، کاربر بره…">
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => setLinkType('none')} style={seg(linkType === 'none')}>هیچ‌جا</button>
            <button type="button" onClick={() => setLinkType('event')} style={seg(linkType === 'event')}>صفحهٔ مسابقه</button>
            <button type="button" onClick={() => setLinkType('url')} style={seg(linkType === 'url')}>لینک دلخواه</button>
          </div>
        </Field>

        {linkType === 'event' && (
          <Field label="کدوم مسابقه / رشته؟" hint="پوستر به صفحهٔ همون مسابقه (رشته) لینک می‌شه">
            {events.length === 0
              ? <div style={{ fontSize: 12.5, color: C.tmut }}>هنوز مسابقه‌ای نساختی — اول از «مسابقات» یکی بساز.</div>
              : <select value={eventId} onChange={e => setEventId(e.target.value)} style={{ ...inp, appearance: 'none' }}>
                  {events.map(e => <option key={e.id} value={e.id}>{e.title} — {e.disc}</option>)}
                </select>}
          </Field>
        )}
        {linkType === 'url' && (
          <Field label="لینک (لندینگ یا هر آدرس)" hint="مثلاً https://gamelandteam.ir/event یا /competitions">
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" dir="ltr" style={{ ...inp, fontFamily: DISP }} />
          </Field>
        )}

        {err && <div style={{ fontSize: 12.5, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}
        <Button type="submit" disabled={busy}>{busy ? 'در حال افزودن…' : 'افزودن به اسلایدر'}</Button>
      </form>

      {/* existing slides */}
      <div style={{ fontSize: 13, fontWeight: 800, color: C.thi, marginBottom: 10 }}>اسلایدهای فعلی <span style={{ color: C.tmut, fontWeight: 400 }}>({list.length})</span></div>
      {list.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.tmut, textAlign: 'center', padding: '24px 0' }}>هنوز اسلایدی اضافه نشده.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10, background: C.sf1, border: `1px solid ${editId === p.id ? C.accent : C.line}`, borderRadius: 12, opacity: p.active ? 1 : 0.55 }}>
              <div style={{ display: 'flex', gap: 11 }}>
                <div style={{ position: 'relative', width: 92, aspectRatio: '16 / 9', borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: `1px solid ${C.line}` }}>
                  <img src={p.imageData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.thi }}>اسلاید {i + 1}</div>
                  <div dir="ltr" style={{ fontSize: 11, color: C.tbody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {p.linkType === 'event' ? `→ ${eventLabel(p.eventId)}` : p.linkType === 'url' ? `→ ${p.url}` : 'بدون لینک'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
                    <button onClick={() => reorder(p.id, 'up')} disabled={i === 0} style={{ ...iconBtn, opacity: i === 0 ? 0.4 : 1 }} aria-label="بالا">↑</button>
                    <button onClick={() => reorder(p.id, 'down')} disabled={i === list.length - 1} style={{ ...iconBtn, opacity: i === list.length - 1 ? 0.4 : 1 }} aria-label="پایین">↓</button>
                    <button onClick={() => (editId === p.id ? setEditId(null) : startEdit(p))} style={{ ...iconBtn, width: 'auto', padding: '0 12px', fontSize: 12, fontWeight: 700, color: editId === p.id ? C.accent : C.tbody }}>{editId === p.id ? 'بستن' : 'ویرایش'}</button>
                    <button onClick={() => toggle(p)} style={{ ...iconBtn, width: 'auto', padding: '0 12px', fontSize: 12, fontWeight: 700, color: p.active ? C.win : C.tmut }}>{p.active ? 'فعال' : 'خاموش'}</button>
                    <button onClick={() => del(p.id)} style={{ ...iconBtn, marginInlineStart: 'auto', color: C.live, borderColor: `${C.live}55` }} aria-label="حذف">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
                    </button>
                  </div>
                </div>
              </div>

              {editId === p.id && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" onClick={() => setELinkType('none')} style={seg(eLinkType === 'none')}>هیچ‌جا</button>
                    <button type="button" onClick={() => setELinkType('event')} style={seg(eLinkType === 'event')}>مسابقه</button>
                    <button type="button" onClick={() => setELinkType('url')} style={seg(eLinkType === 'url')}>لینک</button>
                  </div>
                  {eLinkType === 'event' && (
                    <select value={eEventId} onChange={e => setEEventId(e.target.value)} style={{ ...inp, appearance: 'none' }}>
                      {events.map(e => <option key={e.id} value={e.id}>{e.title} — {e.disc}</option>)}
                    </select>
                  )}
                  {eLinkType === 'url' && (
                    <input value={eUrl} onChange={e => setEUrl(e.target.value)} placeholder="https://…" dir="ltr" style={{ ...inp, fontFamily: DISP }} />
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input ref={editFileRef} type="file" accept="image/*" onChange={e => replaceImage(p.id, e)} style={{ display: 'none' }} />
                    <button type="button" onClick={() => editFileRef.current?.click()} style={{ ...iconBtn, width: 'auto', flex: 1, padding: '0 12px', fontSize: 12, fontWeight: 700 }}>تغییر عکس</button>
                    <button type="button" onClick={() => saveEdit(p.id)} style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, fontSize: 12.5, fontWeight: 700, background: C.accent, color: C.ink }}>ذخیرهٔ لینک</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
