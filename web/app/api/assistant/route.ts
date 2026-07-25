import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUserById, whenReady, aiQuota, aiConsume, activityPointsOf,
  registrationsForUser, allEvents, activeNews, allUsers, approvedReferralCount,
} from '@/lib/store'
import { persist } from '@/lib/db/persistence'
import { DISC } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MODEL = 'gpt-4o-mini'
const MAX_INPUT = 500
const MAX_HISTORY = 8

// Live, deterministic grounding: the assistant answers account questions from
// THIS data, never from model guesses.
function userContext(uid: string): string {
  const u = getUserById(uid)
  if (!u) return ''
  const events = allEvents()
  const evTitle = new Map(events.map(e => [e.id, e.title]))
  const regs = registrationsForUser(uid).map(r => {
    const st = r.status === 'approved' ? 'تاییدشده' : r.status === 'pending' ? 'در انتظار تایید ادمین' : 'ردشده'
    return `- «${evTitle.get(r.compId) ?? r.compId}»: ${r.attempts} سهم، وضعیت: ${st}${r.status === 'rejected' && r.rejectReason ? `، دلیل رد: ${r.rejectReason}` : ''}${r.freeAttempts ? `، ${r.freeAttempts} سهمش جایزهٔ دعوت بوده` : ''}`
  })
  const gamers = allUsers().filter(x => x.role === 'gamer')
  const pts = new Map(gamers.map(g => [g.id, (g.bonusPoints ?? 0) + activityPointsOf(g)]))
  const rank = [...gamers].sort((a, b) => (pts.get(b.id) ?? 0) - (pts.get(a.id) ?? 0)).findIndex(g => g.id === uid) + 1
  const open = events.filter(e => e.status === 'open').map(e => {
    const dl = e.regDeadline && e.regDeadline > Date.now() ? `، ${Math.ceil((e.regDeadline - Date.now()) / 86400000)} روز تا بستن ثبت‌نام` : ''
    return `- «${e.title}» (${DISC[e.disc]?.name ?? e.disc}) — ثبت‌نام باز${dl}`
  })
  const news = activeNews().slice(0, 4).map(n => `- ${n.title}`)
  return [
    `پروفایل کاربر: ${u.name} (@${u.tag})${u.city ? `، شهر: ${u.city}` : ''}، رتبهٔ ملی: #${rank} از ${gamers.length}، امتیاز: ${pts.get(uid) ?? 0}${(u.freeTickets ?? 0) > 0 ? `، ${u.freeTickets} سهم رایگان (جایزهٔ دعوت) دارد` : ''}، دعوتی‌های تاییدشده: ${approvedReferralCount(uid)} سهم`,
    regs.length ? `ثبت‌نام‌های کاربر:\n${regs.join('\n')}` : 'کاربر هنوز در هیچ مسابقه‌ای ثبت‌نام نکرده.',
    open.length ? `مسابقات باز:\n${open.join('\n')}` : 'فعلاً مسابقهٔ بازی نیست.',
    news.length ? `اخبار اخیر گیم‌لند:\n${news.join('\n')}` : '',
  ].filter(Boolean).join('\n\n')
}

const SYSTEM = `تو «دستیار گیم‌لند» هستی — دستیار رسمی اپ گیم‌لند (gamelandteam.ir)، پلتفرم مسابقات ایسپورت و رنکینگ ملی گیمرهای ایران.
لحن: فارسی خودمونی، کوتاه، رفیقانه و گیمری. جواب‌ها حداکثر ۴-۵ جمله مگه واقعاً لازم باشه.

قوانین گیم‌لند (خلاصه): هر کاربر تا ۶ سهم در هر رشته می‌تونه بخره؛ هر سهم یک شانس جدا در قرعه‌کشی مقدماتیه؛ قیمت هر سهم ۵۰۰ هزار تومان؛ بعد از خرید باید فیش واریز رو در اپ آپلود کنه تا ادمین تایید کنه؛ بعد از قرعه‌کشی ثبت‌نام و تغییر سهم قفل می‌شه؛ حداکثر ۳ سید به فینال می‌رسه. اگه ثبت‌نامش رد شده، می‌تونه از صفحهٔ مسابقه «درخواست مجدد» بزنه و فیش جدید بفرسته. کمپین دعوت: با کد دعوت (تگ کاربر) موقع خرید سهم، هر ۳ سهم تاییدشدهٔ دعوتی‌ها = ۱ سهم رایگان، ۶ تا = جمعاً ۳ سهم.

مرزها:
- دربارهٔ حساب کاربر فقط از «دادهٔ کاربر» که بهت داده شده جواب بده. اگه اونجا نیست، بگو از پشتیبانی بپرسه.
- تاریخ دقیق ریلیز بازی‌ها یا اخباری که مطمئن نیستی: صادقانه بگو مطمئن نیستی. هرگز تاریخ از خودت نساز.
- هیچ وعدهٔ مالی، جایزه، یا بازگشت وجه نده. تصمیم تایید/رد با ادمینه.
- تریک و نکتهٔ بازی‌ها (FC26، PES، eFootball، UFC، NBA 2K) آزاده — کوتاه و کاربردی بده.
- گپ آزاد گیمری اوکیه ولی محترمانه؛ محتوای نامناسب رو رد کن.`

export async function POST(req: Request) {
  await whenReady()
  if (process.env.ASSISTANT_ENABLED === 'false') {
    return new Response(JSON.stringify({ error: 'دستیار موقتاً خاموشه' }), { status: 503 })
  }
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) return new Response(JSON.stringify({ error: 'لاگین کنید' }), { status: 401 })

  const key = process.env.METIS_API_KEY
  if (!key) return new Response(JSON.stringify({ error: 'دستیار هنوز پیکربندی نشده' }), { status: 503 })

  const b = await req.json().catch(() => ({}))
  const message = (b.message ?? '').toString().trim().slice(0, MAX_INPUT)
  if (!message) return new Response(JSON.stringify({ error: 'پیام خالیه' }), { status: 400 })
  const history: { role: 'user' | 'assistant'; content: string }[] = Array.isArray(b.history)
    ? b.history.slice(-MAX_HISTORY).map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: (m.content ?? '').toString().slice(0, 1200),
      }))
    : []

  const q = aiQuota(uid)
  if (q.globalFull) return new Response(JSON.stringify({ error: 'ظرفیت امروزِ دستیار پر شده — فردا دوباره بیا 🙏' }), { status: 429 })
  if (q.used >= q.limit) return new Response(JSON.stringify({ error: `سقف ${q.limit} پیام امروزت پر شده — فردا ریست می‌شه ⏳` }), { status: 429 })
  aiConsume(uid)

  const messages = [
    { role: 'system', content: SYSTEM },
    { role: 'system', content: `دادهٔ لحظه‌ایِ کاربر (فقط منبعِ سوالاتِ حسابش):\n${userContext(uid)}` },
    ...history,
    { role: 'user', content: message },
  ]

  const upstream = await fetch('https://api.metisai.ir/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: 400, temperature: 0.6, stream: true, stream_options: { include_usage: true } }),
    signal: AbortSignal.timeout(50_000),
  }).catch(() => null)

  if (!upstream || !upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: 'دستیار الان در دسترس نیست — چند لحظه دیگه امتحان کن' }), { status: 502 })
  }

  // Pass plain text chunks through to the client; log both sides on finish.
  const mid = 'ai_' + Math.random().toString(36).slice(2, 10)
  persist.ai.insert({ id: mid + 'u', userId: uid, role: 'user', content: message, promptTokens: 0, completionTokens: 0 })

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let usage = { prompt_tokens: 0, completion_tokens: 0 }
  let buf = ''

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) {
        persist.ai.insert({ id: mid + 'a', userId: uid, role: 'assistant', content: full, promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens })
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
          if (delta) { full += delta; controller.enqueue(new TextEncoder().encode(delta)) }
        } catch {}
      }
    },
    cancel() { reader.cancel().catch(() => {}) },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Quota-Used': String(q.used + 1), 'X-Quota-Limit': String(q.limit) },
  })
}
