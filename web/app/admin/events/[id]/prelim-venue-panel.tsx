'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IRAN_GEO, PROVINCE_NAMES } from '@/lib/iran-geo'
import type { PrelimVenue } from '@/lib/store'
import { C } from '@/components/ui'

type GamenetPick = { id: string; name: string; city: string; province?: string }

export default function PrelimVenuePanel({
  compId, groupMode, prelimVenues, gamenetOptions,
}: {
  compId: string
  groupMode: 'city' | 'province'
  prelimVenues: Record<string, PrelimVenue>
  gamenetOptions: GamenetPick[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [mode, setMode] = useState<'city' | 'province'>(groupMode)
  const [place, setPlace] = useState('')
  const [form, setForm] = useState<PrelimVenue>({})
  const [editingKey, setEditingKey] = useState<string | null>(null)

  const groupKey = place ? `${mode}:${place}` : ''
  const entries = Object.entries(prelimVenues)

  function loadEntry(key: string) {
    const v = prelimVenues[key]
    const [m, p] = key.split(':')
    setMode(m as 'city' | 'province')
    setPlace(p)
    setForm({ ...v })
    setEditingKey(key)
  }

  function resetForm() {
    setPlace(''); setForm({}); setEditingKey(null); setMsg(null)
  }

  async function save() {
    if (!groupKey) { setMsg('اول شهر یا استان رو انتخاب کن'); return }
    if (!form.gamenetId && !form.venueName?.trim()) { setMsg('نام محل یا گیم‌نت الزامیه'); return }
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/prelim-venue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compId, groupKey, venue: form }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ذخیره نشد')
      resetForm()
      router.refresh()
    } catch (e: any) { setMsg(e.message) }
    finally { setBusy(false) }
  }

  async function remove(key: string) {
    if (!confirm('این محل حذف بشه؟')) return
    setBusy(true)
    try {
      await fetch('/api/admin/prelim-venue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compId, groupKey: key, venue: null }) })
      if (editingKey === key) resetForm()
      router.refresh()
    } finally { setBusy(false) }
  }

  const filteredGamenets = gamenetOptions.filter(g => !place || (mode === 'city' ? g.city === place : g.province === place))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.map(([key, v]) => {
            const label = key.split(':')[1] || key
            const title = v.gamenetId ? (gamenetOptions.find(g => g.id === v.gamenetId)?.name ?? 'گیم‌نت') : (v.venueName ?? '—')
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.ink, border: `1px solid ${C.line}`, borderRadius: 10, padding: '9px 11px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.thi }}>{label}</div>
                  <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>{title}{v.fromDate ? ` · ${v.fromDate}` : ''}</div>
                </div>
                <button type="button" disabled={busy} onClick={() => loadEntry(key)} style={miniBtn}>ویرایش</button>
                <button type="button" disabled={busy} onClick={() => remove(key)} style={{ ...miniBtn, color: C.live }}>حذف</button>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {(['city', 'province'] as const).map(m => (
          <button key={m} type="button" onClick={() => { setMode(m); setPlace('') }} style={seg(mode === m)}>{m === 'city' ? 'شهر' : 'استان'}</button>
        ))}
      </div>

      <select value={place} onChange={e => setPlace(e.target.value)} style={inp}>
        <option value="">انتخاب {mode === 'city' ? 'شهر' : 'استان'}…</option>
        {(mode === 'province'
          ? PROVINCE_NAMES
          : IRAN_GEO.flatMap(p => p.cities)
        ).map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      <select value={form.gamenetId ?? ''} onChange={e => setForm(f => ({ ...f, gamenetId: e.target.value || undefined }))} style={inp}>
        <option value="">گیم‌نت تأییدشده (اختیاری)</option>
        {filteredGamenets.map(g => <option key={g.id} value={g.id}>{g.name} — {g.city}</option>)}
      </select>

      {!form.gamenetId && (
        <>
          <input value={form.venueName ?? ''} onChange={e => setForm(f => ({ ...f, venueName: e.target.value }))} placeholder="نام محل (اگه گیم‌نت نیست)" style={inp} />
          <input value={form.venueAddress ?? ''} onChange={e => setForm(f => ({ ...f, venueAddress: e.target.value }))} placeholder="آدرس" style={inp} />
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input value={form.fromDate ?? ''} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))} placeholder="از تاریخ" style={inp} />
        <input value={form.toDate ?? ''} onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} placeholder="تا تاریخ" style={inp} />
      </div>
      <input value={form.scheduleNote ?? ''} onChange={e => setForm(f => ({ ...f, scheduleNote: e.target.value }))} placeholder="زمان‌بندی / توضیح" style={inp} />
      <input dir="ltr" value={form.contactPhone ?? ''} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="تماس" style={{ ...inp, textAlign: 'left' }} />
      <input dir="ltr" value={form.mapUrl ?? ''} onChange={e => setForm(f => ({ ...f, mapUrl: e.target.value }))} placeholder="لینک نقشه" style={{ ...inp, textAlign: 'left' }} />

      {msg && <div style={{ fontSize: 12, color: C.live }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" disabled={busy} onClick={save} style={primaryBtn}>{busy ? '…' : editingKey ? 'به‌روزرسانی' : 'افزودن محل'}</button>
        {editingKey && <button type="button" disabled={busy} onClick={resetForm} style={miniBtn}>انصراف</button>}
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px', color: C.thi, fontFamily: 'inherit', fontSize: 12.5 }
const miniBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: C.accent, padding: '4px 8px' }
const primaryBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, fontSize: 13, fontWeight: 800, borderRadius: 11, background: C.accent, color: C.ink }
function seg(on: boolean): React.CSSProperties {
  return { all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 40, fontSize: 12.5, fontWeight: 700, borderRadius: 10, border: `1px solid ${on ? C.accent : C.line}`, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody }
}
