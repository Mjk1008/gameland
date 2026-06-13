'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NotifyForm() {
  const router = useRouter()
  const [title,    setTitle]    = useState('')
  const [body,     setBody]     = useState('')
  const [audience, setAudience] = useState<'all' | 'gamers'>('all')
  const [busy,     setBusy]     = useState(false)
  const [msg,      setMsg]      = useState<{ ok: boolean; text: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null); setBusy(true)
    try {
      const res = await fetch('/api/admin/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, audience }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'خطا')
      setMsg({ ok: true, text: `به ${j.sent} نفر ارسال شد ✓` })
      setTitle(''); setBody('')
    } catch (e: any) { setMsg({ ok: false, text: e.message }) }
    finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>ارسال اعلان</span>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>مخاطب</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {([['all','همه کاربران'],['gamers','فقط گیمرها']] as const).map(([k,l]) => {
            const on = audience === k
            return <button key={k} type="button" onClick={() => setAudience(k)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '10px 0', border: `1px solid ${on ? '#22d3ee' : '#1e293b'}`, borderRadius: 10, background: on ? '#22d3ee22' : '#121821', color: on ? '#22d3ee' : '#94a3b8', fontWeight: 700, fontSize: 13 }}>{l}</button>
          })}
        </div>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>عنوان</span>
        <input value={title} onChange={e => setTitle(e.target.value)} required style={inp} placeholder="مثلاً: قرعه‌کشی فردا ساعت ۲۰"/>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>متن</span>
        <textarea value={body} onChange={e => setBody(e.target.value)} required rows={5} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }}/>
      </label>

      {msg && <div style={{ fontSize: 12, color: msg.ok ? '#34d399' : '#fb7185', background: (msg.ok ? '#34d399' : '#fb7185') + '1a', border: `1px solid ${msg.ok ? '#34d399' : '#fb7185'}33`, padding: 10, borderRadius: 10 }}>{msg.text}</div>}

      <button type="submit" disabled={busy} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', background: '#f5c84b', color: '#0b0f14', fontWeight: 800, fontSize: 15, padding: '13px 0', borderRadius: 12, opacity: busy ? 0.6 : 1 }}>
        {busy ? '...' : 'ارسال'}
      </button>
    </form>
  )
}

const inp: React.CSSProperties = { background: '#121821', border: '1px solid #1e293b', borderRadius: 11, padding: '11px 13px', color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
