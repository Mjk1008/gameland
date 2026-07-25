import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUserById, whenReady, aiQuota, aiConsume, activityPointsOf,
  registrationsForUser, allEvents, activeNews, allUsers, approvedReferralCount,
  allCompetitions, notifsForUser, remainingTickets, getSetting, AI_KNOWLEDGE_KEY,
} from '@/lib/store'
import { persist } from '@/lib/db/persistence'
import { DISC } from '@/lib/mock-data'
import { TICKET, toman } from '@/lib/payment'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MODEL = 'gpt-4o-mini'
const MAX_INPUT = 500
const MAX_HISTORY = 6

// ── Widget entities ────────────────────────────────────────────────────────
// The model may reference these by id in action markers; the client renders
// them from THIS data, so a widget can never show something invented.
interface Entities {
  events: { id: string; title: string; disc: string; discName: string; status: string; statusLabel: string; prize: number; date: string; location: string; format: string; deadlineDays: number | null; registered: boolean; canBuy: number }[]
  news: { id: string; title: string; excerpt: string; body: string; tags: string[]; cover: string; at: number }[]
  regs: { comp: string; status: string; attempts: number; reason?: string; href: string }[]
}

function buildEntities(uid: string): Entities {
  const comps = new Map(allCompetitions().map(c => [c.id, c]))
  const myRegs = registrationsForUser(uid)
  const regByComp = new Map(myRegs.map(r => [r.compId, r]))

  const events = allEvents()
    .filter(e => e.status !== 'done')
    .slice(0, 8)
    .map(e => {
      const parent = e.competitionId ? comps.get(e.competitionId) : undefined
      const reg = regByComp.get(e.id)
      return {
        id: e.id,
        title: e.title,
        disc: e.disc,
        discName: DISC[e.disc]?.name ?? e.disc,
        status: e.status,
        statusLabel: e.statusLabel,
        prize: e.prize,
        date: e.date || parent?.date || '',
        location: parent?.location || '',
        format: e.format || '',
        deadlineDays: e.regDeadline && e.regDeadline > Date.now() ? Math.max(1, Math.ceil((e.regDeadline - Date.now()) / 86400000)) : null,
        registered: !!reg && reg.status !== 'rejected',
        canBuy: remainingTickets(uid, e.id),
      }
    })

  const news = activeNews().slice(0, 6).map(n => ({
    id: n.id,
    title: n.title,
    excerpt: n.body.replace(/\s+/g, ' ').slice(0, 90),
    body: n.body,
    tags: n.tags,
    cover: n.imageData.startsWith('data:') ? `/api/news-image/${n.id}` : n.imageData,
    at: n.createdAt,
  }))

  const evTitle = new Map(allEvents().map(e => [e.id, e.title]))
  const regs = myRegs.map(r => ({
    comp: evTitle.get(r.compId) ?? r.compId,
    status: r.status,
    attempts: r.attempts,
    reason: r.rejectReason,
    href: r.status === 'rejected' ? `/competitions/${r.compId}/register` : `/competitions/${r.compId}/me`,
  }))

  return { events, news, regs }
}

// Deterministic, live snapshot. Everything the assistant may claim about this
// user or these events must come from here.
function contextBlock(uid: string, ent: Entities): string {
  const u = getUserById(uid)!
  const knowledge = getSetting(AI_KNOWLEDGE_KEY).trim().slice(0, 3000)
  const gamers = allUsers().filter(x => x.role === 'gamer')
  const pts = new Map(gamers.map(g => [g.id, (g.bonusPoints ?? 0) + activityPointsOf(g)]))
  const rank = [...gamers].sort((a, b) => (pts.get(b.id) ?? 0) - (pts.get(a.id) ?? 0)).findIndex(g => g.id === uid) + 1

  const regLines = ent.regs.length
    ? ent.regs.map(r => {
        const st = r.status === 'approved' ? 'تاییدشده ✓ (پرداختش تایید شده و تو قرعه‌کشی هست)'
          : r.status === 'pending' ? 'در انتظار تایید ادمین'
          : 'ردشده'
        return `• «${r.comp}» — ${r.attempts} سهم — ${st}${r.reason ? ` — دلیل رد: ${r.reason}` : ''}`
      }).join('\n')
    : '• هیچ ثبت‌نامی ندارد.'

  const evLines = ent.events.length
    ? ent.events.map(e => {
        const bits = [
          `id=${e.id}`,
          `رشته: ${e.discName}`,
          `وضعیت: ${e.statusLabel}`,
          e.date ? `تاریخ: ${e.date}` : 'تاریخ: اعلام‌نشده',
          e.location ? `محل برگزاری: ${e.location}` : 'محل برگزاری: در داده ثبت نشده',
          e.format ? `فرمت: ${e.format}` : '',
          e.prize ? `جایزه: ${toman(e.prize)} تومان` : '',
          e.deadlineDays ? `${e.deadlineDays} روز تا بستن ثبت‌نام` : '',
          e.registered ? 'کاربر در این مسابقه ثبت‌نام کرده' : (e.status === 'open' ? `کاربر ثبت‌نام نکرده، می‌تواند تا ${e.canBuy} سهم بخرد` : ''),
        ].filter(Boolean)
        return `• «${e.title}» — ${bits.join(' — ')}`
      }).join('\n')
    : '• الان مسابقهٔ فعالی نیست.'

  const notifs = notifsForUser(uid).slice(0, 4)
  const notifLines = notifs.length ? notifs.map(n => `• ${n.title} — ${n.body.slice(0, 110)}`).join('\n') : '• اعلانی ندارد.'

  return `### وضعیت لحظه‌ایِ همین کاربر (تنها منبع معتبر — از این جلوتر نرو)
نام: ${u.name} (@${u.tag})${u.city ? ` — شهر: ${u.city}` : ''}
رتبهٔ ملی: #${rank} از ${gamers.length} — امتیاز: ${pts.get(uid) ?? 0}
سهم رایگان (جایزهٔ دعوت): ${u.freeTickets ?? 0} — سهم تاییدشدهٔ دعوتی‌هایش: ${approvedReferralCount(uid)}

ثبت‌نام‌های کاربر:
${regLines}

آخرین اعلان‌های کاربر:
${notifLines}

مسابقات:
${evLines}

اخبار منتشرشده: ${ent.news.length ? ent.news.map(n => `«${n.title}»`).join('، ') : 'خبری نیست'}${knowledge ? `

### دانستنی‌های رسمیِ گیم‌لند (نوشتهٔ ادمین — معتبر و قابل استناد)
${knowledge}` : ''}`
}

const SYSTEM = `تو «دستیار گیم‌لند» هستی — دستیار داخلِ اپ گیم‌لند، پلتفرم مسابقات ایسپورت و رنکینگ ملی گیمرهای ایران.

## لحن
فارسیِ محاوره‌ایِ طبیعی و کوتاه. مثل یه رفیقِ کاربلد حرف بزن، نه مثل یه راهنمای رسمی.
**حداکثر ۲ تا ۴ جمله.** توضیحِ اضافه، مقدمه‌چینی، و تکرارِ سوال ممنوع. مستقیم برو سر جواب.
لیستِ بلند نده مگه کاربر خودش خواسته باشه.

## قانون طلایی: هیچی از خودت نساز
هرچی دربارهٔ حسابِ کاربر، مسابقات، تاریخ‌ها، محلِ برگزاری، جایزه، یا قوانین می‌گی، باید عیناً تو «وضعیت لحظه‌ای» پایین باشه.
- اگه چیزی اونجا نیست (مثلاً حضوری یا آنلاین بودن، آدرس، ساعت دقیق): بگو «تو داده‌های من نیست — از پشتیبانی یا صفحهٔ مسابقه بپرس». **هرگز حدس نزن.**
- **هیچ‌وقت نگو مسابقه آنلاینه یا حضوریه، مگه دقیقاً تو داده نوشته باشه.**
- تاریخ ریلیز بازی‌ها یا خبرِ بیرونی که مطمئن نیستی: صادقانه بگو مطمئن نیستم.
- وعدهٔ مالی، جایزه، یا تایید ثبت‌نام نده. تصمیم با ادمینه.

## قانون تازگی
«وضعیت لحظه‌ای» همیشه از حرف‌های قبلیِ همین گفتگو معتبرتره. اگه چیزی عوض شده (مثلاً ثبت‌نامی که قبلاً رد بود حالا تایید شده)، همون جدید رو بگو و اگه خبر خوبیه تبریک بگو — به حرف قبلیت گیر نده.

## قوانین گیم‌لند
هر کاربر تا ۶ سهم در هر رشته؛ هر سهم یک شانس جدا در قرعه‌کشی مقدماتی؛ قیمت هر سهم ${toman(TICKET.price)} تومان؛ بعد از خرید باید فیش واریز رو در اپ آپلود کنه تا ادمین تایید کنه؛ بعد از قرعه‌کشی ثبت‌نام و تغییر سهم قفل می‌شه؛ حداکثر ۳ سید به فینال می‌رسه. ثبت‌نامِ ردشده رو می‌شه با «درخواست مجدد» و فیش جدید دوباره فرستاد.
کمپین دعوت: کد دعوتِ هر کس همون @تگِ خودشه و موقعِ خریدِ سهم وارد می‌شه؛ هر ۳ سهمِ تاییدشدهٔ دعوتی‌ها = ۱ سهم رایگان، ۶ سهم = جمعاً ۳ سهم رایگان.

## ابزارهای تصویری (مهم)
تو می‌تونی به‌جای توضیحِ خشک، کارت و دکمهٔ واقعی نشون بدی. این نشانه‌ها رو **تنها و دقیقاً** در انتهای جمله‌های مربوطه بذار (اپ خودش تبدیلشون می‌کنه به کارت):
- [[event:ID]] → کارتِ کاملِ یک مسابقه با دکمهٔ ثبت‌نام. ID رو از «وضعیت لحظه‌ای» بردار.
- [[news]] → شبکهٔ کارت‌های خبر (کاربر می‌زنه، خبر کامل باز می‌شه).
- [[status]] → کارت‌های وضعیتِ ثبت‌نام‌های خودِ کاربر.
- [[go:/مسیر|متنِ دکمه]] → دکمهٔ رفتن به یک صفحه. مسیرهای مجاز: /competitions ، /leaderboard ، /invite ، /me ، /me/competitions ، /rules ، /support

قواعد استفاده:
- هر جواب حداکثر **۲ نشانه**. اگه لازم نیست، هیچی نذار.
- سوال دربارهٔ شرکت در یک مسابقهٔ مشخص → یک جملهٔ کوتاه + [[event:ID]]
- سوال دربارهٔ اخبار/چه خبر → یک جملهٔ کوتاه + [[news]]
- سوال دربارهٔ وضعیت ثبت‌نام/چرا تایید نشدم → جوابِ دقیق از داده + [[status]]
- سوال دربارهٔ رتبه/رنکینگ → عدد رو بگو + [[go:/leaderboard|رنکینگ ملی]]
- سوال دربارهٔ دعوت/سهم رایگان → وضعیتش رو بگو + [[go:/invite|صفحهٔ دعوت]]
نشانه‌ها رو داخلِ متن توضیح نده و اسمشون رو نیار.

## تریک بازی
دربارهٔ FC26، PES، eFootball، UFC، NBA 2K می‌تونی تریکِ کوتاه و کاربردی بدی — دو سه خط، عملی، بدون حاشیه.`

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
        content: (m.content ?? '').toString().replace(/\[\[[^\]]+\]\]/g, '').slice(0, 700),
      }))
    : []

  const q = aiQuota(uid)
  if (q.globalFull) return new Response(JSON.stringify({ error: 'ظرفیت امروزِ دستیار پر شده — فردا دوباره بیا 🙏' }), { status: 429 })
  if (q.used >= q.limit) return new Response(JSON.stringify({ error: `سقف ${q.limit} پیام امروزت پر شده — فردا ریست می‌شه ⏳` }), { status: 429 })
  aiConsume(uid)

  const ent = buildEntities(uid)
  // Live state goes AFTER history so it always outranks anything said earlier.
  const messages = [
    { role: 'system', content: SYSTEM },
    ...history,
    { role: 'system', content: contextBlock(uid, ent) },
    { role: 'user', content: message },
  ]

  const upstream = await fetch('https://api.metisai.ir/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: 320, temperature: 0.4, stream: true, stream_options: { include_usage: true } }),
    signal: AbortSignal.timeout(50_000),
  }).catch(() => null)

  if (!upstream || !upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: 'دستیار الان در دسترس نیست — چند لحظه دیگه امتحان کن' }), { status: 502 })
  }

  const mid = 'ai_' + Math.random().toString(36).slice(2, 10)
  persist.ai.insert({ id: mid + 'u', userId: uid, role: 'user', content: message, promptTokens: 0, completionTokens: 0 })

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  const enc = new TextEncoder()
  let full = ''
  let usage = { prompt_tokens: 0, completion_tokens: 0 }
  let buf = ''
  let sentHeader = false

  const stream = new ReadableStream({
    async pull(controller) {
      // first frame: the widget entity payload (one JSON line), then plain text
      if (!sentHeader) {
        sentHeader = true
        controller.enqueue(enc.encode(JSON.stringify(ent) + '\n'))
      }
      const { done, value } = await reader.read()
      if (done) {
        // The model occasionally forgets the marker; for the intents where a
        // widget is the whole point, attach it deterministically.
        if (!/\[\[/.test(full)) {
          const asked = message
          const fallback =
            /خبر|اخبار|چه خبر/.test(asked) && ent.news.length ? '[[news]]'
            : /ثبت.?نام|تایید|رد شد|وضعیت|سهم من|پرداخت/.test(asked) && ent.regs.length ? '[[status]]'
            : /رتبه|رنکینگ|امتیاز/.test(asked) ? '[[go:/leaderboard|رنکینگ ملی]]'
            : /دعوت|ریفرال|رایگان/.test(asked) ? '[[go:/invite|صفحهٔ دعوت]]'
            : /مسابق|تورنمنت|شرکت/.test(asked) && ent.events.length ? `[[event:${ent.events[0].id}]]`
            : ''
          if (fallback) { full += '\n' + fallback; controller.enqueue(enc.encode('\n' + fallback)) }
        }
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
          if (delta) { full += delta; controller.enqueue(enc.encode(delta)) }
        } catch {}
      }
    },
    cancel() { reader.cancel().catch(() => {}) },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Quota-Used': String(q.used + 1), 'X-Quota-Limit': String(q.limit) },
  })
}
