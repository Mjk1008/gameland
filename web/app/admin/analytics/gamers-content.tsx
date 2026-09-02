'use client'
import { useMemo, useState } from 'react'
import { C, DISP, DISC_DOT, EmptyState } from '@/components/ui'
import type { Disc } from '@/lib/mock-data'
import { faDigits } from '@/lib/jalali'
import { citiesOf, PROVINCE_NAMES, provinceOf } from '@/lib/iran-geo'

export type GamerRegStatus = 'pending' | 'approved' | 'rejected'
export interface GamerReg {
  event: string
  disc: Disc
  status: GamerRegStatus
  tickets: number
}
export interface GamerListRec {
  id: string
  name: string
  tag: string
  phone: string
  city: string
  province: string
  regs: GamerReg[]
}

const ST = [
  { key: 'approved' as const, label: 'تاییدشده', color: C.win, soft: C.winSoft },
  { key: 'pending' as const, label: 'در انتظار', color: C.gold, soft: C.goldSoft },
  { key: 'rejected' as const, label: 'ردشده', color: C.live, soft: C.liveSoft },
]
const ALL_STATUS: Record<GamerRegStatus, boolean> = { approved: true, pending: true, rejected: true }
const PAGE = 80

const selectStyle: React.CSSProperties = {
  background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10,
  padding: '10px 12px', color: C.thi, fontSize: 13, outline: 'none',
  fontFamily: 'inherit', width: '100%',
}

function shortEvent(title: string) {
  return title.replace(/^GAME LAND THE BEST IV\s*[—–-]\s*/i, '').trim() || title
}

export default function GamersContent({ players, discOptions, cityOptions, provinceOptions }: {
  players: GamerListRec[]
  discOptions: { key: Disc; name: string }[]
  cityOptions: string[]
  provinceOptions: string[]
}) {
  const [disc, setDisc] = useState<Disc | 'all'>('all')
  const [province, setProvince] = useState<string | 'all'>('all')
  const [city, setCity] = useState<string | 'all'>('all')
  const [statusOn, setStatusOn] = useState(ALL_STATUS)
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(PAGE)

  const provinces = provinceOptions.length ? provinceOptions : PROVINCE_NAMES
  const citiesForDropdown = useMemo(() => {
    if (province === 'all') return cityOptions
    const allowed = new Set(citiesOf(province))
    const fromData = cityOptions.filter(c => allowed.has(c))
    for (const p of players) {
      if (p.province === province && p.city !== 'نامشخص' && !fromData.includes(p.city)) fromData.push(p.city)
    }
    if (fromData.length) return fromData
    return citiesOf(province)
  }, [cityOptions, province, players])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out: { player: GamerListRec; regs: GamerReg[] }[] = []
    for (const p of players) {
      if (province !== 'all' && p.province !== province) continue
      if (city !== 'all' && p.city !== city) continue
      const regs = p.regs.filter(r =>
        (disc === 'all' || r.disc === disc) && statusOn[r.status]
      )
      if (regs.length === 0) continue
      if (needle) {
        const blob = `${p.name} ${p.tag} ${p.phone} ${p.city} ${p.province}`.toLowerCase()
        if (!blob.includes(needle) && !p.phone.includes(q.trim())) continue
      }
      out.push({ player: p, regs })
    }
    out.sort((a, b) => a.player.name.localeCompare(b.player.name, 'fa'))
    return out
  }, [players, province, city, disc, statusOn, q])

  const counts = useMemo(() => {
    let approved = 0, pending = 0, rejected = 0, tickets = 0
    for (const { regs } of filtered) {
      for (const r of regs) {
        if (r.status === 'approved') { approved++; tickets += r.tickets }
        else if (r.status === 'pending') pending++
        else rejected++
      }
    }
    return { approved, pending, rejected, tickets }
  }, [filtered])

  const anyStatusOff = !statusOn.approved || !statusOn.pending || !statusOn.rejected
  const activeFilters = (disc !== 'all' ? 1 : 0) + (province !== 'all' ? 1 : 0) + (city !== 'all' ? 1 : 0) + (anyStatusOff ? 1 : 0)

  const pickProvince = (value: string) => { setProvince(value); setCity('all'); setShown(PAGE) }
  const pickCity = (value: string) => {
    setCity(value)
    setShown(PAGE)
    if (value !== 'all') {
      const hit = players.find(p => p.city === value)
      setProvince(hit?.province || provinceOf(value) || 'all')
    }
  }
  const toggleStatus = (key: GamerRegStatus) => {
    setStatusOn(s => {
      const next = { ...s, [key]: !s[key] }
      if (!next.approved && !next.pending && !next.rejected) return ALL_STATUS
      return next
    })
    setShown(PAGE)
  }
  const clearFilters = () => {
    setDisc('all'); setProvince('all'); setCity('all'); setStatusOn(ALL_STATUS); setQ(''); setShown(PAGE)
  }

  const visible = filtered.slice(0, shown)

  return (
    <div style={{ padding: '0 16px 30px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ChipRow>
        <Chip on={disc === 'all'} onClick={() => { setDisc('all'); setShown(PAGE) }}>همهٔ رشته‌ها</Chip>
        {discOptions.map(d => (
          <Chip key={d.key} on={disc === d.key} onClick={() => { setDisc(d.key); setShown(PAGE) }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: DISC_DOT[d.key] ?? C.tmut, display: 'inline-block', marginInlineEnd: 6 }} />
            {d.name}
          </Chip>
        ))}
      </ChipRow>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.tmut }}>استان</span>
        <select value={province} onChange={e => pickProvince(e.target.value)} style={selectStyle}>
          <option value="all">همهٔ استان‌ها</option>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.tmut }}>شهر</span>
        <select value={city} onChange={e => pickCity(e.target.value)} style={selectStyle}>
          <option value="all">{province === 'all' ? 'همهٔ شهرها' : `همهٔ شهرهای ${province}`}</option>
          {citiesForDropdown.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <ChipRow>
        <span style={{ fontSize: 11, color: C.tmut, alignSelf: 'center', paddingInlineEnd: 2, flexShrink: 0 }}>سهم:</span>
        {ST.map(s => (
          <Chip key={s.key} on={statusOn[s.key]} onClick={() => toggleStatus(s.key)}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: s.color, display: 'inline-block', marginInlineEnd: 6, opacity: statusOn[s.key] ? 1 : 0.35 }} />
            {s.label}
          </Chip>
        ))}
      </ChipRow>

      <input value={q} onChange={e => { setQ(e.target.value); setShown(PAGE) }}
        placeholder="جستجوی نام، تگ، شماره یا شهر"
        style={{ width: '100%', boxSizing: 'border-box', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 13px', color: C.thi, fontSize: 13, outline: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: C.tmut }}>{activeFilters ? `${faDigits(activeFilters)} فیلتر فعال` : 'بدون فیلتر — ثبت‌نام‌کرده‌ها'}</span>
        {activeFilters > 0 || q ? (
          <button onClick={clearFilters} style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, padding: '6px 12px', borderRadius: 9, background: C.sf2, color: C.tbody, border: `1px solid ${C.line}` }}>پاک‌کردن</button>
        ) : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
        <Mini label="گیمر" value={filtered.length} color={C.accent} />
        <Mini label="تایید" value={counts.approved} color={C.win} />
        <Mini label="انتظار" value={counts.pending} color={C.gold} />
        <Mini label="رد" value={counts.rejected} color={C.live} />
      </div>
      {counts.tickets > 0 && (
        <div style={{ fontSize: 11.5, color: C.tmut }}>
          جمع سهمِ تاییدشده: <span className="gl-num" style={{ color: C.win, fontWeight: 800 }}>{faDigits(counts.tickets)}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}>
          <EmptyState text="گیمری با این فیلتر نیست." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map(({ player: p, regs }) => (
            <div key={p.id} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 13px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.line, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: C.thi }}>{p.tag[0]?.toUpperCase() || '?'}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: C.thi }}>{p.name}</div>
                  <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 2, textAlign: 'right' }}>
                    @{p.tag}{p.phone ? ` · ${p.phone}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: C.tbody, marginTop: 3 }}>
                    {p.province !== 'نامشخص' ? p.province : ''}{p.province !== 'نامشخص' && p.city !== 'نامشخص' ? '، ' : ''}{p.city !== 'نامشخص' ? p.city : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {regs.map((r, i) => {
                  const st = ST.find(s => s.key === r.status)!
                  return (
                    <span key={i} style={{
                      fontSize: 10.5, fontWeight: 700, padding: '4px 8px', borderRadius: 8,
                      background: st.soft, color: st.color, border: `1px solid ${st.color}44`,
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: DISC_DOT[r.disc] ?? C.tmut }} />
                      {shortEvent(r.event)}
                      <span style={{ opacity: 0.8 }}>· {faDigits(r.tickets)} سهم</span>
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
          {filtered.length > shown && (
            <button onClick={() => setShown(s => s + PAGE)}
              style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', fontSize: 12.5, fontWeight: 700, padding: '12px', borderRadius: 12, background: C.sf1, color: C.accent, border: `1px solid ${C.line}` }}>
              نمایش بیشتر ({faDigits(filtered.length - shown)} نفر)
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Mini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '11px 6px', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
      <span className="gl-num" style={{ fontFamily: DISP, fontSize: 18, fontWeight: 800, color }}>{faDigits(value)}</span>
      <span style={{ fontSize: 10, color: C.tmut, fontWeight: 600 }}>{label}</span>
    </div>
  )
}
function ChipRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2 }}>{children}</div>
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ all: 'unset', cursor: 'pointer', whiteSpace: 'nowrap', flex: '0 0 auto', fontSize: 12, fontWeight: 700, padding: '8px 13px', borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}`, display: 'inline-flex', alignItems: 'center' }}>{children}</button>
  )
}
