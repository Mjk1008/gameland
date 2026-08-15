'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { DISC, Player, Disc } from '@/lib/mock-data'
import { C, DISP, Num, GameBadge } from '@/components/ui'
import PageLoading from '@/components/PageLoading'

type DiscFilter = 'all' | Disc
type Row = Player & { uid: string; hasAvatar: boolean; card: string | null }

const DISCS: { id: DiscFilter; name: string }[] = [
  { id: 'all', name: 'همه' },
  ...(Object.keys(DISC) as Disc[]).map(id => ({ id, name: DISC[id].name })),
]

const PAGE = 50

export interface CityRow { city: string; gamers: number; points: number }

async function fetchRanking(params: { offset: number; q: string; disc: DiscFilter }) {
  const sp = new URLSearchParams({ limit: String(PAGE), offset: String(params.offset) })
  if (params.disc !== 'all') sp.set('disc', params.disc)
  if (params.q.trim()) sp.set('q', params.q.trim())
  const res = await fetch(`/api/ranking?${sp}`)
  const j = await res.json()
  if (!res.ok) throw new Error(j.error || 'بارگذاری رنkینگ ناموفق بود')
  return j as {
    ranked: Row[]
    total: number
    cities?: CityRow[]
    meTag?: string
    me?: Row | null
  }
}

export default function LeaderboardClient() {
  const [q, setQ] = useState('')
  const [disc, setDisc] = useState<DiscFilter>('all')
  const [view, setView] = useState<'players' | 'cities'>('players')
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [cities, setCities] = useState<CityRow[]>([])
  const [meTag, setMeTag] = useState<string>()
  const [me, setMe] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async (offset: number, append: boolean) => {
    try {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setErr(null)
      const j = await fetchRanking({ offset, q, disc })
      setRows(prev => append ? [...prev, ...j.ranked] : j.ranked)
      setTotal(j.total)
      if (!append && j.cities) setCities(j.cities)
      if (!append) {
        setMeTag(j.meTag)
        setMe(j.me ?? null)
      }
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [q, disc])

  useEffect(() => {
    const t = setTimeout(() => { load(0, false) }, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, q])

  if (loading && rows.length === 0) return <PageLoading variant="leaderboard" />

  if (err && rows.length === 0) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center', color: C.tmut, fontSize: 13 }}>
        {err}
        <button type="button" onClick={() => load(0, false)} style={{ all: 'unset', cursor: 'pointer', display: 'block', margin: '12px auto 0', color: C.accent, fontWeight: 700 }}>
          دوباره امتحان کن
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-up">
      <div style={{ position: 'sticky', top: 'env(safe-area-inset-top, 0px)', zIndex: 5, background: 'rgba(20,17,13,.94)', backdropFilter: 'blur(10px)', padding: '14px 16px 10px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: C.thi }}>رنkینگ ملی</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {cities.length > 1 && (
              <div style={{ display: 'flex', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 999, padding: 2 }}>
                {([['players', 'گیمرها'], ['cities', 'شهرها']] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setView(k)} style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: view === k ? C.accent : 'transparent', color: view === k ? C.ink : C.tbody }}>{l}</button>
                ))}
              </div>
            )}
            {view === 'players' && <span className="gl-num" style={{ fontSize: 12, color: C.tmut }}>{rows.length}/{total}</span>}
          </div>
        </div>

        {me && view === 'players' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.accentSoft, border: `1px solid ${C.accent}66`, borderRadius: 11, padding: '9px 13px', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>رتبهٔ تو</span>
            <span className="gl-num" style={{ fontSize: 19, fontWeight: 800, color: C.accent }}>#{me.rank}</span>
            <span style={{ flex: 1 }} />
            <span className="gl-num" style={{ fontSize: 14, fontWeight: 800, color: C.thi }}>{me.points.toLocaleString('en-US')}</span>
            <span style={{ fontSize: 10.5, color: C.tmut }}>امتیاز</span>
          </div>
        )}

        {view === 'players' && (
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجوی نام، تگ یا شهر"
              style={{ width: '100%', boxSizing: 'border-box', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 38px 11px 13px', color: C.thi, fontSize: 13, outline: 'none' }} />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.tmut} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
        )}

        {view === 'players' && (
          <div className="gl-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -16px', padding: '0 16px' }}>
            {DISCS.map(d => {
              const on = disc === d.id
              return (
                <button key={d.id} onClick={() => setDisc(d.id)} style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 999, background: on ? C.accent : C.sf1, color: on ? C.ink : C.tbody, border: `1px solid ${on ? C.accent : C.line}` }}>
                  {d.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {view === 'cities' && (
        <div style={{ padding: '12px 16px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cities.map((c, i) => {
            const isMyCity = me?.city && c.city === me.city
            const maxPts = cities[0]?.points || 1
            return (
              <div key={c.city} style={{ background: isMyCity ? C.accentSoft : C.sf1, border: `1px solid ${isMyCity ? C.accent : C.line}`, borderRadius: 12, padding: '11px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="gl-num" style={{ width: 22, textAlign: 'center', fontWeight: 800, fontSize: 18, color: i === 0 ? C.accent : i < 3 ? C.gold : C.tmut }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.thi }}>{c.city}{isMyCity ? ' · شهرِ تو' : ''}</span>
                    <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}><span className="gl-num">{c.gamers}</span> گیمر</div>
                  </div>
                  <Num size={20}>{c.points.toLocaleString('en-US')}</Num>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: C.sf2, overflow: 'hidden', marginTop: 9 }}>
                  <div style={{ height: '100%', width: `${(c.points / maxPts) * 100}%`, background: i === 0 ? C.accent : C.gold, borderRadius: 3, opacity: i === 0 ? 1 : 0.75 }} />
                </div>
              </div>
            )
          })}
          <p style={{ fontSize: 11, color: C.tmut, textAlign: 'center', marginTop: 6 }}>امتیازِ شهر = جمعِ امتیازِ گیمرهاش — شهرت رو بالا بکش 🏙️</p>
        </div>
      )}

      {view === 'players' && (
        <div style={{ padding: '12px 16px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && rows.length > 0 && (
            <div style={{ textAlign: 'center', fontSize: 11, color: C.tmut, padding: 6 }}>در حال جستجو…</div>
          )}
          {rows.length === 0 && !loading ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: C.tmut, fontSize: 13 }}>گیمری با این مشخصات پیدا نشد — فیلتر یا جستجو رو عوض کن.</div>
          ) : rows.map(p => {
            const d = DISC[p.disc]
            const isMe = meTag && p.tag.toLowerCase() === meTag.toLowerCase()
            return (
              <Link key={`${p.uid}-${p.rank}`} href={`/players/${p.tag.toLowerCase()}`} style={{ all: 'unset', cursor: 'pointer', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 13, boxSizing: 'border-box', padding: '11px 13px', background: isMe ? C.accentSoft : C.sf1, border: `1px solid ${isMe ? C.accent : C.line}`, borderRadius: 12 }}>
                {isMe && <span style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 3, background: C.accent }} />}
                <span className="gl-num" style={{ width: 22, textAlign: 'center', fontWeight: 800, fontSize: 19, color: p.rank === 1 ? C.accent : p.rank <= 3 ? C.gold : C.tmut, flexShrink: 0 }}>{p.rank}</span>
                <div style={{ width: 54, height: 54, borderRadius: 13, overflow: 'hidden', background: C.line, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${p.rank <= 3 ? C.gold + '88' : C.line2}` }}>
                  {p.hasAvatar
                    ? <img src={`/api/avatar/${p.uid}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : p.card
                    ? <img src={p.card} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 18%' }} />
                    : <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 20, color: C.thi }}>{p.tag[0]?.toUpperCase()}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: C.thi }}>{p.name}{isMe ? ' · تو' : ''}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <GameBadge disc={p.disc} size={16} />
                    <span style={{ fontSize: 11, color: C.tmut }}>{d?.name} · {p.city}</span>
                  </div>
                </div>
                <Num size={22}>{p.points.toLocaleString('en-US')}</Num>
              </Link>
            )
          })}
          {rows.length < total && (
            <button type="button" disabled={loadingMore} onClick={() => load(rows.length, true)} style={{ all: 'unset', cursor: loadingMore ? 'wait' : 'pointer', textAlign: 'center', minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: C.sf2, border: `1px solid ${C.line}`, color: C.tbody, fontSize: 13, fontWeight: 700 }}>
              {loadingMore ? 'در حال بارگذاری…' : <>نمایشِ بیشتر (<span className="gl-num">{total - rows.length}</span> نفرِ دیگه)</>}
            </button>
          )}
        </div>
      )}

      {view === 'players' && (
        <p style={{ fontSize: 11, color: C.tmut, padding: '0 16px 12px', textAlign: 'center' }}>
          امتیاز از نتایج + فعالیتت (پروفایل، عکس، سهم‌ها) ساخته می‌شه · در تساوی: مسابقهٔ بیشتر ← بهترین مقام
        </p>
      )}
    </div>
  )
}
