'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DISC } from '@/lib/mock-data'
import { IRAN_GEO, citiesOf } from '@/lib/iran-geo'
import { GAMENET_FEATURES, CONSOLE_KINDS } from '@/lib/gamenet-features'
import { GAMENET_GAMES } from '@/lib/gamenet-games'
import { GAMENET_PHOTO_MAX, compressGamenetPhoto } from '@/lib/gamenet-photos'
import { C, DISP, Button, GameBadge, inp, Field, BackHeader } from '@/components/ui'

export default function NewGamenetForm() {
  const router = useRouter()
  const [attest, setAttest] = useState(false)
  const [name, setName] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [addr, setAddr] = useState('')
  const [phone, setPhone] = useState('')
  const [instagram, setInstagram] = useState('')
  const [consoleCounts, setConsoleCounts] = useState<Record<string, number>>({})
  const [discs, setDiscs] = useState<string[]>([])
  const [games, setGames] = useState<string[]>([])
  const [features, setFeatures] = useState<string[]>([])
  const [photos, setPhotos] = useState<string[]>([])
  const [photoBusy, setPhotoBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  const cities = province ? citiesOf(province) : []
  const toggleDisc = (d: string) => setDiscs(s => s.includes(d) ? s.filter(x => x !== d) : [...s, d])
  const toggleGame = (d: string) => setGames(s => s.includes(d) ? s.filter(x => x !== d) : [...s, d])
  const toggleFeature = (d: string) => setFeatures(s => s.includes(d) ? s.filter(x => x !== d) : [...s, d])

  async function pickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setPhotoBusy(true); setErr(null)
    try {
      const next = [...photos]
      for (const f of files) {
        if (next.length >= GAMENET_PHOTO_MAX) break
        next.push(await compressGamenetPhoto(f))
      }
      setPhotos(next)
    } catch { setErr('عکس خونده نشد، یه فایل دیگه امتحان کن') }
    finally { setPhotoBusy(false) }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null)
    if (!attest) { setErr('اول تایید کن صاحب یا نمایندهٔ این مکانی'); return }
    if (photos.length === 0) { setErr('حداقل یک عکسِ محل الزامیه'); return }
    setBusy(true)
    try {
      const consoles = Object.entries(consoleCounts).filter(([, n]) => n > 0).map(([kind, count]) => ({ kind, count }))
      const res = await fetch('/api/gamenets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attest, name, province, city, address: addr, phone, instagramUrl: instagram, consoles, disciplines: discs, games, features, photos }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ثبت نشد، دوباره امتحان کن')
      router.push(`/gamenets/${j.gamenet.id}`)
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="animate-fade-up">
      <BackHeader title="ثبت گیم‌نت" href="/gamenets" />

      <form onSubmit={submit} style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ padding: '14px 14px', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 12 }}>
          <div style={{ fontSize: 12.5, color: C.tbody, lineHeight: 1.9, marginBottom: 10 }}>
            این فرم برای صاحب یا مدیرِ واقعیِ گیم‌نته. تیم گیم‌لند دستی بررسیش می‌کنه؛ درخواست‌های نامعتبر رد می‌شن.
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: C.thi, cursor: 'pointer' }}>
            <input type="checkbox" checked={attest} onChange={e => setAttest(e.target.checked)} style={{ marginTop: 2 }} />
            <span>تایید می‌کنم صاحب یا نمایندهٔ رسمی این مکانم</span>
          </label>
        </div>

        <Field label="نام گیم‌نت"><input value={name} onChange={e => setName(e.target.value)} required style={inp}/></Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="استان">
            <select value={province} onChange={e => { setProvince(e.target.value); setCity('') }} required style={inp as any}>
              <option value="">انتخاب…</option>
              {IRAN_GEO.map(p => <option key={p.province} value={p.province}>{p.province}</option>)}
            </select>
          </Field>
          <Field label="شهر">
            <select value={city} onChange={e => setCity(e.target.value)} disabled={!province} required style={{ ...inp, opacity: province ? 1 : 0.45 } as any}>
              <option value="">{province ? 'انتخاب…' : 'اول استان'}</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="آدرس دقیق" hint="خیابان، کوچه، پلاک، واحد — هرچی دقیق‌تر باشه بررسی سریع‌تره">
          <textarea value={addr} onChange={e => setAddr(e.target.value)} required rows={2} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }}/>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="شمارهٔ تماسِ کسب‌وکار" hint="نه شمارهٔ حساب کاربریت">
            <input dir="ltr" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} required style={{ ...inp, fontFamily: DISP, textAlign: 'left' }}/>
          </Field>
          <Field label="آدرس پیج (اختیاری)">
            <input dir="ltr" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="instagram.com/…" style={{ ...inp, textAlign: 'left' }}/>
          </Field>
        </div>

        <Field label="امکانات">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {GAMENET_FEATURES.map(f => (
              <button key={f.id} type="button" onClick={() => toggleFeature(f.id)} style={chip(features.includes(f.id))}>{f.name}</button>
            ))}
          </div>
        </Field>

        <Field label="تعداد کنسول/دستگاه" hint="به تفکیک نوع — هرکدوم نداری صفر بذار">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CONSOLE_KINDS.map(k => (
              <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, fontSize: 12.5, color: C.thi }}>{k.name}</span>
                <input type="number" min="0" value={consoleCounts[k.id] ?? ''} placeholder="0"
                  onChange={e => setConsoleCounts(s => ({ ...s, [k.id]: Math.max(0, Number(e.target.value) || 0) }))}
                  style={{ ...inp, width: 70, textAlign: 'center', fontFamily: DISP, padding: '9px 0' }} />
              </div>
            ))}
          </div>
        </Field>

        <Field label="رشته‌های مسابقاتیِ گیم‌لند" hint="اونایی که می‌تونی مسابقه‌شون رو برگزار کنی">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(Object.keys(DISC) as (keyof typeof DISC)[]).map(k => {
              const d = DISC[k], on = discs.includes(k)
              return (
                <button key={k} type="button" onClick={() => toggleDisc(k)} style={{ ...chip(on), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <GameBadge disc={k} size={20} />{d.name}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="بقیهٔ بازی‌هایی که داره" hint="فقط برای معرفی — ممکنه بیشتر از رشته‌های بالا باشه">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {GAMENET_GAMES.map(g => (
              <button key={g.id} type="button" onClick={() => toggleGame(g.id)} style={chip(games.includes(g.id))}>{g.name}</button>
            ))}
          </div>
        </Field>

        <Field label={`عکس‌های محل — حداقل ۱، حداکثر ${GAMENET_PHOTO_MAX}`}>
          <input type="file" accept="image/*" multiple onChange={pickPhotos} style={{ display: 'none' }} id="gn-photo" />
          {photos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.line}` }}>
                  <img src={p} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                  <button type="button" onClick={() => setPhotos(s => s.filter((_, j) => j !== i))}
                    style={{ all: 'unset', cursor: 'pointer', position: 'absolute', top: 6, left: 6, width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {photos.length < GAMENET_PHOTO_MAX && (
            <label htmlFor="gn-photo" style={{ cursor: 'pointer', boxSizing: 'border-box', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 96, background: C.sf2, border: `1.5px dashed ${C.accent}88`, borderRadius: 14, color: C.accent }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l1.5-2h7L17 8h3v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /></svg>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>{photoBusy ? 'در حال آماده‌سازی…' : photos.length ? 'افزودن عکس دیگر' : 'انتخاب عکس‌های محل'}</span>
            </label>
          )}
          <div style={{ fontSize: 11, color: C.tmut, marginTop: 6 }}>چند عکس از فضا، کنسول‌ها و محیط — کمک می‌کنه سریع‌تر تأیید بشی.</div>
        </Field>

        <div style={{ padding: '10px 12px', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, fontSize: 11.5, color: C.tmut, lineHeight: 1.7 }}>
          بعد از ارسال، درخواستت میره برای بررسی — ظرف ۲۴ تا ۴۸ ساعت نتیجه اعلام می‌شه.
        </div>

        {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}

        <Button type="submit" disabled={busy || !attest || photos.length === 0}>{busy ? 'در حال ارسال…' : 'ارسال برای بررسی'}</Button>
      </form>
    </div>
  )
}

function chip(on: boolean): React.CSSProperties {
  return { all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 40, boxSizing: 'border-box', padding: '9px 13px', border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 700, fontSize: 12.5 }
}
