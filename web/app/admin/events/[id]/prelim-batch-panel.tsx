'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IRAN_GEO, PROVINCE_NAMES } from '@/lib/iran-geo'
import { C, DISP } from '@/components/ui'

export type BatchPlayer = {
  userId: string
  tag: string
  name: string
  city: string
  province: string
  attempts: number
  seated: number
  assigned: boolean
}

type Scope = 'local' | 'mixed'

function groupKeyOf(p: BatchPlayer, mode: 'city' | 'province') {
  const val = mode === 'province' ? p.province : p.city
  return `${mode}:${val || 'نامشخص'}`
}

type Props = {
  compId: string
  groupMode: 'city' | 'province'
  players: BatchPlayer[]
}

export default function PrelimBatchPanel({ compId, groupMode: initialMode, players }: Props) {
  const router = useRouter()
  const [scope, setScope] = useState<Scope>('local')
  const [mode, setMode] = useState<'city' | 'province'>(initialMode)
  const [place, setPlace] = useState('')
  const [mixedLabel, setMixedLabel] = useState('بازماندگان')
  const [filterProvince, setFilterProvince] = useState('')
  const [bracketCount, setBracketCount] = useState(1)
  const [capacity, setCapacity] = useState(16)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const allRemaining = useMemo(() => players.filter(p => !p.assigned), [players])

  const grouped = useMemo(() => {
    if (scope === 'mixed') {
      const available = filterProvince
        ? allRemaining.filter(p => p.province === filterProvince)
        : allRemaining
      return { available, assigned: players.filter(p => p.assigned) }
    }
    if (!place) return { available: [] as BatchPlayer[], assigned: [] as BatchPlayer[] }
    const inGroup = players.filter(p => groupKeyOf(p, mode) === `${mode}:${place}`)
    return {
      available: inGroup.filter(p => !p.assigned),
      assigned: inGroup.filter(p => p.assigned),
    }
  }, [players, mode, place, scope, filterProvince, allRemaining])

  function openPlace(p: string) {
    setPlace(p)
    setMsg(null)
    const gk = `${mode}:${p}`
    setPicked(new Set(players.filter(x => groupKeyOf(x, mode) === gk && !x.assigned).map(x => x.userId)))
  }

  function enterMixed() {
    setScope('mixed')
    setPlace('')
    setMsg(null)
    setPicked(new Set())
  }

  function toggle(uid: string) {
    setPicked(prev => {
      const n = new Set(prev)
      if (n.has(uid)) n.delete(uid)
      else n.add(uid)
      return n
    })
  }

  const ready = scope === 'mixed' ? picked.size > 0 : !!place && picked.size > 0
  const pickedSeats = useMemo(() => {
    let s = 0
    for (const uid of picked) {
      const p = players.find(x => x.userId === uid)
      if (!p) continue
      s += Math.max(0, p.attempts - p.seated)
    }
    return s
  }, [picked, players])
  const minCap = pickedSeats > 0 ? Math.ceil(pickedSeats / bracketCount) : 0

  async function create() {
    if (!ready) return
    setBusy(true); setMsg(null)
    try {
      const body = scope === 'mixed'
        ? {
            compId,
            mixed: true,
            batchLabel: mixedLabel.trim() || 'بازماندگان',
            bracketCount,
            capacityPerBracket: capacity,
            userIds: [...picked],
          }
        : {
            compId,
            groupMode: mode,
            place,
            bracketCount,
            capacityPerBracket: capacity,
            userIds: [...picked],
          }
      const res = await fetch('/api/admin/draw-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      setMsg({ ok: true, text: `${j.brackets} براکت · ${picked.size} نفر` })
      setPicked(new Set())
      router.refresh()
    } catch (e: any) { setMsg({ ok: false, text: e.message }) }
    finally { setBusy(false) }
  }

  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px', color: C.thi, fontFamily: 'inherit', fontSize: 12.5 }

  const showForm = scope === 'mixed' || !!place

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => { setScope('local'); setPlace(''); setPicked(new Set()) }} style={seg(scope === 'local')}>استان / شهر</button>
        <button type="button" onClick={enterMixed} style={seg(scope === 'mixed')}>ترکیبی</button>
      </div>

      {scope === 'local' && (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['city', 'province'] as const).map(m => (
              <button key={m} type="button" onClick={() => { setMode(m); setPlace(''); setPicked(new Set()) }} style={segSmall(mode === m)}>
                {m === 'city' ? 'شهر' : 'استان'}
              </button>
            ))}
          </div>
          <select value={place} onChange={e => openPlace(e.target.value)} style={inp}>
            <option value="">انتخاب {mode === 'city' ? 'شهر' : 'استان'}…</option>
            {(mode === 'province' ? PROVINCE_NAMES : IRAN_GEO.flatMap(p => p.cities)).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </>
      )}

      {scope === 'mixed' && (
        <>
          <input value={mixedLabel} onChange={e => setMixedLabel(e.target.value)} style={inp} dir="rtl" />
          <select value={filterProvince} onChange={e => setFilterProvince(e.target.value)} style={inp}>
            <option value="">همهٔ استان‌ها</option>
            {PROVINCE_NAMES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <div style={{ fontSize: 11.5, color: C.tmut }}>{allRemaining.length} بازمانده در کل</div>
        </>
      )}

      {showForm && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: C.tmut }}>تعداد براکت</span>
              <input type="number" min={1} max={6} value={bracketCount} onChange={e => setBracketCount(Number(e.target.value))} style={inp} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: C.tmut }}>ظرفیت هر براکت</span>
              <input type="number" min={2} max={2048} value={capacity} onChange={e => setCapacity(Number(e.target.value))} style={inp} />
            </label>
          </div>

          {pickedSeats > 0 && (
            <div style={{ fontSize: 11.5, color: minCap > capacity ? C.live : C.tmut }}>
              {pickedSeats} سهم · ~{minCap} در هر براکت
            </div>
          )}

          {scope === 'local' && (
            <div style={{ fontSize: 11.5, color: C.tmut }}>
              {grouped.available.length} باقی‌مانده
              {grouped.assigned.length > 0 && ` · ${grouped.assigned.length} چیده‌شده`}
            </div>
          )}

          <div style={{ maxHeight: 280, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4, border: `1px solid ${C.line}`, borderRadius: 10, padding: 8 }}>
            {grouped.available.length === 0 && (
              <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: 12 }}>بازیکن باقی‌مانده‌ای نیست</div>
            )}
            {grouped.available.map(p => (
              <label key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', background: C.ink, borderRadius: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={picked.has(p.userId)} onChange={() => toggle(p.userId)} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span dir="ltr" style={{ fontFamily: DISP, fontSize: 12.5, fontWeight: 700, color: C.thi }}>@{p.tag}</span>
                  <span style={{ fontSize: 11, color: C.tmut, marginInlineStart: 8 }}>
                    {p.name} · {p.province} · {p.city} · {p.attempts - p.seated > 0 && p.seated > 0 ? `${p.attempts - p.seated}/${p.attempts} سهم` : `${p.attempts} سهم`}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <button type="button" disabled={busy || !ready} onClick={create} style={primaryBtn(busy || !ready)}>
            {busy ? 'در حال چیدن…' : 'ساخت براکت'}
          </button>
        </>
      )}

      {msg && (
        <div style={{ fontSize: 12.5, color: msg.ok ? C.win : C.live, background: msg.ok ? C.winSoft : C.liveSoft, border: `1px solid ${(msg.ok ? C.win : C.live)}55`, padding: 10, borderRadius: 10 }}>
          {msg.text}
        </div>
      )}
    </div>
  )
}

const seg = (on: boolean): React.CSSProperties => ({ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 40, fontSize: 12.5, fontWeight: 700, borderRadius: 10, border: `1px solid ${on ? C.accent : C.line}`, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody })
const segSmall = (on: boolean): React.CSSProperties => ({ ...seg(on), minHeight: 36, fontSize: 12 })
function primaryBtn(disabled: boolean): React.CSSProperties {
  return { all: 'unset', cursor: disabled ? 'not-allowed' : 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center', minHeight: 48, lineHeight: '48px', background: C.accent, color: '#0B0A08', fontWeight: 800, fontSize: 14, borderRadius: 11, opacity: disabled ? 0.5 : 1 }
}
