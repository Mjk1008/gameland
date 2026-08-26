'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { C, BackHeader, GameBadge } from '@/components/ui'
import { DISC } from '@/lib/mock-data'
import { IRAN_GEO, citiesOf } from '@/lib/iran-geo'
import { track } from '@/lib/track'

interface Props {
  discs: string[]
  defaultCity: string
  defaultProvince: string
}

export default function NewRequestForm({ discs, defaultCity, defaultProvince }: Props) {
  const router = useRouter()
  const [disc, setDisc] = useState(discs[0] ?? '')
  const [bestOf, setBestOf] = useState<1 | 3 | 5>(3)
  const [province, setProvince] = useState(defaultProvince)
  const [city, setCity] = useState(defaultCity)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const r = await fetch('/api/arena/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disc, bestOf, city, province, note }),
      })
      const j = await r.json()
      if (!r.ok) { setErr(j.error || 'ثبت درخواست انجام نشد، دوباره امتحان کن'); return }
      track('arena_request_create', { disc, bestOf, city })
      router.push(`/arena/requests/${j.request.id}`)
    } finally { setBusy(false) }
  }

  const cities = province ? citiesOf(province) : []

  return (
    <div className="animate-fade-up">
      <BackHeader title="درخواست بازی" href="/arena" />
      <form onSubmit={submit} style={{ padding: '0 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: C.tmut, marginBottom: 6 }}>رشته</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {discs.map(d => (
              <button key={d} type="button" onClick={() => setDisc(d)} style={{
                border: `1px solid ${disc === d ? C.accent : C.line}`, background: disc === d ? C.accentSoft : C.sf1,
                borderRadius: 10, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <GameBadge disc={d as any} size={22} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.thi }}>{DISC[d as keyof typeof DISC]?.name ?? d}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: C.tmut, marginBottom: 6 }}>فرمت مسابقه</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {([1, 3, 5] as const).map(b => (
              <button key={b} type="button" onClick={() => setBestOf(b)} style={{
                flex: 1, minHeight: 42, borderRadius: 10, fontWeight: 800, cursor: 'pointer',
                border: `1px solid ${bestOf === b ? C.gold : C.line}`, background: bestOf === b ? C.goldSoft : C.sf1, color: bestOf === b ? C.gold : C.tbody,
              }}><span dir="ltr" style={{ fontFamily: 'inherit' }}>Bo{b}</span></button>
            ))}
          </div>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: C.tmut }}>استان بازی</span>
          <select value={province} onChange={e => { setProvince(e.target.value); setCity('') }} required style={inp}>
            {IRAN_GEO.map(p => <option key={p.province} value={p.province}>{p.province}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: C.tmut }}>شهر بازی</span>
          <select value={city} onChange={e => setCity(e.target.value)} required disabled={!province} style={inp}>
            <option value="">انتخاب…</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: C.tmut }}>یادداشت کوتاه (اختیاری)</span>
          <input value={note} onChange={e => setNote(e.target.value)} maxLength={80} placeholder="مثلاً فقط عصرها آزادم" style={inp} />
        </label>

        {err && <div style={{ color: C.live, fontSize: 12 }}>{err}</div>}

        <button type="submit" disabled={busy || !disc || !city} style={{
          minHeight: 48, borderRadius: 12, border: 'none', background: C.accent, color: C.ink, fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: busy ? .6 : 1,
        }}>{busy ? '…' : 'انتشار درخواست'}</button>
      </form>
    </div>
  )
}

const inp: React.CSSProperties = { minHeight: 42, borderRadius: 10, border: `1px solid ${C.line2}`, background: C.sf1, color: C.thi, padding: '0 12px', fontSize: 13 }
