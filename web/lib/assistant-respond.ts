import type { AssistantEntities } from './assistant-context'
import { assistantWidgetFallback } from './assistant-faq'
import { persist } from './db/persistence'

export function newAssistantMsgId() {
  return 'ai_' + Math.random().toString(36).slice(2, 10)
}

export function persistAssistantExchange(
  mid: string,
  uid: string,
  userText: string,
  assistantText: string,
  usage?: { prompt_tokens: number; completion_tokens: number },
) {
  persist.ai.insert({ id: mid + 'u', userId: uid, role: 'user', content: userText, promptTokens: 0, completionTokens: 0 })
  persist.ai.insert({
    id: mid + 'a',
    userId: uid,
    role: 'assistant',
    content: assistantText,
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
  })
}

/** Same wire format as the LLM stream: JSON entities line + plain text. */
export function assistantTextStream(
  ent: AssistantEntities,
  text: string,
  headers: Record<string, string> = {},
): Response {
  const enc = new TextEncoder()
  const body = JSON.stringify(ent) + '\n' + text
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', ...headers },
  })
}

export function finalizeAssistantText(message: string, ent: AssistantEntities, raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return 'جوابی نگرفتم — دوباره بپرس 🙏'
  return assistantWidgetFallback(message, ent, trimmed)
}
