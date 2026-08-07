import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUserById, whenReady, aiGlobalFull, aiCountGlobal, aiDayStart, AI_DAILY_LIMIT,
} from '@/lib/store'
import { persist } from '@/lib/db/persistence'
import { AI_MODEL } from '@/lib/ai-config'
import {
  buildAssistantEntities, assistantContextBlock, ASSISTANT_SYSTEM,
} from '@/lib/assistant-context'
import { tryAssistantFaq } from '@/lib/assistant-faq'
import {
  assistantTextStream, finalizeAssistantText, newAssistantMsgId, persistAssistantExchange,
} from '@/lib/assistant-respond'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_INPUT = 500
const MAX_HISTORY = 10
const MAX_HISTORY_CHARS = 3200

function quotaHeaders(used: number) {
  return { 'X-Quota-Used': String(used), 'X-Quota-Limit': String(AI_DAILY_LIMIT) }
}

export async function POST(req: Request) {
  await whenReady()
  if (process.env.ASSISTANT_ENABLED === 'false') {
    return new Response(JSON.stringify({ error: 'دستیار موقتاً خاموشه' }), { status: 503 })
  }
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return new Response(JSON.stringify({ error: 'لاگین کنید' }), { status: 401 })

  const b = await req.json().catch(() => ({}))
  const message = (b.message ?? '').toString().trim().slice(0, MAX_INPUT)
  if (!message) return new Response(JSON.stringify({ error: 'پیام خالیه' }), { status: 400 })

  let history: { role: 'user' | 'assistant'; content: string }[] = []
  if (Array.isArray(b.history)) {
    let spent = 0
    for (const m of b.history.slice(-MAX_HISTORY).reverse()) {
      const content = (m.content ?? '').toString().replace(/\[\[[^\]]+\]\]/g, '').trim().slice(0, 600)
      if (!content) continue
      if (spent + content.length > MAX_HISTORY_CHARS) break
      spent += content.length
      history.unshift({ role: m.role === 'assistant' ? 'assistant' : 'user', content })
    }
  }

  const used = await persist.ai.usedSince(uid, aiDayStart())
  const ent = buildAssistantEntities(uid)

  // ── FAQ fast path (free, always persists both sides) ─────────────────────
  const faq = tryAssistantFaq(uid, message, ent)
  if (faq) {
    const mid = newAssistantMsgId()
    const text = finalizeAssistantText(message, ent, faq)
    persistAssistantExchange(mid, uid, message, text)
    return assistantTextStream(ent, text, quotaHeaders(used))
  }

  if (aiGlobalFull()) {
    return new Response(JSON.stringify({ error: 'ظرفیت امروزِ دستیار پر شده — فردا دوباره بیا 🙏' }), { status: 429 })
  }
  if (used >= AI_DAILY_LIMIT) {
    return new Response(JSON.stringify({ error: `سقف ${AI_DAILY_LIMIT} پیام امروزت پر شده — فردا ریست می‌شه ⏳` }), { status: 429 })
  }

  const key = process.env.METIS_API_KEY
  if (!key) return new Response(JSON.stringify({ error: 'دستیار هنوز پیکربندی نشده' }), { status: 503 })

  aiCountGlobal()

  const messages = [
    { role: 'system', content: ASSISTANT_SYSTEM },
    ...history,
    { role: 'system', content: assistantContextBlock(uid, ent) },
    { role: 'user', content: message },
  ]

  const mid = newAssistantMsgId()
  let upstream: Response | null = null
  try {
    upstream = await fetch('https://api.metisai.ir/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        max_tokens: 280,
        temperature: 0.35,
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal: AbortSignal.timeout(50_000),
    })
  } catch {
    upstream = null
  }

  if (!upstream?.ok || !upstream.body) {
    const err = 'دستیار الان در دسترس نیست — چند لحظه دیگه امتحان کن'
    persistAssistantExchange(mid, uid, message, err)
    return new Response(JSON.stringify({ error: err }), { status: 502 })
  }

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  const enc = new TextEncoder()
  let full = ''
  let usage = { prompt_tokens: 0, completion_tokens: 0 }
  let buf = ''
  let sentHeader = false
  let saved = false

  function saveAssistant(finalText: string) {
    if (saved) return
    saved = true
    persistAssistantExchange(mid, uid, message, finalText, usage)
  }

  const stream = new ReadableStream({
    async pull(controller) {
      try {
        if (!sentHeader) {
          sentHeader = true
          controller.enqueue(enc.encode(JSON.stringify(ent) + '\n'))
        }
        const { done, value } = await reader.read()
        if (done) {
          const text = finalizeAssistantText(message, ent, full)
          if (text !== full) controller.enqueue(enc.encode(text.slice(full.length)))
          saveAssistant(text)
          controller.close()
          return
        }
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          const t = line.trim()
          if (!t.startsWith('data:')) continue
          const payload = t.slice(5).trim()
          if (payload === '[DONE]') continue
          try {
            const j = JSON.parse(payload)
            if (j.usage) usage = j.usage
            const delta = j.choices?.[0]?.delta?.content
            if (delta) { full += delta; controller.enqueue(enc.encode(delta)) }
          } catch { /* skip malformed SSE */ }
        }
      } catch {
        const text = finalizeAssistantText(message, ent, full || 'ارتباط قطع شد — دوباره امتحان کن')
        saveAssistant(text)
        try { controller.enqueue(enc.encode(text.slice(full.length))) } catch { /* closed */ }
        controller.close()
      }
    },
    cancel() {
      const text = finalizeAssistantText(message, ent, full || 'درخواست لغو شد — دوباره بپرس')
      saveAssistant(text)
      reader.cancel().catch(() => {})
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      ...quotaHeaders(used + 1),
    },
  })
}
