'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type EventOpt = { id: string; title: string; disc: string }
type LiveRow = { id: string; eventTitle: string; startedAt: number }

const fieldStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: '#161310', border: '1px solid #2A241C',
  borderRadius: 10, padding: '11px 12px', fontSize: 13.5, color: '#F2EDE4', fontFamily: 'inherit',
}

export default function BroadcastForm({ events, live }: { events: EventOpt[]; live: LiveRow[] }) {
  const router = useRouter()
  const [eventId, setEventId] = useState(events[0]?.id ?? '')
  const [embedUrl, setEmbedUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function start() {
    if (!eventId || !embedUrl.trim()) { setErr('رویداد و لینک آپارات رو پر کن'); return }
    setBusy(true); setErr(null)
    const res = await fetch('/api/broadcast/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, embedUrl }),
    })
    setBusy(false)
    if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error || 'خطا'); return }
    setEmbedUrl('')
    router.refresh()
  }

  async function end(id: string) {
    setBusy(true)
    await fetch('/api/broadcast/end', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setBusy(false)
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ border: '1px solid #2A241C', borderRadius: 14, background: '#1D1913', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <select value={eventId} onChange={e => setEventId(e.target.value)} style={fieldStyle}>
          {events.length === 0 && <option value="">رویداد بازی وجود نداره</option>}
          {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>

        <input
          value={embedUrl}
          onChange={e => setEmbedUrl(e.target.value)}
          placeholder="لینک یا کد iframe پخش زنده‌ی آپارات"
          style={fieldStyle}
        />

        {err && <div style={{ fontSize: 12, color: '#FF6B6B' }}>{err}</div>}

        <button
          onClick={start}
          disabled={busy || !events.length}
          style={{ all: 'unset', cursor: busy ? 'default' : 'pointer', textAlign: 'center', background: '#F5C84B', color: '#1B1710', fontWeight: 800, fontSize: 13.5, padding: '11px 0', borderRadius: 10, opacity: busy || !events.length ? 0.6 : 1 }}
        >
          شروع پخش
        </button>
      </div>

      {live.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {live.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #2A241C', borderRadius: 12, background: '#1D1913', padding: '10px 12px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF3B3B', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#F2EDE4' }}>{s.eventTitle}</span>
              <button
                onClick={() => end(s.id)}
                disabled={busy}
                style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: '#FF6B6B', border: '1px solid #E23B3B55', borderRadius: 8, padding: '6px 10px' }}
              >
                پایان پخش
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
