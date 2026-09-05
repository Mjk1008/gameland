'use client'
import { useState } from 'react'
import { C, Button } from '@/components/ui'
import { IRAN_GEO } from '@/lib/iran-geo'
import { DISC } from '@/lib/mock-data'

type Scope = 'all' | 'province' | 'disc'

export default function GroupAnnounceForm() {
  const [scope, setScope] = useState<Scope>('all')
  const [province, setProvince] = useState(IRAN_GEO[0]?.province ?? '')
  const [disc, setDisc] = useState<keyof typeof DISC>('fc26')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function send() {
    setMsg(null)
    if (!text.trim()) return setMsg('متنِ اعلان رو بنویس')
    const audience = scope === 'all' ? 'all' : scope === 'province' ? `province:${province}` : `disc:${disc}`
    setBusy(true)
    try {
      const res = await fetch('/api/admin/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'اعلانِ برگزارکننده', body: text.trim(), audience }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ارسال نشد')
      setMsg(`به ${j.sent} نفر ارسال شد ✓`)
      setText('')
    } catch (e: any) { setMsg(e.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 13 }}>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: C.thi }}>اعلانِ گروهی</span>
      <div style={{ display: 'flex', gap: 6 }}>
        {([['all', 'همه'], ['province', 'استان'], ['disc', 'رشته']] as const).map(([k, l]) => {
          const on = scope === k
          return (
            <button key={k} onClick={() => setScope(k)} style={{
              all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, padding: '6px 10px', borderRadius: 8,
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

      <textarea value={text} onChange={e => setText(e.target.value.slice(0, 300))} rows={3}
        placeholder="متنِ اعلان…" style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 12px', minHeight: 58, color: C.thi, fontSize: 12.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />

      {msg && <div style={{ fontSize: 11.5, color: C.tbody }}>{msg}</div>}
      <Button disabled={busy} onClick={send}>{busy ? 'در حالِ ارسال…' : 'ارسالِ اعلان'}</Button>
    </div>
  )
}

const sel: React.CSSProperties = { background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px', color: C.thi, fontSize: 12.5, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }
