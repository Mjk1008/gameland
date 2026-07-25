'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { C, DISC_DOT } from '@/components/ui'
import { faDigits } from '@/lib/jalali'
import { toman } from '@/lib/payment'

const GOLD = '#F5C84B'

// ── shapes mirrored from /api/assistant ────────────────────────────────────
interface EventEnt { id: string; title: string; disc: string; discName: string; status: string; statusLabel: string; prize: number; date: string; location: string; format: string; deadlineDays: number | null; registered: boolean; canBuy: number }
interface NewsEnt { id: string; title: string; excerpt: string; body: string; tags: string[]; cover: string; at: number }
interface RegEnt { comp: string; status: string; attempts: number; reason?: string; href: string }
interface Entities { events: EventEnt[]; news: NewsEnt[]; regs: RegEnt[] }

interface Msg { role: 'user' | 'assistant'; content: string; ent?: Entities; error?: boolean }

const STORE_KEY = 'gl_ai_chat_v2'

// What the assistant can actually do — always reachable, so the feature never
// becomes "that thing I opened once".
const CAPABILITIES: { icon: string; title: string; asks: string[] }[] = [
  { icon: '🎟', title: 'ثبت‌نام و سهم', asks: ['چطوری تو مسابقه ثبت‌نام کنم؟', 'چند سهم می‌تونم بخرم؟', 'چرا ثبت‌نامم تایید نشده؟'] },
  { icon: '🏆', title: 'مسابقات و قرعه', asks: ['چه مسابقاتی الان بازه؟', 'قرعه‌کشی چطوری انجام می‌شه؟', 'مسیرم تا فینال چیه؟'] },
  { icon: '📰', title: 'اخبار', asks: ['چه خبر؟', 'آخرین اخبار گیم‌لند رو نشونم بده'] },
  { icon: '📈', title: 'رتبه و امتیاز', asks: ['رتبه‌ام چنده؟', 'امتیاز چطوری حساب می‌شه؟'] },
  { icon: '🎁', title: 'دعوت رفیق', asks: ['کمپین دعوت چطوریه؟', 'چند سهم رایگان دارم؟'] },
  { icon: '🎮', title: 'تریک بازی', asks: ['یه تریک FC26 بده', 'تو eFootball چطوری بهتر دفاع کنم؟'] },
]

const OPENERS = ['چرا ثبت‌نامم تایید نشده؟', 'چه مسابقاتی بازه؟', 'چه خبر؟', 'رتبه‌ام چنده؟']

export default function AssistantChat({ firstName, quotaUsed, quotaLimit }: { firstName: string; quotaUsed: number; quotaLimit: number }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [used, setUsed] = useState(quotaUsed)
  const [limit] = useState(quotaLimit)
  const [sheet, setSheet] = useState(false)
  const [story, setStory] = useState<NewsEnt | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) setMsgs(JSON.parse(raw).slice(-30)) } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-30))) } catch {}
    scrollDown()
  }, [msgs])

  function scrollDown() {
    requestAnimationFrame(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight })
  }

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => scrollDown()
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!sheet && !story) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [sheet, story])

  async function send(text?: string) {
    const q = (text ?? input).trim()
    if (!q || busy) return
    setInput(''); setSheet(false)
    const history = msgs.filter(m => !m.error).slice(-6).map(m => ({ role: m.role, content: m.content }))
    setMsgs(m => [...m, { role: 'user', content: q }, { role: 'assistant', content: '' }])
    setBusy(true)
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, history }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setMsgs(m => [...m.slice(0, -1), { role: 'assistant', content: j.error || 'یه مشکلی پیش اومد — دوباره امتحان کن', error: true }])
        return
      }
      const qu = res.headers.get('X-Quota-Used'); if (qu) setUsed(Number(qu))

      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let raw = ''
      let ent: Entities | undefined
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        raw += dec.decode(value, { stream: true })
        if (!ent) {
          const nl = raw.indexOf('\n')
          if (nl === -1) continue
          try { ent = JSON.parse(raw.slice(0, nl)) } catch { ent = { events: [], news: [], regs: [] } }
          raw = raw.slice(nl + 1)
        }
        setMsgs(m => [...m.slice(0, -1), { role: 'assistant', content: raw, ent }])
      }
      if (!raw.trim()) setMsgs(m => [...m.slice(0, -1), { role: 'assistant', content: 'جوابی نگرفتم — دوباره بپرس 🙏', error: true }])
    } catch {
      setMsgs(m => [...m.slice(0, -1), { role: 'assistant', content: 'ارتباط قطع شد — دوباره امتحان کن', error: true }])
    } finally { setBusy(false); scrollDown() }
  }

  function retry() {
    const last = [...msgs].reverse().find(x => x.role === 'user')
    if (!last) return
    setMsgs(m => m.slice(0, -2))
    send(last.content)
  }

  const empty = msgs.length === 0

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#14110D' }}>
      {/* header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'rgba(20,17,13,.96)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${C.line}` }}>
        <Link href="/" aria-label="بازگشت" style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 11, background: C.sf1, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.tbody }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </Link>
        <span style={{ width: 34, height: 34, borderRadius: 999, flexShrink: 0, background: `linear-gradient(135deg, #FFE9A8, ${GOLD} 55%, #E8B429)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 14px ${GOLD}44` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A1508" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8z" /><path d="M19 15l.7 1.8L21.5 18l-1.8.7L19 20.5l-.7-1.8L16.5 18l1.8-.7z" /></svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: C.thi }}>دستیار گیم‌لند</div>
          <div style={{ fontSize: 10.5, color: busy ? GOLD : C.win, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: busy ? GOLD : C.win }} />{busy ? 'داره می‌نویسه…' : 'آنلاین'}
          </div>
        </div>
        {msgs.length > 0 && (
          <button onClick={() => { setMsgs([]); try { localStorage.removeItem(STORE_KEY) } catch {} }} aria-label="گفتگوی جدید"
            style={{ all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 10, background: C.sf1, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.tmut, flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        )}
      </div>

      {/* thread */}
      <div ref={scroller} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: '16px 14px 10px' }}>
        {empty ? (
          <Welcome firstName={firstName} onAsk={send} onExplore={() => setSheet(true)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560, margin: '0 auto' }}>
            {msgs.map((m, i) => (
              <Bubble key={i} msg={m} typing={m.role === 'assistant' && m.content === '' && busy && i === msgs.length - 1}
                onRetry={retry} onStory={setStory} onAsk={send} />
            ))}
          </div>
        )}
      </div>

      {/* composer */}
      <div style={{ flexShrink: 0, padding: '10px 14px calc(10px + env(safe-area-inset-bottom, 0px))', background: 'rgba(20,17,13,.97)', borderTop: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: 560, margin: '0 auto' }}>
          <button onClick={() => setSheet(true)} aria-label="دستیار چه کارهایی بلده"
            style={{ all: 'unset', cursor: 'pointer', width: 44, height: 44, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sf1, border: `1px solid ${GOLD}44`, color: GOLD }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
          </button>
          <textarea value={input} rows={1} enterKeyHint="send"
            onChange={e => setInput(e.target.value.slice(0, 500))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            onFocus={scrollDown}
            placeholder={used >= limit ? 'سقفِ امروزت پر شده — فردا ریست می‌شه' : 'بپرس…'}
            disabled={used >= limit}
            style={{ flex: 1, resize: 'none', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: '12px 14px', color: C.thi, fontSize: 14, outline: 'none', fontFamily: 'inherit', lineHeight: 1.7, maxHeight: 110, boxSizing: 'border-box' }} />
          <button onClick={() => send()} disabled={busy || !input.trim() || used >= limit} aria-label="ارسال"
            style={{ all: 'unset', cursor: 'pointer', width: 44, height: 44, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: input.trim() && !busy && used < limit ? C.accent : C.sf2, color: input.trim() && !busy && used < limit ? C.ink : C.tmut, border: `1px solid ${C.line}`, transition: 'background .15s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(180deg)' }}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 560, margin: '6px auto 0' }}>
          <span style={{ fontSize: 9.5, color: C.tmut }}>وضعیتِ حسابت از دیتای واقعیِ اپه</span>
          <span className="gl-num" style={{ fontSize: 9.5, color: used >= limit ? C.live : C.tmut }}>{faDigits(Math.max(0, limit - used))} پیامِ امروز</span>
        </div>
      </div>

      {/* capability sheet — the discoverability fix */}
      {sheet && typeof document !== 'undefined' && createPortal(
        <div onClick={() => setSheet(false)} style={sheetWrap}>
          <div onClick={e => e.stopPropagation()} style={sheetBody}>
            <div style={{ width: 38, height: 4, borderRadius: 3, background: C.line2, margin: '0 auto 14px' }} />
            <div style={{ fontSize: 15, fontWeight: 800, color: C.thi, marginBottom: 3 }}>چه کارهایی ازم برمیاد؟</div>
            <div style={{ fontSize: 11.5, color: C.tmut, marginBottom: 14 }}>روی هر سوال بزن تا همون‌جا جواب بگیری</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CAPABILITIES.map(c => (
                <div key={c.title}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                    <span style={{ fontSize: 14 }}>{c.icon}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: C.thi }}>{c.title}</span>
                    <span style={{ flex: 1, height: 1, background: C.line }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {c.asks.map(a => (
                      <button key={a} onClick={() => send(a)}
                        style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: C.tbody, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '9px 12px' }}>{a}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>, document.body)}

      {/* news story modal (opened from a news card in chat) */}
      {story && typeof document !== 'undefined' && createPortal(
        <div onClick={() => setStory(null)} style={sheetWrap}>
          <div onClick={e => e.stopPropagation()} style={{ ...sheetBody, padding: 0 }}>
            <div style={{ position: 'relative', aspectRatio: '1.85/1' }}>
              <img src={story.cover} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(23,20,16,0) 45%, rgba(23,20,16,1) 100%)' }} />
              <button onClick={() => setStory(null)} aria-label="بستن" style={{ all: 'unset', cursor: 'pointer', position: 'absolute', top: 12, insetInlineStart: 12, width: 34, height: 34, borderRadius: 999, background: 'rgba(11,10,8,.66)', border: `1px solid ${C.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15 }}>✕</button>
            </div>
            <div style={{ padding: '2px 20px 28px' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.thi, lineHeight: 1.75 }}>{story.title}</h2>
              {story.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 11 }}>
                  {story.tags.map(t => <span key={t} style={{ fontSize: 10.5, fontWeight: 700, color: GOLD, background: C.goldSoft, border: `1px solid ${GOLD}33`, borderRadius: 999, padding: '5px 12px' }}>#{t}</span>)}
                </div>
              )}
              <div style={{ height: 1, background: `linear-gradient(90deg, ${GOLD}55, transparent)`, margin: '15px 0' }} />
              <div style={{ fontSize: 13.5, color: C.tbody, lineHeight: 2.2, whiteSpace: 'pre-wrap' }}>{story.body || '—'}</div>
            </div>
          </div>
        </div>, document.body)}

      <style jsx global>{`
        .ai-dots { display: inline-flex; gap: 4px; align-items: center; height: 18px }
        .ai-dots span { width: 6px; height: 6px; border-radius: 999px; background: #8A7F6E; animation: aiBounce 1.2s ease-in-out infinite }
        .ai-dots span:nth-child(2) { animation-delay: .15s }
        .ai-dots span:nth-child(3) { animation-delay: .3s }
        @keyframes aiBounce { 0%,60%,100% { transform: translateY(0); opacity: .5 } 30% { transform: translateY(-4px); opacity: 1 } }
        @keyframes aiUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        .ai-w { animation: aiUp .32s cubic-bezier(.2,.8,.3,1) both }
        @keyframes aiSheet { from { transform: translateY(40px); opacity: .5 } to { transform: translateY(0); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .ai-w, .ai-dots span { animation: none } }
      `}</style>
    </div>
  )
}

// ── welcome ────────────────────────────────────────────────────────────────
function Welcome({ firstName, onAsk, onExplore }: { firstName: string; onAsk: (s: string) => void; onExplore: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: '7vh', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 999, background: `linear-gradient(135deg, #FFE9A8, ${GOLD} 55%, #E8B429)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 10px 34px -10px ${GOLD}77` }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1A1508" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8z" /><path d="M19 15l.7 1.8L21.5 18l-1.8.7L19 20.5l-.7-1.8L16.5 18l1.8-.7z" /></svg>
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: C.thi, marginTop: 6 }}>سلام {firstName} 👋</div>
      <div style={{ fontSize: 12, color: C.tbody, lineHeight: 2, maxWidth: 290 }}>
        وضعیتِ ثبت‌نامت رو چک می‌کنم، مسابقه پیدا می‌کنم، اخبار و قوانین رو نشونت می‌دم — و راهت می‌ندازم.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center', maxWidth: 330, marginTop: 12 }}>
        {OPENERS.map(s => (
          <button key={s} onClick={() => onAsk(s)}
            style={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: C.tbody, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 999, padding: '10px 14px' }}>{s}</button>
        ))}
      </div>
      <button onClick={onExplore} style={{ all: 'unset', cursor: 'pointer', marginTop: 10, fontSize: 12, fontWeight: 800, color: GOLD }}>چه کارهای دیگه‌ای بلدم؟ ›</button>
    </div>
  )
}

// ── bubble + widget parsing ────────────────────────────────────────────────
const MARKER = /\[\[(event:[a-zA-Z0-9_-]+|news|status|go:[^\]|]+\|[^\]]+)\]\]/g

function Bubble({ msg, typing, onRetry, onStory, onAsk }: { msg: Msg; typing: boolean; onRetry: () => void; onStory: (n: NewsEnt) => void; onAsk: (s: string) => void }) {
  const isUser = msg.role === 'user'
  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <div style={{ maxWidth: '84%', padding: '10px 14px', fontSize: 13.5, lineHeight: 1.95, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: C.accentSoft, color: C.thi, border: `1px solid ${C.accent}55`, borderRadius: '14px 14px 4px 14px' }}>{msg.content}</div>
      </div>
    )
  }

  const markers: string[] = []
  const text = msg.content.replace(MARKER, (_, m) => { markers.push(m); return '' }).replace(/\n{3,}/g, '\n\n').trim()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 9 }}>
      {(text || typing) && (
        <div style={{ maxWidth: '86%', padding: '10px 14px', fontSize: 13.5, lineHeight: 2.05, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: msg.error ? C.liveSoft : C.sf1, color: msg.error ? C.live : C.tbody, border: `1px solid ${msg.error ? C.live + '55' : C.line}`, borderRadius: '14px 14px 14px 4px' }}>
          {typing ? <span className="ai-dots" aria-label="در حال نوشتن"><span /><span /><span /></span> : text}
          {msg.error && <button onClick={onRetry} style={{ all: 'unset', cursor: 'pointer', display: 'block', marginTop: 7, fontSize: 11.5, fontWeight: 700, color: C.thi }}>↻ تلاشِ دوباره</button>}
        </div>
      )}
      {markers.map((m, i) => (
        <div key={i} className="ai-w" style={{ width: '100%' }}>
          <Widget marker={m} ent={msg.ent} onStory={onStory} onAsk={onAsk} />
        </div>
      ))}
    </div>
  )
}

function Widget({ marker, ent, onStory, onAsk }: { marker: string; ent?: Entities; onStory: (n: NewsEnt) => void; onAsk: (s: string) => void }) {
  if (!ent) return null

  if (marker.startsWith('event:')) {
    const ev = ent.events.find(e => e.id === marker.slice(6))
    return ev ? <EventCard ev={ev} /> : null
  }
  if (marker === 'news') {
    if (!ent.news.length) return null
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {ent.news.slice(0, 6).map(n => (
          <button key={n.id} onClick={() => onStory(n)}
            style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', borderRadius: 13, overflow: 'hidden', background: C.sf1, border: `1px solid ${C.line}` }}>
            <span style={{ display: 'block', position: 'relative', aspectRatio: '16/9', background: C.sf2 }}>
              <img src={n.cover} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            </span>
            <span style={{ display: 'block', padding: '9px 10px 11px' }}>
              <span style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: C.thi, lineHeight: 1.7 }}>{n.title}</span>
              {n.excerpt && <span style={{ display: 'block', fontSize: 10, color: C.tmut, lineHeight: 1.8, marginTop: 3 }}>{n.excerpt}…</span>}
            </span>
          </button>
        ))}
      </div>
    )
  }
  if (marker === 'status') {
    if (!ent.regs.length) {
      return <CtaRow href="/competitions" label="دیدنِ مسابقات و ثبت‌نام" />
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {ent.regs.map((r, i) => {
          const ok = r.status === 'approved', rej = r.status === 'rejected'
          const col = ok ? C.win : rej ? C.live : C.gold
          return (
            <Link key={i} href={r.href} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: C.sf1, border: `1px solid ${col}44`, borderRadius: 12, padding: '11px 13px' }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: col, background: ok ? C.winSoft : rej ? C.liveSoft : C.goldSoft, border: `1px solid ${col}44`, borderRadius: 7, padding: '4px 9px', flexShrink: 0 }}>
                {ok ? 'تایید ✓' : rej ? 'رد' : 'در انتظار'}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.comp}</span>
                <span style={{ display: 'block', fontSize: 10, color: C.tmut, marginTop: 2 }}>
                  <span className="gl-num">{faDigits(r.attempts)}</span> سهم{r.reason ? ` · ${r.reason}` : ''}
                </span>
              </span>
              <span style={{ color: col, fontSize: 13, flexShrink: 0 }}>‹</span>
            </Link>
          )
        })}
      </div>
    )
  }
  if (marker.startsWith('go:')) {
    const [href, label] = marker.slice(3).split('|')
    const allowed = ['/competitions', '/leaderboard', '/invite', '/me', '/me/competitions', '/rules', '/support']
    if (!allowed.some(a => href.startsWith(a))) return null
    return <CtaRow href={href} label={label || 'برو'} />
  }
  return null
}

function EventCard({ ev }: { ev: EventEnt }) {
  const dot = DISC_DOT[ev.disc] ?? C.tmut
  const open = ev.status === 'open'
  const href = ev.registered ? `/competitions/${ev.id}/me` : open ? `/competitions/${ev.id}/register` : `/competitions/${ev.id}`
  const cta = ev.registered ? 'مسیرِ من ›' : open ? 'ثبت‌نام در این مسابقه ›' : 'جزئیات مسابقه ›'
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 15, overflow: 'hidden' }}>
      <div style={{ padding: '13px 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: dot, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 800, color: C.thi, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: open ? C.win : C.tmut, background: open ? C.winSoft : C.sf2, border: `1px solid ${open ? C.win + '44' : C.line}`, borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>{ev.statusLabel}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 11 }}>
          <Chip>{ev.discName}</Chip>
          {ev.date && <Chip>{ev.date}</Chip>}
          {ev.location && <Chip>📍 {ev.location}</Chip>}
          {ev.prize > 0 && <Chip gold>🏆 {toman(ev.prize)} تومان</Chip>}
          {ev.deadlineDays && <Chip gold>⏳ {faDigits(ev.deadlineDays)} روز تا بستنِ ثبت‌نام</Chip>}
        </div>
        <Link href={href} style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', width: '100%', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11, background: open && !ev.registered ? C.accent : C.sf2, color: open && !ev.registered ? C.ink : C.thi, border: `1px solid ${open && !ev.registered ? C.accent : C.line2}`, fontSize: 13, fontWeight: 800 }}>{cta}</Link>
      </div>
    </div>
  )
}

function CtaRow({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', width: '100%', minHeight: 46, alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, background: C.sf1, border: `1px solid ${GOLD}44`, padding: '0 15px' }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: GOLD }}>{label}</span>
      <span style={{ color: GOLD, fontSize: 14 }}>‹</span>
    </Link>
  )
}

function Chip({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return <span style={{ fontSize: 10.5, fontWeight: 700, color: gold ? GOLD : C.tbody, background: gold ? C.goldSoft : C.sf2, border: `1px solid ${gold ? GOLD + '33' : C.line}`, borderRadius: 8, padding: '4px 9px' }}>{children}</span>
}

const sheetWrap: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(11,10,8,.8)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
}
const sheetBody: React.CSSProperties = {
  width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch',
  background: '#171410', border: '1px solid #3A332A', borderBottom: 'none', borderRadius: '22px 22px 0 0',
  padding: '12px 18px calc(24px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box',
  animation: 'aiSheet .28s cubic-bezier(.2,.9,.3,1)',
}
