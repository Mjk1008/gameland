'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Gamenet } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import { IRAN_GEO, citiesOf } from '@/lib/iran-geo'
import { GAMENET_FEATURES, CONSOLE_KINDS } from '@/lib/gamenet-features'
import { GAMENET_GAMES } from '@/lib/gamenet-games'
import { C, DISP, Button, GameBadge, inp, Field, BackHeader } from '@/components/ui'

export default function EditGamenetForm({ g }: { g: Gamenet }) {
  const router = useRouter()
  const [name, setName] = useState(g.name)
  const [province, setProvince] = useState(g.province ?? '')
  const [city, setCity] = useState(g.city)
  const [addr, setAddr] = useState(g.address)
  const [phone, setPhone] = useState(g.phone ?? '')
  const [instagram, setInstagram] = useState(g.instagramUrl ?? '')
  const [mapUrl, setMapUrl] = useState(g.mapUrl ?? '')
  const [openHours, setOpenHours] = useState(g.openHours ?? '')
  const [consoleCounts, setConsoleCounts] = useState<Record<string, number>>(() => Object.fromEntries(g.consoles.map(c => [c.kind, c.count])))
  const [discs, setDiscs] = useState<string[]>(g.disciplines)
  const [games, setGames] = useState<string[]>(g.games)
  const [features, setFeatures] = useState<string[]>(g.features)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const cities = province ? citiesOf(province) : []
  const toggleDisc = (d: string) => setDiscs(s => s.includes(d) ? s.filter(x => x !== d) : [...s, d])
  const toggleGame = (d: string) => setGames(s => s.includes(d) ? s.filter(x => x !== d) : [...s, d])
  const toggleFeature = (d: string) => setFeatures(s => s.includes(d) ? s.filter(x => x !== d) : [...s, d])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setOk(null); setBusy(true)
    try {
      const consoles = Object.entries(consoleCounts).filter(([, n]) => n > 0).map(([kind, count]) => ({ kind, count }))
      const res = await fetch(`/api/gamenets/${g.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, province, city, address: addr, phone, instagramUrl: instagram, mapUrl, openHours, consoles, disciplines: discs, games, features }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ذخیره نشد')
      setOk(j.reReview ? 'ذخیره شد — چون نام یا آدرس عوض شد، دوباره برای بررسی میره' : 'ذخیره شد')
      router.refresh()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="animate-fade-up">
      <BackHeader title="ویرایش گیم‌نت" href="/gamenet" />
      <form onSubmit={submit} style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ padding: '10px 12px', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, fontSize: 11.5, color: C.tmut, lineHeight: 1.7 }}>
          تغییر نام، استان، شهر یا آدرس → دوباره بررسی می‌شه. بقیهٔ فیلدها فوری اعمال می‌شن.
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
        <Field label="آدرس دقیق"><textarea value={addr} onChange={e => setAddr(e.target.value)} required rows={2} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }}/></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="شمارهٔ تماس"><input dir="ltr" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} required style={{ ...inp, fontFamily: DISP, textAlign: 'left' }}/></Field>
          <Field label="پیج"><input dir="ltr" value={instagram} onChange={e => setInstagram(e.target.value)} style={{ ...inp, textAlign: 'left' }}/></Field>
        </div>
        <Field label="لینک نقشه (نشان/بلد)" hint="اختیاری"><input dir="ltr" value={mapUrl} onChange={e => setMapUrl(e.target.value)} placeholder="https://…" style={{ ...inp, textAlign: 'left' }}/></Field>
        <Field label="ساعات کاری" hint="مثلاً ۱۶ تا ۲۴"><input value={openHours} onChange={e => setOpenHours(e.target.value)} style={inp}/></Field>

        <Field label="امکانات">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {GAMENET_FEATURES.map(f => (
              <button key={f.id} type="button" onClick={() => toggleFeature(f.id)} style={chip(features.includes(f.id))}>{f.name}</button>
            ))}
          </div>
        </Field>
        <Field label="تعداد کنسول/دستگاه">
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
        <Field label="رشته‌های مسابقاتی">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(Object.keys(DISC) as (keyof typeof DISC)[]).map(k => (
              <button key={k} type="button" onClick={() => toggleDisc(k)} style={{ ...chip(discs.includes(k)), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <GameBadge disc={k} size={20} />{DISC[k].name}
              </button>
            ))}
          </div>
        </Field>
        <Field label="بقیهٔ بازی‌ها">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {GAMENET_GAMES.map(gg => (
              <button key={gg.id} type="button" onClick={() => toggleGame(gg.id)} style={chip(games.includes(gg.id))}>{gg.name}</button>
            ))}
          </div>
        </Field>

        {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}
        {ok && <div style={{ fontSize: 12, color: C.win, background: C.winSoft, border: `1px solid ${C.win}55`, padding: 10, borderRadius: 10 }}>{ok}</div>}
        <Button type="submit" disabled={busy}>{busy ? 'در حال ذخیره…' : 'ذخیره تغییرات'}</Button>
      </form>
    </div>
  )
}

function chip(on: boolean): React.CSSProperties {
  return { all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 40, boxSizing: 'border-box', padding: '9px 13px', border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 700, fontSize: 12.5 }
}
