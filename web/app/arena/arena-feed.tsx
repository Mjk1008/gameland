'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { C, DISP, GameBadge } from '@/components/ui'
import { DISC } from '@/lib/mock-data'
import { IRAN_GEO, citiesOf } from '@/lib/iran-geo'
import { timeAgoFa } from '@/lib/arena-ui'
import { faDigits } from '@/lib/jalali'
import { track } from '@/lib/track'

type ArenaStats = {
  requestsTotal: number
  requestsOpen: number
  matchesConfirmed: number
  ccrPercent: number
  citiesWithOpen: number
}

type ReqRow = {
  id: string; disc: string; bestOf: number; city: string; province: string; note: string
  createdAt: number; userId: string
  requester: { id: string; name: string; tag: string; city: string } | null
}

interface Props {
  myId: string
  defaultCity: string
  defaultProvince: string
  discs: string[]
  enabled: boolean
  myCityOpenCount: number
}

export default function ArenaFeed({ myId, defaultCity, defaultProvince, discs, enabled, myCityOpenCount }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const [city, setCity] = useState(sp.get('city') || '')
  const [province, setProvince] = useState(sp.get('province') || '')
  const [disc, setDisc] = useState(sp.get('disc') || '')
  const [allDiscs, setAllDiscs] = useState(
    sp.get('allDiscs') !== '0' && (sp.get('allDiscs') === '1' || process.env.NODE_ENV === 'development'),
  )
  const [rows, setRows] = useState<ReqRow[]>([])
  const [busy, setBusy] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [stats, setStats] = useState<ArenaStats | null>(null)

  const ensureDemo = useCallback(async () => {
    if (!enabled || process.env.NODE_ENV !== 'development') return
    setSeeding(true)
    try {
      const check = await fetch('/api/arena/seed')
      const cj = await check.json()
      if (cj.stats) setStats(cj.stats)
      if ((cj.stats?.requestsOpen ?? 0) < 8) {
        const res = await fetch('/api/arena/seed', { method: 'POST' })
        const j = await res.json()
        if (j.stats) setStats(j.stats)
      }
    } finally { setSeeding(false) }
  }, [enabled])

  const load = useCallback(async () => {
    if (!enabled) return
    setBusy(true)
    try {
      const q = new URLSearchParams()
      if (province) q.set('province', province)
      if (disc) q.set('disc', disc)
      const r = await fetch(`/api/arena/requests?${q}`)
      const j = await r.json()
      setRows(j.requests ?? [])
      track('arena_feed_view', { city, province, disc: disc || 'all' })
    } finally { setBusy(false) }
  }, [province, disc, enabled, city])

  useEffect(() => {
    track('arena_tab_open')
    void (async () => {
      await ensureDemo()
      await load()
    })()
  }, [ensureDemo, load])

  useEffect(() => {
    const q = new URLSearchParams()
    if (city) q.set('city', city)
    if (province) q.set('province', province)
    if (disc) q.set('disc', disc)
    if (allDiscs) q.set('allDiscs', '1')
    else q.set('allDiscs', '0')
    router.replace(`/arena?${q}`, { scroll: false })
  }, [city, province, disc, allDiscs, router])

  const cities = province ? citiesOf(province) : []

  const filteredRows = useMemo(() => {
    let list = rows
    if (!disc && !allDiscs && discs.length) list = list.filter(r => discs.includes(r.disc))
    if (city) list = list.filter(r => r.city === city)
    return list
  }, [rows, disc, allDiscs, discs, city])

  const cityChips = useMemo(() => {
    const byCity = new Map<string, { city: string; province: string; count: number }>()
    for (const r of rows) {
      if (!disc && !allDiscs && discs.length && !discs.includes(r.disc)) continue
      if (disc && r.disc !== disc) continue
      const key = `${r.city}|${r.province}`
      const cur = byCity.get(key) ?? { city: r.city, province: r.province, count: 0 }
      cur.count++
      byCity.set(key, cur)
    }
    return [...byCity.values()].sort((a, b) => b.count - a.count)
  }, [rows, disc, allDiscs, discs])

  const showCityBadge = city === defaultCity && myCityOpenCount > 0

  if (!enabled) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center' }}>
        <p style={{ color: C.tbody, lineHeight: 2 }}>میدون روی این محیط فعال نیست.<br />تو <code>.env.local</code> بذار: <code>ARENA_ENABLED=true</code></p>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontFamily: DISP, fontSize: 11, fontWeight: 800, letterSpacing: '.28em', color: C.accent }}>PLAY ARENA</div>
          <h1 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: C.thi }}>میدون</h1>
          {showCityBadge && (
            <div style={{ marginTop: 6, display: 'inline-block', fontSize: 11, fontWeight: 700, color: C.gold, background: C.goldSoft, border: `1px solid ${C.gold}44`, borderRadius: 999, padding: '4px 10px' }}>
              {myCityOpenCount} درخواست باز در {defaultCity}
            </div>
          )}
        </div>
        <Link href="/me/arena" style={{ fontSize: 12, fontWeight: 700, color: C.gold, textDecoration: 'none', flexShrink: 0, marginTop: 4 }}>صندوق من ›</Link>
      </div>

      {process.env.NODE_ENV === 'development' && stats && (
        <div style={{
          background: C.sf1, border: `1px solid ${C.accent}44`, borderRadius: 12, padding: '10px 12px',
          fontSize: 11, color: C.tbody, lineHeight: 1.9,
        }}>
          <div style={{ fontFamily: DISP, fontSize: 10, fontWeight: 800, letterSpacing: '.2em', color: C.accent, marginBottom: 4 }}>DEMO · ۱ ماه بعد لانچ</div>
          {faDigits(stats.requestsOpen)} درخواست باز · {faDigits(stats.citiesWithOpen)} شهر · {faDigits(stats.matchesConfirmed)} بازی OK · CCR {faDigits(stats.ccrPercent)}%
          <button
            type="button"
            disabled={seeding || busy}
            onClick={() => ensureDemo().then(load)}
            style={{ all: 'unset', display: 'block', cursor: 'pointer', marginTop: 4, color: C.gold, fontWeight: 700 }}
          >
            {seeding ? 'در حال seed…' : '↻ seed دوباره'}
          </button>
        </div>
      )}

      {process.env.NODE_ENV === 'development' && !stats && seeding && (
        <div style={{ textAlign: 'center', fontSize: 12, color: C.tmut }}>دیتای تست در حال لود…</div>
      )}

      {cityChips.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 10, color: C.tmut, fontWeight: 700 }}>شهرهای فعال</span>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, WebkitOverflowScrolling: 'touch' }}>
            {cityChips.map(c => {
              const on = city === c.city && province === c.province
              return (
                <button
                  key={`${c.city}|${c.province}`}
                  type="button"
                  onClick={() => {
                    if (on) { setCity(''); setProvince('') }
                    else { setCity(c.city); setProvince(c.province) }
                  }}
                  style={{
                    flexShrink: 0, border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 999,
                    background: on ? C.accentSoft : C.sf1, color: on ? C.accent : C.tbody,
                    padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {c.city} <span style={{ color: on ? C.accent : C.gold, fontFamily: DISP }}>{c.count}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, color: C.tmut }}>استان</span>
          <select value={province} onChange={e => { setProvince(e.target.value); setCity('') }} style={sel}>
            <option value="">همه ایران</option>
            {IRAN_GEO.map(p => <option key={p.province} value={p.province}>{p.province}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, color: C.tmut }}>شهر</span>
          <select value={city} onChange={e => setCity(e.target.value)} disabled={!province} style={sel}>
            <option value="">{province ? 'همه شهرها' : 'اول استان'}</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button type="button" onClick={() => { setDisc(''); setAllDiscs(true) }} style={chip(allDiscs && !disc)}>همه رشته‌ها</button>
        {(discs.length ? discs : Object.keys(DISC)).map(d => (
          <button key={d} type="button" onClick={() => { setDisc(d === disc ? '' : d); setAllDiscs(false) }} style={chip(disc === d)}>
            {DISC[d as keyof typeof DISC]?.short ?? d}
          </button>
        ))}
      </div>

      <Link href="/arena/new" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 46, borderRadius: 12, background: C.accent, color: C.ink, fontWeight: 800, fontSize: 13.5 }}>
        + درخواست بازی بذار
      </Link>

      {busy && <div style={{ textAlign: 'center', color: C.tmut, fontSize: 12 }}>…</div>}

      {!busy && filteredRows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 12px', color: C.tbody, lineHeight: 2, fontSize: 13 }}>
          {city ? `تو ${city} درخواست باز نیست.` : 'درخواست بازی باز نیست.'}<br />
          {city !== defaultCity && defaultCity ? (
            <button type="button" onClick={() => { setCity(defaultCity); setProvince(defaultProvince) }} style={{ all: 'unset', cursor: 'pointer', color: C.accent, fontWeight: 700, marginTop: 4 }}>
              برگرد به {defaultCity}
            </button>
          ) : 'اولین نفر باش — یا از شهرهای فعال بالا انتخاب کن.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredRows.map(r => {
          const canAccept = r.requester?.id !== myId
          return (
            <Link key={r.id} href={`/arena/requests/${r.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'block', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <GameBadge disc={r.disc as any} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 13.5, color: C.thi }}>@{r.requester?.tag ?? '؟'} · Bo{r.bestOf}</div>
                  <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>{r.city} · {DISC[r.disc as keyof typeof DISC]?.name ?? r.disc} · {timeAgoFa(r.createdAt)}</div>
                  {r.note && <div style={{ fontSize: 11, color: C.tbody, marginTop: 4 }}>{r.note}</div>}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: canAccept ? C.gold : C.accent }}>{canAccept ? 'قبول ›' : 'جزئیات ›'}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

const sel: React.CSSProperties = { minHeight: 40, borderRadius: 10, border: `1px solid ${C.line2}`, background: C.sf1, color: C.thi, padding: '0 10px', fontSize: 12 }
function chip(on: boolean): React.CSSProperties {
  return { border: `1px solid ${on ? C.accent : C.line}`, background: on ? C.accentSoft : C.sf1, color: on ? C.accent : C.tbody, borderRadius: 999, padding: '6px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
}
