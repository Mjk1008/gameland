'use client'
import { useEffect, useMemo, useState } from 'react'
import { C, Button } from '@/components/ui'
import { IRAN_GEO } from '@/lib/iran-geo'
import { DISC } from '@/lib/mock-data'

type Scope = 'all' | 'province' | 'disc' | 'bracket' | 'players'

interface Picked { id: string; name: string; tag: string; city?: string }
interface EventBrief { compId: string; title: string }
interface ProvincePulse { compId: string; province: string }

// `bare` — see StoryPanel: the board wraps this in a CollapsibleCard that
// already supplies the surface and title.
export default function GroupAnnounceForm({ bare }: { bare?: boolean }) {
  const [scope, setScope] = useState<Scope>('all')
  const [province, setProvince] = useState(IRAN_GEO[0]?.province ?? '')
  const [disc, setDisc] = useState<keyof typeof DISC>('fc26')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // بازیکنایِ یک براکت — event → province → bracket #, all sourced from the
  // same /api/today snapshot the live feed itself uses (no new listing endpoint).
  const [events, setEvents] = useState<EventBrief[]>([])
  const [pulse, setPulse] = useState<ProvincePulse[]>([])
  const [bCompId, setBCompId] = useState('')
  const [bProvince, setBProvince] = useState('')
  const [bIdx, setBIdx] = useState(1)
  useEffect(() => {
    if (scope !== 'bracket' || events.length > 0) return
    fetch('/api/today').then(r => r.json()).then(j => {
      setEvents(j.liveEvents ?? [])
      setPulse(j.provincePulse ?? [])
      if (j.liveEvents?.[0]) setBCompId(j.liveEvents[0].compId)
    }).catch(() => {})
  }, [scope, events.length])
  const provincesForEvent = useMemo(() => pulse.filter(p => p.compId === bCompId).map(p => p.province), [pulse, bCompId])
  useEffect(() => { if (provincesForEvent[0] && !provincesForEvent.includes(bProvince)) setBProvince(provincesForEvent[0]) }, [provincesForEvent, bProvince])

  // پلیرِ خاص — search-as-you-type, capped results, multi-pick via chips
  // (a plain <select> with every user would be unusable at real scale).
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Picked[]>([])
  const [picked, setPicked] = useState<Picked[]>([])
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return }
    let cancelled = false
    const t = setTimeout(() => {
      fetch(`/api/admin/user-search?q=${encodeURIComponent(q.trim())}`)
        .then(r => r.json()).then(j => { if (!cancelled) setResults(j.users ?? []) }).catch(() => {})
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [q])
  function addPlayer(p: Picked) {
    if (!picked.some(x => x.id === p.id)) setPicked(prev => [...prev, p])
    setQ(''); setResults([])
  }
  function removePlayer(id: string) { setPicked(prev => prev.filter(p => p.id !== id)) }

  async function send() {
    setMsg(null)
    if (!text.trim()) return setMsg('متنِ اعلان رو بنویس')
    if (scope === 'players' && picked.length === 0) return setMsg('حداقل یک بازیکن رو انتخاب کن')
    if (scope === 'bracket' && (!bCompId || !bProvince)) return setMsg('رویداد و استان رو انتخاب کن')
    // Every other scope is aimed at people the admin just picked; «همه» is a
    // push to the whole user base and can't be taken back, and the scope chip
    // stays where the last send left it — so this one gets a confirm, the
    // same way the irreversible bracket ops do.
    if (scope === 'all' && !confirm('این اعلان برای همه فرستاده می‌شه. مطمئنی؟')) return
    const audience =
      scope === 'all' ? 'all' :
      scope === 'province' ? `province:${province}` :
      scope === 'disc' ? `disc:${disc}` :
      scope === 'bracket' ? `bracket:${bCompId}:${bProvince}:${bIdx - 1}` :
      'players'
    setBusy(true)
    try {
      const res = await fetch('/api/admin/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'اعلانِ برگزارکننده', body: text.trim(), audience, targetUids: picked.map(p => p.id) }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ارسال نشد')
      setMsg(`به ${j.sent} نفر ارسال شد ✓`)
      setText(''); setPicked([])
    } catch (e: any) { setMsg(e.message) } finally { setBusy(false) }
  }

  return (
    <div style={bare ? { display: 'flex', flexDirection: 'column', gap: 10 } : { display: 'flex', flexDirection: 'column', gap: 10, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 13 }}>
      {!bare && <span style={{ fontSize: 13.5, fontWeight: 700, color: C.thi }}>اعلانِ گروهی</span>}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
        {([['all', 'همه'], ['province', 'استان'], ['disc', 'رشته'], ['bracket', 'براکت'], ['players', 'پلیرِ خاص']] as const).map(([k, l]) => {
          const on = scope === k
          return (
            <button key={k} onClick={() => setScope(k)} style={{
              all: 'unset', cursor: 'pointer', flexShrink: 0, fontSize: 11.5, fontWeight: 700, padding: '6px 10px', borderRadius: 8,
              color: on ? C.ink : C.tbody, background: on ? C.accent : C.sf2, border: `1px solid ${on ? C.accent : C.line}`,
            }}>{l}</button>
          )
        })}
      </div>

      {scope === 'province' && (
        <select value={province} onChange={e => setProvince(e.target.value)} style={sel}>
          {IRAN_GEO.map(p => <option key={p.province} value={p.province}>{p.province}</option>)}
        </select>
      )}
      {scope === 'disc' && (
        <select value={disc} onChange={e => setDisc(e.target.value as keyof typeof DISC)} style={sel}>
          {Object.entries(DISC).map(([id, d]) => <option key={id} value={id}>{d.name}</option>)}
        </select>
      )}

      {scope === 'bracket' && (
        events.length === 0 ? (
          <div style={{ fontSize: 11.5, color: C.tmut, textAlign: 'center', padding: '8px 0' }}>الان رویدادِ زنده‌ای نیست</div>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={bCompId} onChange={e => setBCompId(e.target.value)} style={{ ...sel, flex: 2 }}>
              {events.map(e => <option key={e.compId} value={e.compId}>{e.title}</option>)}
            </select>
            <select value={bProvince} onChange={e => setBProvince(e.target.value)} style={{ ...sel, flex: 1 }} disabled={provincesForEvent.length === 0}>
              {provincesForEvent.length === 0 && <option value="">—</option>}
              {provincesForEvent.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="number" min={1} value={bIdx} onChange={e => setBIdx(Math.max(1, Number(e.target.value) || 1))}
              style={{ ...sel, flex: '0 0 56px', textAlign: 'center' }} />
          </div>
        )
      )}

      {scope === 'players' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {picked.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {picked.map(p => (
                <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: C.accent, background: C.accentSoft, border: `1px solid ${C.accent}44`, borderRadius: 999, padding: '4px 6px 4px 9px' }}>
                  {p.name}
                  <button onClick={() => removePlayer(p.id)} aria-label="حذف" style={{ all: 'unset', cursor: 'pointer', display: 'flex', color: C.accent }}>✕</button>
                </span>
              ))}
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجوی بازیکن…" style={sel} />
            {results.length > 0 && (
              <div style={{ position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, top: '100%', marginTop: 4, background: C.sf2, border: `1px solid ${C.line2}`, borderRadius: 10, overflow: 'hidden', zIndex: 5 }}>
                {results.map(p => (
                  <button key={p.id} onClick={() => addPlayer(p)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: 12.5, color: C.thi, borderBottom: `1px solid ${C.line}` }}>
                    {p.name} <span style={{ color: C.tmut, fontSize: 11 }}>@{p.tag} · {p.city}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <textarea value={text} onChange={e => setText(e.target.value.slice(0, 300))} rows={3}
        placeholder="متنِ اعلان…" style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 12px', minHeight: 58, color: C.thi, fontSize: 12.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />

      {msg && <div style={{ fontSize: 11.5, color: C.tbody }}>{msg}</div>}
      <Button disabled={busy} onClick={send}>{busy ? 'در حالِ ارسال…' : 'ارسالِ اعلان'}</Button>
    </div>
  )
}

const sel: React.CSSProperties = { background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px', color: C.thi, fontSize: 12.5, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }
