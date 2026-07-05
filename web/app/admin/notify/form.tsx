'use client'
import { useState } from 'react'
import { C, Button } from '@/components/ui'

export default function NotifyForm() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<'all' | 'gamers'>('all')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null); setBusy(true)
    try {
      const res = await fetch('/api/admin/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body, audience }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'خطا')
      setMsg({ ok: true, text: `به ${j.sent} نفر ارسال شد ✓` })
      setTitle(''); setBody('')
    } catch (e: any) { setMsg({ ok: false, text: e.message }) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span style={{ fontSize: 20, fontWeight: 800, color: C.thi }}>ارسال اعلان</span>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, color: C.tmut }}>مخاطب</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {([['all', 'همه کاربران'], ['gamers', 'فقط گیمرها']] as const).map(([k, l]) => {
            const on = audience === k
            return <button key={k} type="button" onClick={() => setAudience(k)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '10px 0', border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 700, fontSize: 13 }}>{l}</button>
          })}
        </div>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, color: C.tmut }}>عنوان</span>
        <input value={title} onChange={e => setTitle(e.target.value)} required style={inp} placeholder="مثلاً: قرعه‌کشی فردا ساعت ۲۰" />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, color: C.tmut }}>متن</span>
        <textarea value={body} onChange={e => setBody(e.target.value)} required rows={5} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }} />
      </label>

      {msg && <div style={{ fontSize: 12, color: msg.ok ? C.win : C.live, background: (msg.ok ? C.winSoft : C.liveSoft), border: `1px solid ${(msg.ok ? C.win : C.live)}55`, padding: 10, borderRadius: 10 }}>{msg.text}</div>}

      <Button type="submit" disabled={busy}>{busy ? '...' : 'ارسال'}</Button>
    </form>
  )
}

const inp: React.CSSProperties = { background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 13px', color: C.thi, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
