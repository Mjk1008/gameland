'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { C, DISP } from '@/components/ui'
import { faDigits } from '@/lib/jalali'

interface Msg { role: 'user' | 'assistant'; content: string; error?: boolean }

const STORE_KEY = 'gl_ai_chat_v1'
const GOLD = '#F5C84B'

const SUGGESTIONS = [
  'چرا ثبت‌نامم هنوز تایید نشده؟',
  'قرعه‌کشی کِی انجام می‌شه؟',
  'قوانین سهم‌ها رو توضیح بده',
  'یه تریکِ FC26 بهم بده ⚽',
  'کمپین دعوت چطوری کار می‌کنه؟',
]

// Full-screen chat. Layout is keyboard-proof: 100dvh column, sticky header,
// scrollable middle, input pinned to the visual viewport bottom (iOS-safe).
export default function AssistantChat({ firstName, quotaUsed, quotaLimit }: { firstName: string; quotaUsed: number; quotaLimit: number }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [used, setUsed] = useState(quotaUsed)
  const [limit, setLimit] = useState(quotaLimit)
  const scroller = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // restore / persist local history (server keeps its own copy for the admin)
  useEffect(() => {
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) setMsgs(JSON.parse(raw).slice(-40)) } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-40))) } catch {}
    scrollDown()
  }, [msgs])

  function scrollDown() {
    requestAnimationFrame(() => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight })
  }

  // iOS keyboard: when the visual viewport shrinks, keep the thread pinned to bottom
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => scrollDown()
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  async function send(text?: string) {
    const q = (text ?? input).trim()
    if (!q || busy) return
    setInput('')
    const history = msgs.filter(m => !m.error).slice(-8)
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
      const qu = res.headers.get('X-Quota-Used'); const ql = res.headers.get('X-Quota-Limit')
      if (qu) setUsed(Number(qu)); if (ql) setLimit(Number(ql))
      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += dec.decode(value, { stream: true })
        setMsgs(m => [...m.slice(0, -1), { role: 'assistant', content: acc }])
      }
      if (!acc.trim()) setMsgs(m => [...m.slice(0, -1), { role: 'assistant', content: 'جوابی نگرفتم — دوباره بپرس 🙏', error: true }])
    } catch {
      setMsgs(m => [...m.slice(0, -1), { role: 'assistant', content: 'ارتباط قطع شد — دوباره امتحان کن', error: true }])
    } finally { setBusy(false); scrollDown() }
  }

  const empty = msgs.length === 0

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#14110D' }}>
      {/* header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', background: 'rgba(20,17,13,.95)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${C.line}` }}>
        <Link href="/" aria-label="بازگشت" style={{ all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 10, background: C.sf1, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.tbody }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </Link>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: `linear-gradient(135deg, ${GOLD}, #E8B429)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 17 }}>🎮</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: C.thi }}>دستیار گیم‌لند</div>
          <div style={{ fontSize: 10.5, color: busy ? GOLD : C.win, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: busy ? GOLD : C.win }} />{busy ? 'داره می‌نویسه…' : 'آنلاین'}
          </div>
        </div>
        <span className="gl-num" style={{ fontSize: 10.5, color: used >= limit ? C.live : C.tmut, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 999, padding: '5px 10px', flexShrink: 0 }}>
          {faDigits(limit - used)} پیامِ امروز
        </span>
      </div>

      {/* thread */}
      <div ref={scroller} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: '16px 14px 8px' }}>
        {empty ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: '9vh', textAlign: 'center' }}>
            <div style={{ width: 62, height: 62, borderRadius: 18, background: `linear-gradient(135deg, ${GOLD}, #E8B429)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: `0 10px 34px -10px ${GOLD}66` }}>🎮</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.thi, marginTop: 6 }}>سلام {firstName}! 👋</div>
            <div style={{ fontSize: 12, color: C.tbody, lineHeight: 2, maxWidth: 280 }}>
              من دستیارِ گیم‌لندم — وضعیتِ ثبت‌نامت، قوانین، اخبار، حتی تریکِ بازی‌ها. هرچی می‌خوای بپرس.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 320, marginTop: 14 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: C.tbody, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560, margin: '0 auto' }}>
            {msgs.map((m, i) => {
              const isUser = m.role === 'user'
              const isTyping = !isUser && m.content === '' && busy && i === msgs.length - 1
              return (
                <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-start' : 'flex-end' }}>
                  <div style={{
                    maxWidth: '82%', padding: '10px 14px', fontSize: 13.5, lineHeight: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    background: isUser ? C.accentSoft : m.error ? C.liveSoft : C.sf1,
                    color: isUser ? C.thi : m.error ? C.live : C.tbody,
                    border: `1px solid ${isUser ? C.accent + '55' : m.error ? C.live + '55' : C.line}`,
                    borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  }}>
                    {isTyping
                      ? <span className="ai-dots" aria-label="در حال نوشتن"><span /><span /><span /></span>
                      : m.content}
                    {m.error && <button onClick={() => { const last = [...msgs].reverse().find(x => x.role === 'user'); if (last) { setMsgs(ms => ms.slice(0, -2)); send(last.content) } }}
                      style={{ all: 'unset', cursor: 'pointer', display: 'block', marginTop: 6, fontSize: 11, fontWeight: 700, color: C.thi }}>↻ تلاشِ دوباره</button>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* composer — pinned, keyboard/safe-area aware */}
      <div style={{ flexShrink: 0, padding: '10px 14px calc(10px + env(safe-area-inset-bottom, 0px))', background: 'rgba(20,17,13,.97)', borderTop: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: 560, margin: '0 auto' }}>
          <textarea ref={inputRef} value={input} rows={1} enterKeyHint="send"
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
        <div style={{ textAlign: 'center', fontSize: 9.5, color: C.tmut, marginTop: 6 }}>دستیار ممکنه اشتباه کنه — وضعیتِ حسابت از دیتای واقعیِ اپه</div>
      </div>

      <style jsx global>{`
        .ai-dots { display: inline-flex; gap: 4px; align-items: center; height: 18px; }
        .ai-dots span { width: 6px; height: 6px; border-radius: 999px; background: #8A7F6E; animation: aiBounce 1.2s ease-in-out infinite; }
        .ai-dots span:nth-child(2) { animation-delay: .15s }
        .ai-dots span:nth-child(3) { animation-delay: .3s }
        @keyframes aiBounce { 0%, 60%, 100% { transform: translateY(0); opacity: .5 } 30% { transform: translateY(-4px); opacity: 1 } }
      `}</style>
    </div>
  )
}
